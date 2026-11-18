
from pathlib import Path
from collections import Counter
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import re
import unicodedata

BASE = Path(__file__).resolve().parent.parent
PROCESSED = BASE / "reference" / "gafi-processed"

MAPPING = PROCESSED / "GAFI-quality-review.xlsx"
OUTPUT = PROCESSED / "GAFI-service-evidence.xlsx"

def clean(value):
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]", "", text)
    return re.sub(r"\s+", " ", text).strip()

def read_page(page_number):
    path = PROCESSED / f"page-{int(page_number):04d}.txt"

    if not path.exists():
        return ""

    return clean(path.read_text(encoding="utf-8", errors="replace"))

def detect_sections(text):
    t = text.replace(" ", "")

    indicators = {
        "المستندات المطلوبة": [
            "المستنداتالمطلوبة",
            "الأوراقالمطلوبة",
            "المستنداتاللازمة"
        ],
        "الشروط والملاحظات": [
            "الشروط",
            "ملاحظات",
            "فيحالة",
            "يشترط",
            "يلزم"
        ],
        "خطوات التنفيذ": [
            "الخطوات",
            "خطواتالإجراء",
            "الإجراءات",
            "التأسيسعبرالبوابة"
        ],
        "الرسوم": [
            "الرسوم",
            "رسومالتأسيس",
            "رسومالخدمة"
        ],
        "المدة الزمنية": [
            "مدةالإجراء",
            "المدةالزمنية",
            "خلاليوم",
            "يومعمل"
        ]
    }

    found = []

    for section, words in indicators.items():
        if any(word in t for word in words):
            found.append(section)

    return found

def classify_page(text):
    t = text.replace(" ", "")

    if "المستنداتالمطلوبة" in t:
        return "صفحة تحتوي على مستندات مطلوبة"

    if "الخطوات" in t or "خطواتالإجراء" in t:
        return "صفحة تحتوي على خطوات"

    if "الرسوم" in t:
        return "صفحة تحتوي على رسوم"

    return "محتوى عام أو يحتاج مراجعة"

if not MAPPING.exists():
    raise FileNotFoundError(f"ملف الربط غير موجود: {MAPPING}")

source = load_workbook(MAPPING, read_only=True, data_only=True)
ws = source["كل الصفحات المرشحة"]

headers = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
records = []

for values in ws.iter_rows(min_row=2, values_only=True):
    if not values or values[0] is None:
        continue

    row = dict(zip(headers, values))

    records.append({
        "service_id": row["رقم الخدمة"],
        "category": clean(row["التصنيف المصحح"]),
        "service": clean(row["اسم الخدمة"]),
        "index_page": row["صفحة الفهرس"],
        "rank": row["ترتيب المرشح"],
        "detail_page": row["صفحة التفاصيل"],
        "score": row["درجة التطابق %"],
        "keywords": clean(row["الكلمات المتطابقة"])
    })

source.close()

# ترتيب المرشحين حسب درجة التطابق
records.sort(
    key=lambda x: (
        x["service_id"],
        -(float(x["score"] or 0))
    )
)

wb = Workbook()
pages_ws = wb.active
pages_ws.title = "نصوص الصفحات"

pages_ws.append([
    "رقم الخدمة",
    "التصنيف",
    "اسم الخدمة",
    "صفحة الفهرس",
    "صفحة التفاصيل",
    "درجة التطابق %",
    "ترتيب المرشح",
    "نوع محتوى الصفحة",
    "الأقسام المكتشفة",
    "الكلمات المتطابقة",
    "نص الصفحة الكامل",
    "حالة المراجعة"
])

indicators_ws = wb.create_sheet("مؤشرات المحتوى")
indicators_ws.append([
    "رقم الخدمة",
    "اسم الخدمة",
    "صفحة التفاصيل",
    "درجة التطابق %",
    "المستندات المطلوبة",
    "الشروط والملاحظات",
    "خطوات التنفيذ",
    "الرسوم",
    "المدة الزمنية",
    "حالة المراجعة"
])

stats_ws = wb.create_sheet("الإحصائيات")
stats_ws.append(["البيان", "العدد"])

unique_services = set()
pages_seen = set()
section_counts = Counter()
empty_pages = 0

for record in records:
    service_id = record["service_id"]
    page_number = record["detail_page"]

    unique_services.add(service_id)
    pages_seen.add(page_number)

    page_text = read_page(page_number)

    if not page_text:
        empty_pages += 1

    sections = detect_sections(page_text)
    page_type = classify_page(page_text)

    for section in sections:
        section_counts[section] += 1

    pages_ws.append([
        service_id,
        record["category"],
        record["service"],
        record["index_page"],
        page_number,
        record["score"],
        record["rank"],
        page_type,
        "، ".join(sections),
        record["keywords"],
        page_text,
        "مراجعة بشرية مطلوبة"
    ])

    indicators_ws.append([
        service_id,
        record["service"],
        page_number,
        record["score"],
        "نعم" if "المستندات المطلوبة" in sections else "غير مكتشف",
        "نعم" if "الشروط والملاحظات" in sections else "غير مكتشف",
        "نعم" if "خطوات التنفيذ" in sections else "غير مكتشف",
        "نعم" if "الرسوم" in sections else "غير مكتشف",
        "نعم" if "المدة الزمنية" in sections else "غير مكتشف",
        "مراجعة بشرية مطلوبة"
    ])

stats_ws.append(["عدد الخدمات", len(unique_services)])
stats_ws.append(["عدد روابط الصفحات", len(records)])
stats_ws.append(["عدد صفحات PDF المختلفة", len(pages_seen)])
stats_ws.append(["روابط صفحات بلا نص", empty_pages])
stats_ws.append(["", ""])
stats_ws.append(["القسم المكتشف", "عدد الصفحات المرتبطة"])

for name, count in section_counts.items():
    stats_ws.append([name, count])

# تنسيق المصنف
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
                vertical="top",
                wrap_text=True
            )

    for column in sheet.columns:
        letter = get_column_letter(column[0].column)
        max_length = max(
            len(str(cell.value or "")) for cell in column
        )
        sheet.column_dimensions[letter].width = min(
            max(max_length + 3, 15), 65
        )

pages_ws.column_dimensions["K"].width = 85

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT)

print("اكتمل استخراج محتوى صفحات الخدمات.")
print("عدد الخدمات:", len(unique_services))
print("عدد روابط الصفحات:", len(records))
print("عدد صفحات PDF المختلفة:", len(pages_seen))
print("روابط صفحات بلا نص:", empty_pages)
print("الملف الناتج:", OUTPUT)
print("\nمؤشرات المحتوى المكتشفة:")

for name, count in section_counts.items():
    print(name, ":", count)
