#!/usr/bin/env python3
"""用 Pillow 直接画小红书封面图 1080×1440，读取 03_data.json 的真实数据。"""
import json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "outputs" / "xhs" / "2026-09-23"
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((OUT / "03_data.json").read_text("utf-8"))

W, H = 1080, 1440
BG_TOP, BG_BOTTOM = (255, 107, 74), (229, 90, 60)  # #FF6B4A → #E55A3C
SUBTLE = (255, 227, 216, 100)  # 半透米色
GLASS, CARD = (255, 255, 255, 28), (255, 255, 255, 28)

def font(size, bold=True):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

# 渐变背景
img = Image.new("RGB", (W, H), BG_TOP)
draw = ImageDraw.Draw(img)
for y in range(H):
    t = y / H
    r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
    g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
    b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# 边框装饰
draw.rounded_rectangle((40, 40, W - 40, H - 40), radius=48, outline=(255, 255, 255, 80), width=4)

# 标题区
draw.text((80, 170), "校招喵 · 每日新增", font=font(64, True), fill=(255, 255, 255))
draw.text((80, 270), f"{DATA['date']}，家人们慌了！", font=font(56, True), fill=(255, 255, 255))
draw.text((80, 350), f"昨天校招喵新收录 {DATA['total']} 条公告", font=font(48), fill=(255, 227, 216))
draw.text((80, 420), f"{DATA['noTest']} 条明确免笔试", font=font(48), fill=(255, 227, 216))
draw.line((80, 500, W - 80, 500), fill=(255, 255, 255, 130), width=3)

draw.text((80, 570), "今日代表企业", font=font(44), fill=(255, 255, 255))

# Top 3
for i, c in enumerate(DATA["topN"][:3]):
    y = 660 + i * 130
    draw.text((80, y), f"{i + 1}. {c['company']}", font=font(56, True), fill=(255, 255, 255))
    draw.text((80, y + 70), f"  {c['industry']} · {c['highlight']}", font=font(36), fill=(255, 227, 216))

# 转化卡片
draw.rounded_rectangle((80, 1180, W - 80, 1360), radius=32, fill=(255, 255, 255, 30))
draw.text((120, 1240), "校招喵 | 校招网申表", font=font(44, True), fill=(255, 255, 255))
draw.text((120, 1300), "公司+投递入口+截止日期 · 一键投递", font=font(36), fill=(255, 227, 216))

PNG = OUT / "01_cover.png"
img.save(PNG, "PNG", optimize=True)
print(f"OK → {PNG} ({os.path.getsize(PNG)} bytes, {W}×{H})")