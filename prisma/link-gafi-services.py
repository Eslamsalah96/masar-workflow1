
from pathlib import Path
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from collections import Counter
import re
import unicodedata
import math

BASE = Path(__file__).resolve().parent.parent
DATA_DIR = BASE / "reference" / "gafi-processed"

INDEX_FILE = DATA_DIR / "GAFI-index-review.xlsx"
OUTPUT_FILE = DATA_DIR / "GAFI-service-page-mapping.xlsx"

# كلمات عامة لا تساعد كثيرًا في تحديد الخدمة
STOP_WORDS = {
    "من", "في", "على", "الى", "إلى", "عن", "مع", "لدى",
    "التي", "الذي", "التى", "هذا", "هذه", "ذلك",
    "الشركات", "الشركة", "الخاصة", "بشأن", "بموجب",
    "طبقا", "وفقا", "احكام", "حكم", "قانون",
    "رقم", "لسنة", "سنة", "بما", "لما", "كان",
    "للموافقة", "الموافقة"
}

def normalize(text):
    text = unicodedata.normalize("NFKC", str(text or ""))

    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]", "", text)

    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    text = text.replace("ى", "ي").replace("ة", "ه")

    text = re.sub(r"[0-9٠-٩]+", " ", text)
    text = re.sub(r"[^\u0600-\u06FFa-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text.lower()

def tokens(text):
    words = normalize(text).split()

    result = []
    for word in words:
        if len(word) >= 3 and word not in STOP_WORDS:
            result.append(word)

    return set(result)

def read_pages():
    pages = {}

    for file in sorted(DATA_DIR.glob("page-*.txt")):
        match = re.search(r"page-(\d+)\.txt$", file.name)

        if not match:
            continue

        page_number = int(match.group(1))
        content = file.read_text(encoding="utf-8", errors="replace").strip()

        if page_number <= 9 or not content:
            continue

        pages[page_number] = content

    return pages

def make_snippet(content, matched_words):
    lines = [
        re.sub(r"\s+", " ", line).strip()
        for line in content.splitlines()
        if line.strip()
    ]

    if not lines:
        return ""

    # نبحث عن سطر يحتوي على أكبر عدد من كلمات الخدمة
    best_line = max(
        lines,
        key=lambda line: sum(
            1 for word in matched_words
            if word in normalize(line)
        ),
        default=""
    )

    if best_line:
        return best_line[:500]

    return " ".join(lines)[:500]

if not INDEX_FILE.exists():
    raise FileNotFoundError(f"ملف الفهرس غير موجود: {INDEX_FILE}")

print("قراءة الخدمات من ملف الفهرس...")

index_wb = load_workbook(INDEX_FILE, read_only=True, data_only=True)
index_ws = index_wb["مراجعة الخدمات"]

services = []

for row in index_ws.iter_rows(min_row=2, values_only=True):
    number, category, title, index_page, review_note, review_status = row[:6]

    if not title:
        continue

    services.append({
        "number": number,
        "category": category or "يحتاج إلى تصنيف",
        "title": str(title).strip(),
        "index_page": index_page,
        "tokens": tokens(title)
    })

index_wb.close()

print(f"عدد الخدمات: {len(services)}")
print("قراءة صفحات الدليل...")

pages = read_pages()

print(f"عدد صفحات التفاصيل ذات النص: {len(pages)}")

# حساب مدى شيوع الكلمات بين الصفحات
document_frequency = Counter()

page_tokens = {}

for page_number, content in pages.items():
    page_words = tokens(content)
    page_tokens[page_number] = page_words

    for word in page_words:
        document_frequency[word] += 1

total_pages = max(len(pages), 1)

def calculate_score(service_words, content_words):
    if not service_words:
        return 0, []

    matched = service_words.intersection(content_words)

    if not matched:
        return 0, []

    # الكلمات النادرة تحصل على وزن أكبر من الكلمات المتكررة
    total_weight = sum(
        math.log((total_pages + 1) / (document_frequency[word] + 1)) + 1
        for word in service_words
    )

    matched_weight = sum(
        math.log((total_pages + 1) / (document_frequency[word] + 1)) + 1
        for word in matched
    )

    score = (matched_weight / total_weight) * 100 if total_weight else 0

    return round(score, 1), sorted(matched)

print("بدء مطابقة الخدمات مع الصفحات...")

mapping_rows = []

for service in services:
    candidates = []

    for page_number, content in pages.items():
        score, matched = calculate_score(
            service["tokens"],
            page_tokens[page_number]
        )

        if score <= 0:
            continue

        candidates.append({
            "page": page_number,
            "score": score,
            "matched": matched,
            "snippet": make_snippet(content, matched)
        })

    candidates.sort(
        key=lambda item: (item["score"], len(item["matched"])),
        reverse=True
    )

    # الاحتفاظ بأفضل 5 صفحات محتملة لكل خدمة
    for rank, candidate in enumerate(candidates[:5], start=1):
        mapping_rows.append([
            service["number"],
            service["category"],
            service["title"],
            service["index_page"],
            rank,
            candidate["page"],
            candidate["score"],
            "، ".join(candidate["matched"]),
            candidate["snippet"],
            "مراجعة مطلوبة"
        ])

    if not candidates:
        mapping_rows.append([
            service["number"],
            service["category"],
            service["title"],
            service["index_page"],
            "",
            "",
            0,
            "",
            "لم يتم العثور على تطابق نصي واضح",
            "يحتاج مراجعة يدوية"
        ])

# إنشاء ملف النتائج
wb = Workbook()

ws = wb.active
ws.title = "ربط الخدمات بالصفحات"

headers = [
    "رقم الخدمة",
    "التصنيف",
    "اسم الخدمة",
    "صفحة الفهرس",
    "ترتيب الصفحة المرشحة",
    "صفحة التفاصيل المحتملة",
    "درجة التطابق %",
    "الكلمات المتطابقة",
    "مقتطف من الصفحة",
    "حالة المراجعة"
]

ws.append(headers)

for row in mapping_rows:
    ws.append(row)

# ورقة إحصائيات الصفحات
inventory = wb.create_sheet("فهرس الصفحات")
inventory.append([
    "رقم صفحة PDF",
    "حجم النص",
    "أول جزء من النص المستخرج"
])

for page_number, content in sorted(pages.items()):
    preview = re.sub(r"\s+", " ", content).strip()[:700]
    inventory.append([
        page_number,
        len(content),
        preview
    ])

# ورقة إحصائيات الربط
stats = wb.create_sheet("الإحصائيات")
stats.append(["البيان", "العدد"])
stats.append(["الخدمات المستخرجة من الفهرس", len(services)])
stats.append(["صفحات التفاصيل التي تحتوي على نص", len(pages)])
stats.append(["صفوف الربط المقترحة", len(mapping_rows)])

matched_services = {
    row[0] for row in mapping_rows
    if row[5] not in ("", None)
}

stats.append([
    "خدمات لها صفحة واحدة على الأقل مرشحة",
    len(matched_services)
])

stats.append(["", ""])
stats.append(["التصنيف", "عدد الخدمات"])

category_counts = Counter(s["category"] for s in services)

for category, count in sorted(category_counts.items()):
    stats.append([category, count])

# تنسيق الأوراق
for sheet in wb.worksheets:
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    sheet.sheet_view.rightToLeft = True

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
        max_length = max(
            len(str(cell.value or ""))
            for cell in column
        )

        sheet.column_dimensions[letter].width = min(
            max(max_length + 3, 15),
            65
        )

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUTPUT_FILE)

print("\nاكتمل ربط الخدمات بالصفحات المرشحة.")
print(f"عدد الخدمات: {len(services)}")
print(f"عدد الصفحات المفحوصة: {len(pages)}")
print(f"عدد صفوف الربط: {len(mapping_rows)}")
print(f"الملف الناتج: {OUTPUT_FILE}")
