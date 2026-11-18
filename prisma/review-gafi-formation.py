
from pathlib import Path
from collections import defaultdict
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

BASE = Path(__file__).resolve().parent.parent
FOLDER = BASE / "reference" / "gafi-processed"

SOURCE = FOLDER / "GAFI-quality-review.xlsx"
OUTPUT = FOLDER / "GAFI-formation-review.xlsx"

def read_page(number):
    path = FOLDER / f"page-{int(number):04d}.txt"

    if not path.exists():
        return ""

    return path.read_text(encoding="utf-8", errors="replace").strip()

# قراءة ملف الربط
wb_source = load_workbook(SOURCE, read_only=True, data_only=True)
ws_source = wb_source["كل الصفحات المرشحة"]

headers = [
    cell for cell in next(
        ws_source.iter_rows(min_row=1, max_row=1, values_only=True)
    )
]

services = defaultdict(list)

for values in ws_source.iter_rows(min_row=2, values_only=True):
    if not values:
        continue

    row = dict(zip(headers, values))

    category = str(row.get("التصنيف المصحح") or "").strip()

    if category != "تأسيس الشركات":
        continue

    service_id = row.get("رقم الخدمة")

    services[service_id].append({
        "id": service_id,
        "name": row.get("اسم الخدمة"),
        "category": category,
        "index_page": row.get("صفحة الفهرس"),
        "rank": row.get("ترتيب المرشح"),
        "page": row.get("صفحة التفاصيل"),
        "score": row.get("درجة التطابق %"),
        "keywords": row.get("الكلمات المتطابقة")
    })

wb_source.close()

if not services:
    raise RuntimeError(
        "لم يتم العثور على خدمات مصنفة تحت تأسيس الشركات. "
        "راجع اسم عمود التصنيف وقيمه في ملف الجودة."
    )

wb = Workbook()

summary = wb.active
summary.title = "ملخص خدمات التأسيس"

summary.append([
    "رقم الخدمة",
    "اسم الخدمة",
    "عدد الصفحات المرشحة",
    "أفضل صفحة مرشحة",
    "أعلى درجة تطابق"
])

details = wb.create_sheet("مراجعة الصفحات")

details.append([
    "رقم الخدمة",
    "اسم الخدمة",
    "الصفحة",
    "دور الصفحة",
    "درجة تطابق الصفحة الأصلية %",
    "ترتيب المرشح",
    "الكلمات المتطابقة",
    "النص المستخرج",
    "قرار المراجعة",
    "ملاحظات المراجع"
])

used = set()

for service_id, candidates in sorted(
    services.items(),
    key=lambda item: str(item[0])
):
    candidates.sort(
        key=lambda x: float(x["score"] or 0),
        reverse=True
    )

    best = candidates[0]

    summary.append([
        service_id,
        best["name"],
        len(candidates),
        best["page"],
        best["score"]
    ])

    # أفضل خمس صفحات مرشحة لكل خدمة
    for candidate in candidates[:5]:
        original_page = int(candidate["page"])

        # الصفحة المرشحة والصفحتان المجاورتان
        related_pages = [
            (original_page - 1, "الصفحة السابقة"),
            (original_page, "الصفحة المرشحة"),
            (original_page + 1, "الصفحة التالية")
        ]

        for page_number, role in related_pages:
            if page_number < 1 or page_number > 208:
                continue

            key = (service_id, page_number)

            if key in used:
                continue

            used.add(key)

            details.append([
                service_id,
                candidate["name"],
                page_number,
                role,
                candidate["score"],
                candidate["rank"],
                candidate["keywords"],
                read_page(page_number),
                "لم تراجع بعد",
                ""
            ])

# تنسيق الملف
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
            max(max_length + 3, 15), 55
        )

details.column_dimensions["H"].width = 90
details.column_dimensions["J"].width = 45

wb.save(OUTPUT)

print("اكتمل إعداد مراجعة خدمات تأسيس الشركات.")
print("عدد الخدمات:", len(services))
print("عدد الصفحات المضافة للمراجعة:", len(used))
print("الملف:", OUTPUT)
