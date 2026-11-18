
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import re

BASE = Path(__file__).resolve().parent.parent
FOLDER = BASE / "reference" / "gafi-processed"

SOURCE = FOLDER / "GAFI-formation-confirmed-map.xlsx"
OUTPUT = FOLDER / "GAFI-formation-documents-review.xlsx"

START_MARKERS = [
    "المستندات المطلوبة",
    "المستندات اللازمة",
    "الأوراق المطلوبة"
]

END_MARKERS = [
    "الخطوات",
    "الرسوم",
    "مكان الخدمة",
    "زمن أداء الخدمة",
    "التأسيس عبر البوابة الإلكترونية",
    "التأسيس بمركز خدمات المستثمرين"
]

CONDITION_MARKERS = [
    "في حالة",
    "فى حالة",
    "إذا كان",
    "اذا كان",
    "عند وجود",
    "في حال",
    "فى حال",
    "إذا وجدت",
    "حسب طبيعة",
    "متى استلزم"
]

def clean_line(value):
    value = value.replace("\u200f", "").replace("\u200e", "")
    value = re.sub(r"\s+", " ", value)
    return value.strip(" \t-–•")

def normalize(value):
    value = value.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    value = value.replace("ى", "ي").replace("ة", "ه")
    return value.replace(" ", "")

def is_start(line):
    value = normalize(line)
    return any(normalize(x) in value for x in START_MARKERS)

def is_end(line):
    value = normalize(line)
    return any(normalize(x) in value for x in END_MARKERS)

def is_condition(text):
    value = normalize(text)
    return any(normalize(x) in value for x in CONDITION_MARKERS)

def is_numbered(line):
    patterns = [
        r"^[٠-٩0-9]+\s*[-.)ـ]",
        r"^[-–•*]\s*",
        r"^[٠-٩0-9]+\s+"
    ]
    return any(re.search(pattern, line) for pattern in patterns)

def extract_document_blocks(text):
    lines = [clean_line(x) for x in text.splitlines()]
    lines = [x for x in lines if x]

    blocks = []
    current = []
    inside = False

    for line in lines:
        if is_start(line):
            if current:
                blocks.append(current)
                current = []

            inside = True
            continue

        if inside and is_end(line):
            if current:
                blocks.append(current)
                current = []

            inside = False
            continue

        if inside:
            current.append(line)

    if current:
        blocks.append(current)

    return blocks

def split_items(block):
    items = []
    current = []

    for line in block:
        if is_numbered(line) and current:
            items.append(" ".join(current))
            current = [line]
        else:
            current.append(line)

    if current:
        items.append(" ".join(current))

    return items

if not SOURCE.exists():
    raise FileNotFoundError(f"ملف الخريطة غير موجود: {SOURCE}")

source_wb = load_workbook(SOURCE, read_only=True, data_only=True)
source_ws = source_wb.worksheets[0]

headers = list(
    next(source_ws.iter_rows(min_row=1, max_row=1, values_only=True))
)

rows = []

for values in source_ws.iter_rows(min_row=2, values_only=True):
    if not values:
        continue

    record = dict(zip(headers, values))

    page = record.get("رقم صفحة PDF")
    if not page:
        continue

    page_path = FOLDER / f"page-{int(page):04d}.txt"

    if not page_path.exists():
        continue

    text = page_path.read_text(
        encoding="utf-8",
        errors="replace"
    )

    blocks = extract_document_blocks(text)

    for block_number, block in enumerate(blocks, start=1):
        items = split_items(block)

        for item_number, item in enumerate(items, start=1):
            item = item.strip()

            if len(item) < 8:
                continue

            rows.append({
                "service_id": record.get("رقم الخدمة"),
                "service": record.get("اسم الخدمة"),
                "page": page,
                "block": block_number,
                "item": item_number,
                "text": item,
                "condition": "يحتوي على شرط محتمل" if is_condition(item) else "لا يظهر شرط صريح",
            })

source_wb.close()

wb = Workbook()
ws = wb.active
ws.title = "بنود المستندات"

ws.append([
    "رقم الخدمة",
    "اسم الخدمة",
    "صفحة المصدر",
    "رقم مجموعة النص",
    "رقم البند",
    "نص البند المستخرج",
    "مؤشر الشرط",
    "تصنيف المراجع",
    "حالة المراجعة",
    "ملاحظات"
])

for row in rows:
    ws.append([
        row["service_id"],
        row["service"],
        row["page"],
        row["block"],
        row["item"],
        row["text"],
        row["condition"],
        "لم يحدد بعد",
        "مراجعة بشرية مطلوبة",
        ""
    ])

summary = wb.create_sheet("ملخص الاستخراج")
summary.append(["البيان", "العدد"])
summary.append(["عدد بنود النص المستخرجة", len(rows)])
summary.append([
    "عدد البنود التي تحتوي على شرط محتمل",
    sum(1 for x in rows if x["condition"] == "يحتوي على شرط محتمل")
])
summary.append(["", ""])
summary.append(["الخدمة", "عدد البنود"])

counts = {}

for row in rows:
    key = (row["service_id"], row["service"])
    counts[key] = counts.get(key, 0) + 1

for (service_id, service), count in counts.items():
    summary.append([service, count])

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

ws.column_dimensions["F"].width = 90
ws.column_dimensions["J"].width = 45

for row_number in range(2, ws.max_row + 1):
    ws.row_dimensions[row_number].height = 65

wb.save(OUTPUT)

print("اكتمل استخراج بنود المستندات للمراجعة.")
print("عدد البنود:", len(rows))
print(
    "بنود بها شروط محتملة:",
    sum(1 for x in rows if x["condition"] == "يحتوي على شرط محتمل")
)
print("الملف:", OUTPUT)
