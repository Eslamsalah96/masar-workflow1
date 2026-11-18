
from pathlib import Path
import re
import subprocess
import fitz
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# ==========================================
# إعدادات الملفات
# ==========================================

PDF_PATH = Path("reference/GAFI-guide.pdf")
OUTPUT_DIR = Path("reference/gafi-processed")
PAGES_DIR = OUTPUT_DIR / "pages"

TESSERACT = Path(
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

LANGUAGES = "ara+eng"
DPI = 300

# كلمات تساعدنا في اكتشاف عناوين الخدمات
SERVICE_KEYWORDS = [
    "تأسيس",
    "اعتماد",
    "التصديق",
    "تعديل",
    "تصفية",
    "تحويل",
    "اندماج",
    "انقسام",
    "محو قيد",
    "شطب",
    "ترخيص",
    "توصية",
    "استخراج شهادة",
    "إصدار شهادة",
    "نشر صحيفة",
    "تخصيص",
    "تجديد",
    "افتتاح فرع",
    "إغلاق فرع",
]

# ==========================================
# التحقق من الملفات
# ==========================================

if not PDF_PATH.exists():
    raise FileNotFoundError(
        f"ملف الدليل غير موجود: {PDF_PATH}"
    )

if not TESSERACT.exists():
    raise FileNotFoundError(
        f"لم يتم العثور على Tesseract: {TESSERACT}"
    )

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PAGES_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================
# أدوات مساعدة
# ==========================================

def clean_text(value):
    value = value.replace("\x0c", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def is_possible_heading(line):
    line = line.strip()

    if len(line) < 5 or len(line) > 180:
        return False

    if not any(word in line for word in SERVICE_KEYWORDS):
        return False

    # تجاهل الأسطر التي تبدو كجمل طويلة أو تعليمات
    if line.endswith((":", "،", "؛")):
        return False

    return True


def style_sheet(sheet):
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions

    for cell in sheet[1]:
        cell.font = Font(
            bold=True,
            color="FFFFFF"
        )
        cell.fill = PatternFill(
            "solid",
            fgColor="123B5D"
        )
        cell.alignment = Alignment(
            horizontal="center",
            vertical="center",
            wrap_text=True
        )

    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(
                vertical="top",
                wrap_text=True
            )


# ==========================================
# بدء قراءة الدليل
# ==========================================

print("بدء معالجة دليل GAFI بالكامل...")

pdf = fitz.open(PDF_PATH)
total_pages = len(pdf)

print(f"عدد صفحات PDF: {total_pages}")

all_pages = []
possible_headings = []
full_text_parts = []

# ==========================================
# استخراج كل صفحة
# ==========================================

for page_index in range(total_pages):

    physical_page = page_index + 1
    page = pdf[page_index]

    print(
        f"معالجة الصفحة {physical_page} من {total_pages}..."
    )

    image_path = PAGES_DIR / f"page-{physical_page:04d}.png"

    pix = page.get_pixmap(
        matrix=fitz.Matrix(DPI / 72, DPI / 72),
        colorspace=fitz.csRGB,
        alpha=False
    )

    pix.save(image_path)

    result = subprocess.run(
        [
            str(TESSERACT),
            str(image_path),
            "stdout",
            "-l",
            LANGUAGES,
            "--psm",
            "3",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )

    if result.returncode != 0:
        print(
            f"تحذير: مشكلة في الصفحة {physical_page}"
        )
        page_text = ""
    else:
        page_text = clean_text(result.stdout)

    # حفظ النص منفصلًا لكل صفحة
    page_text_path = (
        OUTPUT_DIR /
        f"page-{physical_page:04d}.txt"
    )

    page_text_path.write_text(
        page_text,
        encoding="utf-8"
    )

    # الاحتفاظ بالنص الكامل
    full_text_parts.append(
        f"\n{'=' * 70}\n"
        f"رقم صفحة PDF: {physical_page}\n"
        f"{'=' * 70}\n"
        f"{page_text}\n"
    )

    all_pages.append({
        "page": physical_page,
        "text": page_text,
        "characters": len(page_text),
    })

    # البحث عن عناوين خدمات محتملة
    for line in page_text.splitlines():
        line = line.strip()

        if is_possible_heading(line):
            possible_headings.append({
                "page": physical_page,
                "heading": line,
                "review": "يحتاج مراجعة",
            })

    # حذف صورة الصفحة بعد استخراج النص لتوفير المساحة
    image_path.unlink(missing_ok=True)

    # حفظ تقدم العمل كل 10 صفحات
    if physical_page % 10 == 0:
        progress_file = OUTPUT_DIR / "progress.txt"
        progress_file.write_text(
            f"تمت معالجة {physical_page} من {total_pages} صفحة",
            encoding="utf-8"
        )

pdf.close()

# ==========================================
# حفظ النص الكامل
# ==========================================

full_text_path = OUTPUT_DIR / "GAFI-full-text.txt"

full_text_path.write_text(
    "\n".join(full_text_parts),
    encoding="utf-8"
)

# ==========================================
# إنشاء ملف Excel
# ==========================================

print("إنشاء ملف Excel...")

workbook = Workbook()

# ورقة الصفحات
pages_sheet = workbook.active
pages_sheet.title = "نصوص الصفحات"

pages_sheet.append([
    "رقم صفحة PDF",
    "عدد الحروف",
    "النص المستخرج",
    "حالة المراجعة"
])

for item in all_pages:
    review_status = (
        "صفحة فارغة أو استخراج ضعيف"
        if item["characters"] < 30
        else "يحتاج مراجعة"
    )

    pages_sheet.append([
        item["page"],
        item["characters"],
        item["text"],
        review_status
    ])

pages_sheet.column_dimensions["A"].width = 16
pages_sheet.column_dimensions["B"].width = 15
pages_sheet.column_dimensions["C"].width = 100
pages_sheet.column_dimensions["D"].width = 25

style_sheet(pages_sheet)

# ورقة العناوين المحتملة
headings_sheet = workbook.create_sheet(
    "عناوين الخدمات المحتملة"
)

headings_sheet.append([
    "رقم صفحة PDF",
    "العنوان المحتمل",
    "حالة المراجعة"
])

for item in possible_headings:
    headings_sheet.append([
        item["page"],
        item["heading"],
        item["review"],
    ])

headings_sheet.column_dimensions["A"].width = 18
headings_sheet.column_dimensions["B"].width = 90
headings_sheet.column_dimensions["C"].width = 25

style_sheet(headings_sheet)

# ورقة ملخص
summary_sheet = workbook.create_sheet("ملخص")

summary_sheet.append(["البيان", "القيمة"])
summary_sheet.append(["اسم الملف", str(PDF_PATH)])
summary_sheet.append(["عدد صفحات PDF", total_pages])
summary_sheet.append(["الصفحات التي تمت معالجتها", len(all_pages)])
summary_sheet.append(["العناوين المحتملة المستخرجة", len(possible_headings)])
summary_sheet.append(["لغة OCR", LANGUAGES])
summary_sheet.append(["دقة الصور DPI", DPI])
summary_sheet.append([
    "تنبيه",
    "العناوين والنصوص المستخرجة تحتاج مراجعة قبل اعتمادها"
])

summary_sheet.column_dimensions["A"].width = 38
summary_sheet.column_dimensions["B"].width = 90

style_sheet(summary_sheet)

# ==========================================
# حفظ Excel
# ==========================================

excel_path = OUTPUT_DIR / "GAFI-catalog-review.xlsx"

workbook.save(excel_path)

# ==========================================
# إنهاء
# ==========================================

print("")
print("=" * 55)
print("اكتملت معالجة الدليل!")
print("=" * 55)
print(f"عدد الصفحات: {total_pages}")
print(f"عدد العناوين المحتملة: {len(possible_headings)}")
print(f"النص الكامل: {full_text_path}")
print(f"ملف Excel: {excel_path}")
print(f"مجلد الصفحات: {OUTPUT_DIR}")
