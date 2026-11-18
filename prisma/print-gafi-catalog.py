import openpyxl

file_path = r"reference/gafi-processed/GAFI-formation-final-catalog.xlsx"
wb = openpyxl.load_workbook(file_path, data_only=True)

for ws in wb.worksheets:
    print("\n" + "=" * 90)
    print("SHEET:", ws.title)
    print("=" * 90)

    for row in ws.iter_rows(values_only=True):
        values = [str(v).strip() if v is not None else "" for v in row]
        if any(values):
            print(" | ".join(values))
