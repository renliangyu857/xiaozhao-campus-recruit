#!/usr/bin/env python3
"""
Generate Xiaohongshu cover images based on Vivid Clarity design philosophy
Dimensions: 900x1200px (3:4 ratio)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Create output directory
output_dir = "d:\\web-site\\nextjs-campusrecruit\\docs\\xiaohongshu-covers"
os.makedirs(output_dir, exist_ok=True)

# Canvas dimensions
WIDTH = 900
HEIGHT = 1200

# Color palette - vibrant and sophisticated
COLORS = {
    'coral': '#FF6B6B',
    'electric_blue': '#4ECDC4',
    'sunshine': '#FFE66D',
    'mint': '#95E1D3',
    'deep_purple': '#6C5CE7',
    'soft_pink': '#FDA7DF',
    'white': '#FFFFFF',
    'dark': '#2D3436',
    'light_gray': '#F5F6FA'
}

def create_gradient_background(width, height, color1, color2, direction='diagonal'):
    """Create a subtle gradient background"""
    img = Image.new('RGB', (width, height), color1)
    draw = ImageDraw.Draw(img)

    # Parse colors
    c1 = tuple(int(color1[i:i+2], 16) for i in (1, 3, 5))
    c2 = tuple(int(color2[i:i+2], 16) for i in (1, 3, 5))

    if direction == 'diagonal':
        for y in range(height):
            for x in range(width):
                ratio = (x + y) / (width + height)
                r = int(c1[0] + (c2[0] - c1[0]) * ratio)
                g = int(c1[1] + (c2[1] - c1[1]) * ratio)
                b = int(c1[2] + (c2[2] - c1[2]) * ratio)
                draw.point((x, y), fill=(r, g, b))

    return img

def add_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def create_cover_1_info_aggregation():
    """Cover 1: Information Aggregation Theme"""
    # Background - coral to soft pink gradient
    img = create_gradient_background(WIDTH, HEIGHT, COLORS['coral'], COLORS['soft_pink'])
    draw = ImageDraw.Draw(img)

    # Decorative circles - layered effect
    draw.ellipse([600, 100, 850, 350], fill=(*tuple(int(COLORS['white'][i:i+2], 16) for i in (1, 3, 5))[:-1], 30), outline=None)
    draw.ellipse([-100, 800, 200, 1100], fill=(*tuple(int(COLORS['sunshine'][i:i+2], 16) for i in (1, 3, 5))[:-1], 40), outline=None)

    # White card background
    card_margin = 60
    add_rounded_rect(draw, [card_margin, 300, WIDTH-card_margin, HEIGHT-200], 30, COLORS['white'])

    # Main title - large and bold
    try:
        # Try to use system fonts
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    except:
        # Fallback to default
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Main text
    draw.text((WIDTH//2, 400), "校招信息", fill=COLORS['dark'], font=title_font, anchor="mm")
    draw.text((WIDTH//2, 540), "一站搞定", fill=COLORS['coral'], font=title_font, anchor="mm")

    # Subtitle
    draw.text((WIDTH//2, 680), "不用再关注100个公众号", fill=COLORS['dark'], font=subtitle_font, anchor="mm")

    # Feature pills
    pill_y = 780
    pill_color = COLORS['electric_blue']
    features = ["聚合全网", "智能筛选", "实时更新"]
    start_x = 120
    for i, feature in enumerate(features):
        pill_width = 180
        pill_height = 60
        x = start_x + i * (pill_width + 30)
        add_rounded_rect(draw, [x, pill_y, x + pill_width, pill_y + pill_height], 30, pill_color)
        draw.text((x + pill_width//2, pill_y + pill_height//2), feature, fill=COLORS['white'], font=small_font, anchor="mm")

    # Bottom CTA
    draw.text((WIDTH//2, 1050), "建议收藏 | 每日更新", fill=COLORS['dark'], font=small_font, anchor="mm")

    img.save(f"{output_dir}/cover_01_info_aggregation.png", "PNG")
    print("[OK] Created: cover_01_info_aggregation.png")

def create_cover_2_progress_tracking():
    """Cover 2: Progress Management Theme"""
    # Background - mint to electric blue
    img = create_gradient_background(WIDTH, HEIGHT, COLORS['mint'], COLORS['electric_blue'])
    draw = ImageDraw.Draw(img)

    # Decorative elements
    draw.ellipse([700, 50, 950, 300], fill=(*tuple(int(COLORS['white'][i:i+2], 16) for i in (1, 3, 5))[:-1], 20), outline=None)

    # White card
    card_margin = 60
    add_rounded_rect(draw, [card_margin, 280, WIDTH-card_margin, HEIGHT-220], 30, COLORS['white'])

    # Title
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 100)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Progress visualization
    draw.text((WIDTH//2, 360), "投递进度", fill=COLORS['dark'], font=title_font, anchor="mm")
    draw.text((WIDTH//2, 480), "一目了然", fill=COLORS['electric_blue'], font=title_font, anchor="mm")

    # Progress bars visualization
    bar_y = 600
    bar_height = 40
    bar_width = 600
    stages = [
        ("已投递 35家", 1.0, COLORS['electric_blue']),
        ("笔试中 8家", 0.6, COLORS['sunshine']),
        ("面试中 3家", 0.3, COLORS['coral']),
        ("已Offer 1家", 0.1, COLORS['mint'])
    ]

    for i, (label, ratio, color) in enumerate(stages):
        y = bar_y + i * 80
        # Background bar
        add_rounded_rect(draw, [150, y, 150 + bar_width, y + bar_height], 20, COLORS['light_gray'])
        # Progress bar
        add_rounded_rect(draw, [150, y, 150 + int(bar_width * ratio), y + bar_height], 20, color)
        # Label
        draw.text((160, y - 25), label, fill=COLORS['dark'], font=small_font, anchor="lm")

    # Bottom text
    draw.text((WIDTH//2, 1020), "海投选手必备 | 科学管理求职", fill=COLORS['dark'], font=subtitle_font, anchor="mm")

    img.save(f"{output_dir}/cover_02_progress_tracking.png", "PNG")
    print("[OK] Created: cover_02_progress_tracking.png")

def create_cover_3_referral_codes():
    """Cover 3: Referral Codes Theme"""
    # Background - deep purple with sunshine accents
    img = create_gradient_background(WIDTH, HEIGHT, COLORS['deep_purple'], '#A29BFE')
    draw = ImageDraw.Draw(img)

    # Decorative ticket shapes
    for i in range(3):
        offset = i * 60
        add_rounded_rect(draw, [100 + offset, 150 + offset, 400 + offset, 300 + offset], 20,
                        (*tuple(int(COLORS['sunshine'][i:i+2], 16) for i in (1, 3, 5))[:-1], 100))

    # Main content area
    add_rounded_rect(draw, [60, 380, WIDTH-60, HEIGHT-180], 30, COLORS['white'])

    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 96)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 44)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        code_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 40)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        code_font = ImageFont.load_default()

    # Title
    draw.text((WIDTH//2, 480), "大厂内推码", fill=COLORS['deep_purple'], font=title_font, anchor="mm")
    draw.text((WIDTH//2, 590), "汇总", fill=COLORS['sunshine'], font=title_font, anchor="mm")

    # Code samples visual
    companies = [
        ("字节", "ABC123"),
        ("腾讯", "DEF456"),
        ("阿里", "GHI789")
    ]

    start_y = 700
    for i, (company, code) in enumerate(companies):
        y = start_y + i * 80
        # Company pill
        add_rounded_rect(draw, [180, y, 320, y + 50], 25, COLORS['deep_purple'])
        draw.text((250, y + 25), company, fill=COLORS['white'], font=small_font, anchor="mm")
        # Code pill
        add_rounded_rect(draw, [360, y, 720, y + 50], 25, COLORS['light_gray'])
        draw.text((540, y + 25), code, fill=COLORS['dark'], font=code_font, anchor="mm")

    # Bottom
    draw.text((WIDTH//2, 1020), "跳过简历筛选 | 直通面试", fill=COLORS['dark'], font=subtitle_font, anchor="mm")

    img.save(f"{output_dir}/cover_03_referral_codes.png", "PNG")
    print("[OK] Created: cover_03_referral_codes.png")

def create_cover_4_urgency():
    """Cover 4: Urgency/Countdown Theme"""
    # Background - alarming coral to sunshine
    img = create_gradient_background(WIDTH, HEIGHT, COLORS['coral'], COLORS['sunshine'])
    draw = ImageDraw.Draw(img)

    # Alert/urgency circles
    draw.ellipse([650, 100, 900, 350], fill=None, outline=COLORS['white'], width=8)
    draw.ellipse([680, 130, 870, 320], fill=None, outline=COLORS['white'], width=4)

    # Main card
    add_rounded_rect(draw, [50, 250, WIDTH-50, HEIGHT-150], 30, COLORS['white'])

    try:
        alert_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 80)
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 90)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 44)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except:
        alert_font = ImageFont.load_default()
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Alert icon (exclamation as text)
    draw.text((WIDTH//2, 340), "⚠", fill=COLORS['coral'], font=alert_font, anchor="mm")

    # Main message
    draw.text((WIDTH//2, 460), "本周截止", fill=COLORS['coral'], font=title_font, anchor="mm")

    # Companies list
    companies = ["字节跳动", "腾讯", "阿里巴巴", "美团"]
    start_y = 560
    for i, company in enumerate(companies):
        y = start_y + i * 70
        # Bullet point
        draw.ellipse([200, y + 15, 230, y + 45], fill=COLORS['coral'])
        draw.text((260, y + 30), company, fill=COLORS['dark'], font=subtitle_font, anchor="lm")

    # Urgency CTA
    add_rounded_rect(draw, [200, 880, WIDTH-200, 960], 40, COLORS['coral'])
    draw.text((WIDTH//2, 920), "立即投递", fill=COLORS['white'], font=subtitle_font, anchor="mm")

    # Bottom note
    draw.text((WIDTH//2, 1030), "错过等一年 | 最后机会", fill=COLORS['dark'], font=small_font, anchor="mm")

    img.save(f"{output_dir}/cover_04_urgency_ddl.png", "PNG")
    print("[OK] Created: cover_04_urgency_ddl.png")

def create_cover_5_free_trial():
    """Cover 5: Free Trial/VIP Theme"""
    # Background - luxury gradient
    img = create_gradient_background(WIDTH, HEIGHT, COLORS['deep_purple'], COLORS['electric_blue'])
    draw = ImageDraw.Draw(img)

    # Decorative VIP elements
    for i in range(5):
        angle = i * 72
        # Star points visualization as small diamonds
        pass

    # Main content card with gold/crown feel
    add_rounded_rect(draw, [60, 280, WIDTH-60, HEIGHT-200], 30, COLORS['white'])

    try:
        crown_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 120)
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 80)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 44)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
    except:
        crown_font = ImageFont.load_default()
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # Crown/VIP icon
    draw.text((WIDTH//2, 380), "👑", fill=COLORS['sunshine'], font=crown_font, anchor="mm")

    # Title
    draw.text((WIDTH//2, 520), "VIP体验", fill=COLORS['deep_purple'], font=title_font, anchor="mm")
    draw.text((WIDTH//2, 620), "免费领", fill=COLORS['electric_blue'], font=title_font, anchor="mm")

    # Benefits
    benefits = ["无限查询", "全部内推码", "收藏职位"]
    start_y = 720
    for i, benefit in enumerate(benefits):
        y = start_y + i * 60
        # Checkmark
        draw.text((280, y), "✓", fill=COLORS['electric_blue'], font=subtitle_font, anchor="lm")
        draw.text((330, y), benefit, fill=COLORS['dark'], font=subtitle_font, anchor="lm")

    # CTA button
    add_rounded_rect(draw, [200, 950, WIDTH-200, 1020], 35, COLORS['sunshine'])
    draw.text((WIDTH//2, 985), "立即领取", fill=COLORS['dark'], font=subtitle_font, anchor="mm")

    # Bottom note
    draw.text((WIDTH//2, 1080), "新用户专属 | 限前100名", fill=COLORS['dark'], font=small_font, anchor="mm")

    img.save(f"{output_dir}/cover_05_free_trial.png", "PNG")
    print("[OK] Created: cover_05_free_trial.png")

def main():
    print("Generating Xiaohongshu Cover Templates...")
    print("=" * 50)

    create_cover_1_info_aggregation()
    create_cover_2_progress_tracking()
    create_cover_3_referral_codes()
    create_cover_4_urgency()
    create_cover_5_free_trial()

    print("=" * 50)
    print("\n[OK] All covers generated in: " + output_dir)
    print("\nCover types:")
    print("  1. Information Aggregation")
    print("  2. Progress Tracking")
    print("  3. Referral Codes")
    print("  4. Urgency/DDL")
    print("  5. Free Trial")

if __name__ == "__main__":
    main()
