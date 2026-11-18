
from pathlib import Path
from openpyxl import load_workbook

base = Path(__file__).resolve().parent.parent
file = base / "reference" / "gafi-processed" / "GAFI-formation-documents-review.xlsx"

wb = load_workbook(file, read_only=True, data_only=True)
ws = wb.worksheets[0]

print("\n========== بنود المستندات المستخرجة ==========\n")

for row in ws.iter_rows(min_row=2, values_only=True):
    service_id = row[0]
    service = row[1]
    page = row[2]
    item_text = row[5]
    condition = row[6]

    print(f"\nالخدمة رقم: {service_id}")
    print(f"اسم الخدمة: {service}")
    print(f"صفحة الدليل: {page}")
    print(f"مؤشر الشرط: {condition}")
    print(f"النص: {item_text}")
    print("-" * 70)

wb.close()
