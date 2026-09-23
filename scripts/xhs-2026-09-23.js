/**
 * 2026-09-23 小红书图文 · 6 张版（每类企业 2–3 家）
 * 数据：Prisma 生产库
 * 输出：outputs/xhs/2026-09-23/{00_cover.png, 01_internet.png, 02_guoyingqiye.png, 03_waqi.png, 04_zhizaoye.png, 05_yiyao.png, 06_cta.png}
 *       + 04_caption.txt / 05_data.json / README.txt
 * 用 Pillow 直接渲染（避开 cairosvg/libcairo 依赖）
 * 板块按鲨鲨顺序：互联网 / 国央企 / 外企 / 制造业 / 生物医药（每板块 2-3 家公司）
 */
require("dotenv").config({ path: ".env.production" });
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { execFileSync } = require("node:child_process");

const prisma = new PrismaClient();
const PY = process.env.PY_BIN || "/Users/apple/.workbuddy/binaries/python/envs/default/bin/python3.13";
const OUT = path.resolve(__dirname, "..", "outputs", "xhs", "2026-09-23");
const SCREENS = OUT + "/screens";
fs.mkdirSync(SCREENS, { recursive: true });

// ——— 数据准备 ———
async function fetchTodayJobs() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return prisma.job.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { company: true, industry: true, locations: true, endDate: true, noWrittenTest: true, roles: true },
  });
}
function daysLeft(endDate) {
  if (!endDate || endDate === "招满为止" || endDate === "招满即止") return null;
  const t = new Date(endDate).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.ceil((t - Date.now()) / 86400000));
}
function splitRoles(s) { if (!s) return []; return String(s).split(/[\\,，;；、\/]+/).map(x => x.trim()).filter(Boolean); }
function splitLocs(s) { if (!s) return []; return String(s).split(/[,，;；、\s]+/).map(x => x.trim()).filter(Boolean); }
function buildTags(j) {
  const tags = [];
  if (j.noWrittenTest === "true") tags.push("免笔试");
  const d = daysLeft(j.endDate);
  if (d !== null && d <= 60) tags.push(d === 0 ? "今天截止" : `${d} 天后截止`);
  return tags;
}

// 板块（每个一个信息卡）：互联网 / 国央企 / 外企 / 制造业 / 生物医药
const CARDS = [
  { file: "internet.png", industry: "互联网", label: "互联网民营" },
  { file: "guoyingqiye.png", industry: "国央企", label: "国央企" },
  { file: "waqi.png", industry: "外企", label: "外企" },
  { file: "zhizaoye.png", industry: "制造业", label: "制造业" },
  { file: "yiyao.png", industry: "生物医药", label: "生物医药" },
];

function pickFor(jobs, industry, n) {
  const list = jobs.filter(j => j.industry === industry);
  if (!list.length) return [];
  list.sort((a, b) => {
    const sa = (a.noWrittenTest === "true" ? 100 : 0) + (daysLeft(a.endDate) !== null ? Math.max(0, 100 - daysLeft(a.endDate)) : 0);
    const sb = (b.noWrittenTest === "true" ? 100 : 0) + (daysLeft(b.endDate) !== null ? Math.max(0, 100 - daysLeft(b.endDate)) : 0);
    return sb - sa;
  });
  return list.slice(0, n).map(j => ({
    company: j.company,
    roles: splitRoles(j.roles).slice(0, 4),
    locations: splitLocs(j.locations).slice(0, 4),
    tags: buildTags(j),
    noWrittenTest: j.noWrittenTest,
    endDate: j.endDate,
  }));
}

// ——— 文案 ———
function buildCaption({ total, noTest, byIndustry, grouped }) {
  const lines = [
    `① 9月23日，家人们慌了！昨天新开 ${total} 家校招。`,
    "",
    `② 校招喵今天新收录 ${total} 条校招公告，其中 ${noTest} 条明确免笔试。`,
    `板块分布：${byIndustry.map(b => `${b.industry} ${b._count} 家`).join(" / ")}。`,
    "",
    `③ 分板块盘点（每类企业 2–3 家代表）：`,
  ];
  for (const { label, picks } of grouped) {
    lines.push(`  【${label}】`);
    for (const p of picks) {
      const tag = p.tags.length ? `（${p.tags.join("·")}）` : "（在招）";
      lines.push(`  · ${p.company} ${tag}`);
      if (p.roles.length) lines.push(`    岗位：${p.roles.join(" / ")}`);
      if (p.locations.length) lines.push(`    地点：${p.locations.join(" / ")}`);
    }
  }
  lines.push("");
  lines.push("④ 信息差焦虑：公众号/官网/校招群全靠自己盯必漏。");
  lines.push("");
  lines.push("⑤ 我整理进【校招喵 | 校招网申表】，喵一眼小程序直接投。");
  lines.push("");
  lines.push("#27届秋招 #秋招信息差 #校招喵 #应届生 #求职 #内推码");
  return lines.join("\n");
}

// ——— Pillow 渲染 ———
function renderPython({ grouped, total, noTest, byIndustry }) {
  const payload = JSON.stringify({ grouped, total, noTest, byIndustry });
  const py = OUT + "render.py";
  fs.writeFileSync(py, buildRenderScript(payload), "utf8");
  execFileSync(PY, [py], { stdio: "inherit" });
  fs.unlinkSync(py);
}

function buildRenderScript(payloadJson) {
  return `#!/usr/bin/env python3
import json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DATA = json.loads(${JSON.stringify(payloadJson)})
OUT = Path(${JSON.stringify(OUT)})
SCREENS = Path(${JSON.stringify(SCREENS)})

BG_TOP, BG_BOTTOM = (255, 107, 74), (229, 90, 60)
ORANGE = (232, 90, 60)
ORANGE_SOFT = (255, 195, 130)
DARK_BG = (29, 27, 32)
WHITE = (255, 255, 255)
SUBTLE = (255, 227, 216)
GREY = (180, 180, 185)

def font(size, bold=True):
    for p in [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def fit(draw, text, font, max_w):
    if not text: return ""
    lines, cur = [], ""
    for ch in str(text):
        if ch == "\\n":
            lines.append(cur); cur = ""; continue
        cand = cur + ch
        try:
            w = draw.textlength(cand, font=font)
        except Exception:
            w = max_w + 1
        if w <= max_w:
            cur = cand
        else:
            if cur: lines.append(cur)
            cur = ch
    if cur: lines.append(cur)
    return "\\n".join(lines)

# 封面：今日新增 + 5 板块概览
def draw_cover():
    W, H = 1080, 1440
    img = Image.new("RGB", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] * (1 - t) + BG_BOTTOM[0] * t)
        g = int(BG_TOP[1] * (1 - t) + BG_BOTTOM[1] * t)
        b = int(BG_TOP[2] * (1 - t) + BG_BOTTOM[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    draw.rounded_rectangle((40, 40, W - 40, H - 40), radius=48, outline=(255, 255, 255, 80), width=4)
    draw.text((80, 170), "校招喵 · 每日新增", font=font(64, True), fill=WHITE)
    draw.text((80, 280), "9月23日，家人们慌了！", font=font(56, True), fill=WHITE)
    draw.text((80, 360), f"今天新收录 {DATA['total']} 条校招公告", font=font(48), fill=SUBTLE)
    draw.text((80, 430), f"免笔试 {DATA['noTest']} 条 / 板块代表 10 家", font=font(44), fill=SUBTLE)
    draw.line((80, 510, W - 80, 510), fill=(255, 255, 255, 130), width=3)
    y = 590
    for g in DATA["grouped"]:
        draw.text((80, y), f"【{g['label']}】", font=font(34, True), fill=WHITE)
        y += 48
        for p in g["picks"][:3]:
            line = f"  · {p['company']}"
            if p["tags"]: line += "  " + " · ".join(p["tags"])
            txt = fit(draw, line, font(28), W - 180)
            draw.text((100, y), txt, font=font(28), fill=SUBTLE)
            y += 40
        y += 8
    draw.text((80, H - 130), "1 / 6 张", font=font(36), fill=SUBTLE)
    draw.text((W - 360, H - 130), "→ 滑动看 5 类企业", font=font(36), fill=SUBTLE)
    img.save(OUT / "00_cover.png", "PNG", optimize=True)

# 板块信息卡：每张最多 3 家公司，竖排
def draw_sector(idx, g):
    W, H = 1080, 1440
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 280), fill=ORANGE)
    draw.text((60, 80), f"{idx+1} / 6 张", font=font(48), fill=SUBTLE)
    draw.text((60, 160), f"【{g['label']}】 · {len(g['picks'])} 家代表", font=font(60, True), fill=WHITE)
    y = 340
    picks = g["picks"][:3]
    for i, p in enumerate(picks):
        nm = fit(draw, p["company"], font(54, True), W - 140)
        draw.multiline_text((60, y), nm, font=font(54, True), fill=WHITE, spacing=6)
        y += 76
        if p["tags"]:
            x = 60
            for tag in p["tags"]:
                tw = draw.textlength(tag, font=font(32, True)) + 56
                draw.rounded_rectangle((x, y, x + tw, y + 60), radius=30, fill=ORANGE)
                draw.text((x + 28, y + 12), tag, font=font(32, True), fill=WHITE)
                x += tw + 16
            y += 78
        else:
            y += 16
        meta = ""
        if p["roles"]: meta += "岗位： " + " / ".join(p["roles"][:4])
        if p["locations"]: meta += "   地点： " + " / ".join(p["locations"][:3])
        meta = fit(draw, meta, font(32), W - 140)
        draw.multiline_text((60, y), meta, font=font(32), fill=SUBTLE, spacing=6)
        y += (len(meta.split('\\n')) if meta else 0) * 46 + 30
        if i < len(picks) - 1:
            draw.line((60, y, W - 60, y), fill=(80, 80, 85), width=2)
            y += 22
    draw.text((60, H - 110), f"{idx+1} / 6 张", font=font(36), fill=GREY)
    draw.text((W - 360, H - 110), "← 滑动看下一类", font=font(36), fill=GREY)
    img.save(OUT / (f"{idx+1:02d}_" + str(g["file"])), "PNG", optimize=True)

# CTA：转化 + 内嵌一张真实资料库截图
def draw_cta():
    W, H = 1080, 1440
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 280), fill=ORANGE)
    draw.text((60, 80), "6 / 6 张", font=font(48), fill=SUBTLE)
    draw.text((60, 160), "喵一眼小程序", font=font(60, True), fill=WHITE)
    draw.rounded_rectangle((80, 360, W - 80, 720), radius=40, fill=ORANGE)
    draw.text((120, 410), "校招喵 · 校招网申表", font=font(56, True), fill=WHITE)
    draw.text((120, 490), "公司 + 投递入口 + 截止日期 一键看", font=font(34), fill=SUBTLE)
    draw.text((120, 545), "进度面板自动帮你记着", font=font(34), fill=SUBTLE)
    draw.text((120, 600), "内推码 + 笔面试资料一并拿走", font=font(34), fill=SUBTLE)
    draw.text((60, 790), "评论区扣「1」", font=font(52, True), fill=WHITE)
    draw.text((60, 870), "领校招喵每日更新网申表", font=font(34), fill=SUBTLE)
    draw.text((60, 940), "主页置顶", font=font(52, True), fill=WHITE)
    draw.text((60, 1020), "看完整校招时间表 + 投递通道", font=font(34), fill=SUBTLE)
    exam_screen = SCREENS / "02_exam.png"
    if exam_screen.exists():
        try:
            shot = Image.open(exam_screen).convert("RGB")
            shot.thumbnail((W - 160, 320))
            sx = (W - shot.width) // 2
            draw.rounded_rectangle((sx - 6, 1100 - 6, sx + shot.width + 6, 1100 + shot.height + 6), radius=12, fill=ORANGE)
            img.paste(shot, (sx, 1100))
        except Exception as e:
            print("paste exam shot err", e)
    draw.text((60, H - 80), "6 / 6 张", font=font(36), fill=GREY)
    img.save(OUT / "06_cta.png", "PNG", optimize=True)

draw_cover()
for idx, g in enumerate(DATA["grouped"]):
    draw_sector(idx, g)
draw_cta()
print("OK 6 张卡已生成:", OUT)
`;
}

(async () => {
  const jobs = await fetchTodayJobs();
  const total = jobs.length;
  const noTest = jobs.filter(j => j.noWrittenTest === "true").length;
  const byIndustryRaw = {};
  for (const j of jobs) byIndustryRaw[j.industry] = (byIndustryRaw[j.industry] || 0) + 1;
  const byIndustry = Object.entries(byIndustryRaw)
    .map(([industry, _count]) => ({ industry, _count }))
    .sort((a, b) => b._count - a._count);

  const grouped = CARDS.map(c => ({ ...c, picks: pickFor(jobs, c.industry, 3) }));

  const fullCaption = buildCaption({ total, noTest, byIndustry, grouped });
  fs.writeFileSync(path.join(OUT, "04_caption.txt"), fullCaption, "utf8");
  fs.writeFileSync(
    path.join(OUT, "05_data.json"),
    JSON.stringify({ date: "2026-09-23", total, noTest, byIndustry, grouped, caption: fullCaption }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT, "README.txt"),
    [
      "小红书图文（2026-09-23，6 张轮播 · 每类企业 2–3 家）",
      "0  00_cover.png         封面：今日新增 + 5 板块概览",
      "1  01_internet.png       【互联网】3 家代表",
      "2  02_guoyingqiye.png    【国央企】3 家代表",
      "3  03_waqi.png           【外企】3 家代表",
      "4  04_zhizaoye.png       【制造业】3 家代表",
      "5  05_yiyao.png          【生物医药】3 家代表",
      "6  06_cta.png            转化卡 + 内嵌真实资料库截图",
      "",
      "文案：04_caption.txt   数据：05_data.json",
      "站点截图：screens/01_home.png 02_exam.png 03_referral.png 04_vip.png",
    ].join("\n"),
    "utf8",
  );

  renderPython({ grouped, total, noTest, byIndustry });

  await prisma.$disconnect();
  console.log("OK →", OUT);
  console.log(`总 ${total} / 免笔试 ${noTest}`);
  grouped.forEach(g => console.log(`  【${g.label}】 ${g.picks.length} 家：${g.picks.map(p => p.company).join(" / ")}`));
})().catch((e) => { console.error(e); process.exit(1); });