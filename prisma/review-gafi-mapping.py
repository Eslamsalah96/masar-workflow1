
from pathlib import Path
from collections import defaultdict, Counter
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import re
import unicodedata

BASE = Path(__file__).resolve().parent.parent
SOURCE = BASE / "reference" / "gafi-processed" / "GAFI-service-page-mapping.xlsx"
OUTPUT = BASE / "reference" / "gafi-processed" / "GAFI-quality-review.xlsx"

def clean(value):
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]", "", text)
    return re.sub(r"\s+", " ", text).strip()

def normalize(value):
    text = clean(value)
    text = re.sub(r"[أإآ]", "ا", text)
    text = text.replace("ى", "ي").replace("ة", "ه")
    return text.lower()

def classify(title):
    t = normalize(title)

    # التأسيس له الأولوية حتى لو احتوى الاسم على كلمة التوصية
    if any(x in t for x in [
        "تاسيس", "انشاء شركه", "انشاء الشركات",
        "تاسيس المنشأه", "تاسيس الشركه"
    ]):
        return "تأسيس الشركات"

    if any(x in t for x in [
        "تصفية", "تصفية الشركات", "محو قيد",
        "شطب قيد", "شطب الشركة"
    ]):
        return "التصفية والشطب"

    if any(x in t for x in [
        "تعديل", "اندماج", "انقسام", "تحول",
        "تغيير الشكل", "اعتماد محاضر", "اعتماد محضر",
        "التصديق", "قوائم المساهمين", "قائمة اعضاء"
    ]):
        return "تعديلات واعتمادات الشركات"

    if any(x in t for x in [
        "صحيفة الاستثمار", "اصدار صحيفة", "النشر"
    ]):
        return "النشر وصحيفة الاستثمار"

    if any(x in t for x in [
        "تخصيص", "الاراضي", "العقارات"
    ]):
        return "تخصيص الأراضي والعقارات"

    if any(x in t for x in [
        "اقامة", "تاشيرة", "عمالة", "ترخيص عمل",
        "مكتب تمثيل", "فرع شركة اجنبية"
    ]):
        return "الإقامات ومكاتب التمثيل وتراخيص العمل"

    if any(x in t for x in [
        "الجمارك", "استيراد", "تصدير", "الموانئ",
        "توصية", "فواتير", "الاصول الرأسمالية",
        "اعتماد مستندات", "افتتاح فروع", "شطب فروع"
    ]):
        return "الخدمات الفنية والتوصيات"

    return "يحتاج إلى مراجعة التصنيف"

if not SOURCE.exists():
    raise FileNotFoundError(f"ملف المصدر غير موجود: {SOURCE}")

wb_source = load_workbook(SOURCE, read_only=True, data_only=True)
ws_source = wb_source["ربط الخدمات بالصفحات"]

headers = next(ws_source.iter_rows(min_row=1, max_row=1, values_only=True))
rows = []

for raw in ws_source.iter_rows(min_row=2, values_only=True):
    if not raw or raw[0] is None:
        continue

    row = dict(zip(headers, raw))
    rows.append(row)

wb_source.close()

# تجميع الصفحات المرشحة لكل خدمة
services = defaultdict(list)

for row in rows:
    service_id = row["رقم الخدمة"]
    services[service_id].append(row)

# اختيار أفضل مرشح لكل خدمة للعرض فقط، وليس اعتمادًا نهائيًا
best_rows = []

for service_id, candidates in sorted(services.items()):
    candidates.sort(
        key=lambda x: float(x["درجة التطابق %"] or 0),
        reverse=True
    )

    first = candidates[0]
    title = clean(first["اسم الخدمة"])
    score = float(first["درجة التطابق %"] or 0)

    if score >= 80:
        level = "تطابق نصي مرتفع - يحتاج تأكيد"
    elif score >= 60:
        level = "تطابق متوسط - مراجعة"
    else:
        level = "تطابق ضعيف - مراجعة"

    best_rows.append([
        service_id,
        classify(title),
        title,
        first["صفحة الفهرس"],
        first["صفحة التفاصيل المحتملة"],
        score,
        len(candidates),
        level,
        clean(first["مقتطف من الصفحة"]),
        "غير معتمد"
    ])

# ملف النتائج
wb = Workbook()

summary = wb.active
summary.title = "ملخص الخدمات"
summary.append([
    "رقم الخدمة",
    "التصنيف المصحح",
    "اسم الخدمة",
    "صفحة الفهرس",
    "أفضل صفحة مرشحة",
    "درجة التطابق %",
    "عدد الصفحات المرشحة",
    "تقييم المطابقة",
    "مقتطف الصفحة",
    "حالة الاعتماد"
])

for row in best_rows:
    summary.append(row)

all_ws = wb.create_sheet("كل الصفحات المرشحة")
all_ws.append([
    "رقم الخدمة",
    "التصنيف المصحح",
    "اسم الخدمة",
    "صفحة الفهرس",
    "ترتيب المرشح",
    "صفحة التفاصيل",
    "درجة التطابق %",
    "الكلمات المتطابقة",
    "مقتطف الصفحة",
    "حالة المراجعة الأصلية"
])

for row in rows:
    title = clean(row["اسم الخدمة"])
    all_ws.append([
        row["رقم الخدمة"],
        classify(title),
        title,
        row["صفحة الفهرس"],
        row["ترتيب الصفحة المرشحة"],
        row["صفحة التفاصيل المحتملة"],
        row["درجة التطابق %"],
        clean(row["الكلمات المتطابقة"]),
        clean(row["مقتطف من الصفحة"]),
        clean(row["حالة المراجعة"])
    ])

stats = wb.create_sheet("الإحصائيات")
stats.append(["البيان", "العدد"])
stats.append(["الخدمات", len(services)])
stats.append(["إجمالي روابط الصفحات", len(rows)])

levels = Counter(row[7] for row in best_rows)
stats.append(["", ""])
stats.append(["مستوى أفضل تطابق", "عدد الخدمات"])

for name, count in levels.items():
    stats.append([name, count])

categories = Counter(row[1] for row in best_rows)
stats.append(["", ""])
stats.append(["التصنيف المصحح", "عدد الخدمات"])

for name, count in categories.items():
    stats.append([name, count])

# تنسيق كل الأوراق
for sheet in wb.worksheets:
    sheet.sheet_view.rightToLeft = True
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions

    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="123B5D")
        cell.alignment = Alignment(
            horizontal="center",
            vertical="center",
            wrap_text=True
        )

    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(
                horizontal="right",
                vertical="center",
                wrap_text=True
            )

    for column in sheet.columns:
        letter = get_column_letter(column[0].column)
        max_len = max(len(str(c.value or "")) for c in column)
        sheet.column_dimensions[letter].width = min(
            max(max_len + 3, 15), 60
        )

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT)

print("اكتمل تقرير مراجعة جودة الربط.")
print("عدد الخدمات:", len(services))
print("عدد روابط الصفحات:", len(rows))
print("ملف التقرير:", OUTPUT)
print("\nتوزيع التصنيفات:")
for name, count in categories.items():
    print(name, ":", count)

print("\nتوزيع مستويات المطابقة:")
for name, count in levels.items():
    print(name, ":", count)
