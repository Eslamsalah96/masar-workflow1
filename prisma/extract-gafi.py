
from pathlib import Path
import fitz
import subprocess

# مسارات الملفات
PDF_PATH = Path("reference/GAFI-guide.pdf")
OUTPUT_DIR = Path("reference/gafi-ocr")

TESSERACT = Path(
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

if not PDF_PATH.exists():
    raise FileNotFoundError(f"ملف الدليل غير موجود: {PDF_PATH}")

if not TESSERACT.exists():
    raise FileNotFoundError("لم يتم العثور على Tesseract")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

pdf = fitz.open(PDF_PATH)

print(f"عدد صفحات الدليل: {len(pdf)}")

# كل ملف يحتوي على 5 صفحات
PAGES_PER_FILE = 5

for start in range(0, len(pdf), PAGES_PER_FILE):
    end = min(start + PAGES_PER_FILE, len(pdf))
    extracted_pages = []

    for page_index in range(start, end):
        page = pdf[page_index]

        # تحويل الصفحة إلى صورة بدقة 300 DPI
        pix = page.get_pixmap(
            matrix=fitz.Matrix(300 / 72, 300 / 72),
            colorspace=fitz.csRGB,
            alpha=False
        )

        image_path = OUTPUT_DIR / f"page-{page_index + 1:03d}.png"
        pix.save(image_path)

        # استخراج النص العربي والإنجليزي
        result = subprocess.run(
            [
                str(TESSERACT),
                str(image_path),
                "stdout",
                "-l", "ara+eng",
                "--psm", "3"
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        extracted_pages.append(
            f"\n{'=' * 50}\n"
            f"صفحة الدليل رقم {page_index + 1}\n"
            f"{'=' * 50}\n"
            f"{result.stdout}\n"
        )

        image_path.unlink(missing_ok=True)

        print(f"تم استخراج الصفحة {page_index + 1}")

    output_file = OUTPUT_DIR / (
        f"part-{start + 1:03d}-{end:03d}.txt"
    )

    output_file.write_text(
        "\n".join(extracted_pages),
        encoding="utf-8"
    )

    print(f"تم حفظ: {output_file}")

print("اكتمل استخراج الدليل بالكامل.")
