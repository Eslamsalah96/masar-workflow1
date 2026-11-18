
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from pathlib import Path
import re
import unicodedata

BASE = Path(__file__).resolve().parent.parent
SOURCE = BASE / "reference" / "gafi-processed" / "GAFI-refined-candidates.xlsx"
OUTPUT = BASE / "reference" / "gafi-processed" / "GAFI-index-review.xlsx"

def clean_text(value):
    if not value:
        return ""

    text = unicodedata.normalize("NFKC", str(value))

    # إزالة علامات اتجاه النص والمحارف غير المرئية
    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]", "", text)

    # توحيد المسافات
    text = re.sub(r"\s+", " ", text).strip()

    return text

def classify(title):
    t = title.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")

    if any(x in t for x in ["تأسيس", "انشاء شركة", "انشاء الشركات"]):
        return "تأسيس الشركات"

    if any(x in t for x in [
        "تصفية", "اندماج", "انقسام", "تحول",
        "تغيير الشكل", "تعديل", "محو قيد",
        "اعتماد محاضر", "اعتماد محضر",
        "التصديق على", "التصديق علي",
        "قوائم المساهمين", "قائمة أعضاء"
    ]):
        return "تعديلات واعتمادات الشركات"

    if any(x in t for x in [
        "صحيفة الاستثمار", "نشر صحيفة", "نشر عقود",
        "نشر قرارات"
    ]):
        return "النشر وصحيفة الاستثمار"

    if any(x in t for x in [
        "تخصيص", "الاراضي", "العقارات"
    ]):
        return "تخصيص الأراضي والعقارات"

    if any(x in t for x in [
        "اقامة", "إقامة", "تأشيرة", "عمالة",
        "ترخيص عمل", "مكتب تمثيل", "فرع شركة أجنبية",
        "فرع شركة اجنبية"
    ]):
        return "الإقامات وتراخيص العمل ومكاتب التمثيل"

    if any(x in t for x in [
        "الجمارك", "استيراد", "تصدير", "الموانئ",
        "توصية", "فواتير", "الأصول الرأسمالية",
        "الاصول الرأسمالية", "اعتماد مستندات",
        "اعتماد المستندات", "افتتاح", "شطب فروع"
    ]):
        return "الخدمات الفنية والتوصيات"

    return "يحتاج إلى تصنيف"

def is_section_heading(title):
    t = title.strip()
    patterns = [
        r"^(أولا|اولا|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً)",
        r"^(خامسا|خامساً|سادسا|سادساً|سابعا|سابعاً)",
        r"^ثامنا|^ثامناً"
    ]
    return any(re.search(p, t) for p in patterns)

def needs_review(title):
    if len(title) < 12:
        return "مراجعة يدوية"

    if any(x in title for x in ["‎", "‏", "None"]):
        return "مراجعة OCR"

    if title.startswith(("و", "ثم", "كما", "في حالة")):
        return "قد يكون جزءًا من عنوان سابق"

    if title.endswith(("من", "في", "على", "إلى", "أو", "/")):
        return "عنوان قد يكون غير مكتمل"

    return "مراجعة الاسم مع الدليل"

if not SOURCE.exists():
    raise FileNotFoundError(f"ملف المصدر غير موجود: {SOURCE}")

source_wb = load_workbook(SOURCE, read_only=True, data_only=True)
source_ws = source_wb["مرشحو الخدمات"]

raw_rows = []
review_rows = []
seen = set()

for row in source_ws.iter_rows(min_row=2, values_only=True):
    page, candidate = row[0], row[1]

    if page not in (7, 8, 9) or not candidate:
        continue

    title = clean_text(candidate)

    raw_rows.append([page, title])

    if is_section_heading(title):
        continue

    key = re.sub(r"\W+", "", title)

    if not key or key in seen:
        continue

    seen.add(key)

    category = classify(title)

    review_rows.append([
        len(review_rows) + 1,
        category,
        title,
        page,
        needs_review(title),
        "لم تتم المراجعة"
    ])

source_wb.close()

wb = Workbook()
ws = wb.active
ws.title = "مراجعة الخدمات"

headers = [
    "رقم",
    "التصنيف المقترح",
    "اسم الخدمة المستخرج",
    "صفحة الفهرس",
    "ملاحظة المراجعة",
    "حالة المراجعة"
]

ws.append(headers)

for row in review_rows:
    ws.append(row)

raw = wb.create_sheet("النص الخام")
raw.append(["صفحة PDF", "النص المستخرج"])

for row in raw_rows:
    raw.append(row)

stats = wb.create_sheet("الإحصائيات")
stats.append(["البيان", "العدد"])
stats.append(["صفحات الفهرس المعالجة", 3])
stats.append(["العناوين الخام", len(raw_rows)])
stats.append(["العناوين بعد إزالة التكرار", len(review_rows)])

categories = {}
for row in review_rows:
    categories[row[1]] = categories.get(row[1], 0) + 1

stats.append(["", ""])
stats.append(["التصنيف", "عدد العناوين"])

for category, count in sorted(categories.items()):
    stats.append([category, count])

# تنسيق ملفات Excel
for sheet in wb.worksheets:
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions

    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="123B5D")
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(
                horizontal="right",
                vertical="center",
                wrap_text=True
            )

    for column in sheet.columns:
        letter = get_column_letter(column[0].column)
        max_length = max(
            len(str(cell.value or "")) for cell in column
        )
        sheet.column_dimensions[letter].width = min(max(max_length + 3, 15), 65)

    sheet.sheet_view.rightToLeft = True

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT)

print("اكتمل استخراج فهرس GAFI.")
print(f"العناوين الخام: {len(raw_rows)}")
print(f"العناوين بعد إزالة التكرار: {len(review_rows)}")
print(f"عدد التصنيفات: {len(categories)}")
print(f"الملف الناتج: {OUTPUT}")
