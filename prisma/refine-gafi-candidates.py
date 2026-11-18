
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

SOURCE_DIR = Path("reference/gafi-processed")
OUTPUT_FILE = SOURCE_DIR / "GAFI-refined-candidates.xlsx"

KEYWORDS = [
    "تأسيس", "اعتماد", "التصديق", "تعديل", "تصفية",
    "تحويل", "اندماج", "انقسام", "محو قيد", "شطب",
    "ترخيص", "توصية", "استخراج شهادة", "إصدار شهادة",
    "نشر صحيفة", "تخصيص", "تجديد", "افتتاح فرع",
    "إغلاق فرع", "مكتب تمثيل", "الجمعية العامة",
]

IGNORE = [
    "المستندات المطلوبة", "الرسوم", "الخطوات",
    "مركز خدمات المستثمرين", "البوابة الإلكترونية",
    "رقم الانتظار", "للمساعدة اتصل", "ملحوظة",
    "التليفون", "البريد الإلكتروني",
]

def clean(line):
    return " ".join(line.split()).strip(" :-ـ•")

def is_candidate(line):
    if len(line) < 7 or len(line) > 180:
        return False
    if any(word in line for word in IGNORE):
        return False
    return any(word in line for word in KEYWORDS)

files = sorted(SOURCE_DIR.glob("page-*.txt"))

if not files:
    raise FileNotFoundError("لم يتم العثور على ملفات الصفحات المستخرجة")

rows = []

for file in files:
    page_number = int(file.stem.split("-")[1])
    lines = [clean(x) for x in file.read_text(encoding="utf-8").splitlines()]
    lines = [x for x in lines if x]

    for index, line in enumerate(lines):
        if not is_candidate(line):
            continue

        before = " | ".join(lines[max(0, index-2):index])
        after = " | ".join(lines[index+1:index+4])

        rows.append([
            page_number,
            line,
            before,
            after,
            "مراجعة مطلوبة"
        ])

wb = Workbook()
ws = wb.active
ws.title = "مرشحو الخدمات"

ws.append([
    "صفحة PDF",
    "العنوان المحتمل",
    "النص السابق",
    "النص التالي",
    "حالة المراجعة"
])

for row in rows:
    ws.append(row)

widths = [14, 65, 65, 65, 22]
for i, width in enumerate(widths, 1):
    ws.column_dimensions[chr(64+i)].width = width

for cell in ws[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="123B5D")
    cell.alignment = Alignment(horizontal="center", wrap_text=True)

for row in ws.iter_rows(min_row=2):
    for cell in row:
        cell.alignment = Alignment(vertical="top", wrap_text=True)

ws.freeze_panes = "A2"
ws.auto_filter.ref = ws.dimensions

# ورقة إحصائيات
stats = wb.create_sheet("الإحصائيات")
stats.append(["البيان", "العدد"])
stats.append(["صفحات تمت معالجتها", len(files)])
stats.append(["العناوين المرشحة", len(rows)])
stats.append(["عدد الصفحات التي ظهر بها مرشح"])
stats.cell(4, 2, len(set(row[0] for row in rows)))

wb.save(OUTPUT_FILE)

print("اكتمل إعداد فهرس الخدمات المحتملة.")
print(f"عدد الصفحات: {len(files)}")
print(f"عدد العناوين المرشحة: {len(rows)}")
print(f"الملف الناتج: {OUTPUT_FILE}")
