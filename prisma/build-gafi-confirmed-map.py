
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

BASE = Path(__file__).resolve().parent.parent
FOLDER = BASE / "reference" / "gafi-processed"
OUTPUT = FOLDER / "GAFI-formation-confirmed-map.xlsx"

services = [
    {
        "id": 1,
        "name": "تأسيس شركات الأموال",
        "pages": [13, 14, 15],
        "note": "المستندات والإجراءات. مراجعة تفاصيل كل نوع شركة مطلوبة."
    },
    {
        "id": 2,
        "name": "إجراءات تأسيس الشركة الشخص الواحد والمساهمة",
        "pages": [16, 17],
        "note": "إجراءات مركز خدمات المستثمرين والرسوم. مرجع إجرائي."
    },
    {
        "id": 3,
        "name": "تأسيس شركات الأشخاص",
        "pages": [18, 19, 20],
        "note": "المستندات والخطوات والرسوم."
    },
    {
        "id": 4,
        "name": "تأسيس المنشأة الفردية",
        "pages": [21, 22],
        "note": "المستندات والخطوات والرسوم."
    },
    {
        "id": 5,
        "name": "تأسيس شركة الشخص الواحد",
        "pages": [23, 24],
        "note": "المستندات والخطوات. راجع الإجراء المشترك في الصفحتين 16 و17."
    }
]

wb = Workbook()
ws = wb.active
ws.title = "الخريطة المصححة"

ws.append([
    "رقم الخدمة",
    "اسم الخدمة",
    "رقم صفحة PDF",
    "النص المستخرج",
    "ملاحظات المراجعة",
    "حالة الاعتماد"
])

for service in services:
    for page in service["pages"]:
        path = FOLDER / f"page-{page:04d}.txt"

        content = (
            path.read_text(encoding="utf-8", errors="replace")
            if path.exists() else ""
        )

        ws.append([
            service["id"],
            service["name"],
            page,
            content,
            service["note"],
            "مراجعة بشرية مطلوبة"
        ])

ws.sheet_view.rightToLeft = True
ws.freeze_panes = "A2"
ws.auto_filter.ref = ws.dimensions

for cell in ws[1]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="123B5D")
    cell.alignment = Alignment(
        horizontal="center",
        vertical="center",
        wrap_text=True
    )

for row in ws.iter_rows(min_row=2):
    for cell in row:
        cell.alignment = Alignment(
            horizontal="right",
            vertical="top",
            wrap_text=True
        )

ws.column_dimensions["A"].width = 13
ws.column_dimensions["B"].width = 45
ws.column_dimensions["C"].width = 16
ws.column_dimensions["D"].width = 90
ws.column_dimensions["E"].width = 55
ws.column_dimensions["F"].width = 25

for row_num in range(2, ws.max_row + 1):
    ws.row_dimensions[row_num].height = 110

wb.save(OUTPUT)

print("تم إنشاء خريطة صفحات تأسيس الشركات.")
print("عدد الخدمات:", len(services))
print("عدد الصفحات:", sum(len(s["pages"]) for s in services))
print("الملف:", OUTPUT)
