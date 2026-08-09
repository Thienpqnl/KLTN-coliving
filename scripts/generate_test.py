from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


OUT = Path(r"D:\coliving\docs\chapter5-test-summary.png")
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = 2400, 1080
img = Image.new("RGB", (W, H), "white")
draw = ImageDraw.Draw(img)

regular_path = r"C:\Windows\Fonts\arial.ttf"
bold_path = r"C:\Windows\Fonts\arialbd.ttf"
title_font = ImageFont.truetype(bold_path, 58)
subtitle_font = ImageFont.truetype(regular_path, 25)
heading_font = ImageFont.truetype(bold_path, 34)
label_font = ImageFont.truetype(regular_path, 27)
value_font = ImageFont.truetype(bold_path, 27)
note_font = ImageFont.truetype(regular_path, 22)


def centered(text, y, font, fill="#0f172a"):
    box = draw.textbbox((0, 0), text, font=font)
    draw.text(((W - (box[2] - box[0])) / 2, y), text, font=font, fill=fill)


centered("TỔNG HỢP KẾT QUẢ KIỂM THỬ HỆ THỐNG NHÀHỢP", 35, title_font)
centered("Số liệu ghi nhận khi kiểm thử trực tiếp ngày 08/08/2026", 108, subtitle_font, "#475569")

left_x, left_y, left_w, panel_h = 80, 180, 1080, 760
right_x, right_y, right_w = 1240, 180, 1080
for x, y, w in [(left_x, left_y, left_w), (right_x, right_y, right_w)]:
    draw.rounded_rectangle((x, y, x + w, y + panel_h), radius=24, fill="#f8fafc", outline="#cbd5e1", width=3)

draw.text((left_x + 38, left_y + 28), "Các nhóm kiểm thử đã thực hiện", font=heading_font, fill="#0f172a")
groups = [
    ("Nghiệp vụ microservice", 117, 117),
    ("Lược đồ cơ sở dữ liệu", 7, 7),
    ("Các trang web đại diện", 3, 3),
    ("API danh sách phòng", 10, 10),
    ("API gợi ý bằng AI", 5, 5),
    ("Kiểm tra xác thực/phân quyền", 4, 4),
]
max_total = max(total for _, _, total in groups)
bar_x = left_x + 430
bar_w = 480
for idx, (label, passed, total) in enumerate(groups):
    y = left_y + 115 + idx * 96
    draw.text((left_x + 38, y + 9), label, font=label_font, fill="#334155")
    draw.rounded_rectangle((bar_x, y, bar_x + bar_w, y + 48), radius=14, fill="#dbeafe")
    fill_w = max(20, int(bar_w * passed / total))
    draw.rounded_rectangle((bar_x, y, bar_x + fill_w, y + 48), radius=14, fill="#16a34a")
    draw.text((bar_x + bar_w + 25, y + 8), f"{passed}/{total}", font=value_font, fill="#166534")

draw.text((right_x + 38, right_y + 28), "Thời gian phản hồi quan sát được", font=heading_font, fill="#0f172a")
latencies = [
    ("Trang web", 16.1, "#2563eb"),
    ("API danh sách phòng", 887.9, "#0ea5e9"),
    ("API đánh giá tương thích", 4211.0, "#f59e0b"),
    ("API gợi ý phòng", 7805.3, "#dc2626"),
]
max_latency = max(value for _, value, _ in latencies)
bar_x2 = right_x + 420
bar_w2 = 480
for idx, (label, value, color) in enumerate(latencies):
    y = right_y + 135 + idx * 130
    draw.text((right_x + 38, y + 8), label, font=label_font, fill="#334155")
    draw.rounded_rectangle((bar_x2, y, bar_x2 + bar_w2, y + 54), radius=14, fill="#e2e8f0")
    fill_w = max(8, int(bar_w2 * value / max_latency))
    draw.rounded_rectangle((bar_x2, y, bar_x2 + fill_w, y + 54), radius=14, fill=color)
    value_text = f"{value:,.1f} ms"
    draw.text((bar_x2, y + 68), value_text, font=value_font, fill=color)

note = (
    "API phòng: trung bình 10 lần gọi; API gợi ý: trung bình 5 lần gọi.\n"
    "API tương thích: 1 lần gọi đại diện. AI hoạt động đúng nhưng cần tối ưu hiệu năng."
)
draw.multiline_text((right_x + 38, right_y + 650), note, font=note_font, fill="#475569", spacing=10)

centered("Kết quả mobile chưa được kiểm thử tự động do chưa có mã nguồn Flutter trong phạm vi dự án được cung cấp.", 985, note_font, "#7c2d12")

img.save(OUT, dpi=(220, 220))
print(OUT)
