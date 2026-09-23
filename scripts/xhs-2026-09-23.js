/**
 * 2026-09-23 小红书图文（仿鲨鲨 6 段公式硬约束）
 * 产物：outputs/xhs/2026-09-23/{00_cover.png, 01_stats.png, 02..07_company_<n>.png, 99_cta.png}
 *       + 04_caption.txt / 05_data.json / README.txt
 * 不发布、不调外部 LLM/图像 API（按凭据安全红线 v0）。
 */
require("dotenv").config({ path: ".env.production" });
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { execFileSync } = require("node:child_process");

const prisma = new PrismaClient();
const PY = process.env.PY_BIN || "/Users/apple/.workbuddy/binaries/python/envs/default/bin/python3.13";
const OUT = path.resolve(__dirname, "..", "outputs", "xhs", "2026-09-23");
fs.mkdirSync(OUT, { recursive: true });

// ——— 数据准备 ———
async function fetchTodayJobs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

function splitRoles(s) {
  if (!s) return [];
  return String(s).split(/[\\,，;；、\/]+/).map((x) => x.trim()).filter(Boolean);
}

function splitLocs(s) {
  if (!s) return [];
  return String(s).split(/[,，;；、\s]+/).map((x) => x.trim()).filter(Boolean);
}

function buildTags(j) {
  const tags = [];
  if (j.noWrittenTest === "true") tags.push("免笔试");
  const d = daysLeft(j.endDate);
  if (d !== null && d <= 60) tags.push(d === 0 ? "今天截止" : `${d} 天后截止`);
  return tags;
}

function emojiOf(industry) {
  // emoji 字体在 macOS+Pillow 下渲染成"口"，改用中文括号替代
  return ({
    "金融": "【银行金融】", "国央企": "【国央企】", "外企": "【外企】",
    "互联网": "【互联网】", "制造业": "【制造业】", "新能源": "【新能源】",
    "生物医药": "【生物医药】", "消费": "【消费】", "科技": "【科技】",
    "传媒": "【传媒】", "物流": "【物流】", "专业服务": "【专业服务】", "其他": "【其他】",
  })[industry] || "【" + industry + "】";
}

// 鲨鲨板块顺序：金融→国央企→外企→互联网→制造业→生物医药
const ORDER = ["金融", "国央企", "外企", "互联网", "制造业", "生物医药"];

function pickCompanies(all) {
  const out = [];
  for (const ind of ORDER) {
    const list = all.filter((j) => j.industry === ind);
    if (!list.length) continue;
    list.sort((a, b) => {
      const sa = (a.noWrittenTest === "true" ? 100 : 0) + (daysLeft(a.endDate) !== null ? Math.max(0, 100 - daysLeft(a.endDate)) : 0);
      const sb = (b.noWrittenTest === "true" ? 100 : 0) + (daysLeft(b.endDate) !== null ? Math.max(0, 100 - daysLeft(b.endDate)) : 0);
      return sb - sa;
    });
    out.push({
      ...list[0],
      _industry: ind,
      _tags: buildTags(list[0]),
      _roles: splitRoles(list[0].roles),
      _locs: splitLocs(list[0].locations),
    });
  }
  return out.slice(0, 6);
}

// ——— 文案 ———
function buildCaption({ total, noTest, byIndustry, picks }) {
  const date = "9月23日";
  const lines = [
    `① ${date}，家人们慌了！昨天新开 ${total} 家校招。秋招竞争激烈，错过只能等春招/社招。`,
    "",
    `② 校招喵今天新收录 ${total} 条校招公告，其中 ${noTest} 条明确免笔试。`,
    `板块分布：${byIndustry.map((b) => `${b.industry} ${b._count} 家`).join(" / ")}。`,
    "",
    `③ 分板块盘点（每家跟一个亮点）：`,
  ];
  for (let i = 0; i < picks.length; i++) {
    const c = picks[i];
    const tag = c._tags.length ? `（${c._tags.join(" · ")}）` : "（在招）";
    lines.push(`  ${i + 1}. ${c.company} ${tag}`);
    lines.push(`     ${emojiOf(c._industry).slice(1, -1)} | ${c._locs.slice(0, 4).join(" / ")}`);
    if (c._roles.length) lines.push(`     岗位：${c._roles.slice(0, 5).join(" / ")}`);
  }
  lines.push("");
  lines.push("④ 信息差焦虑：岗位散在公众号/官网/校招群，自己找必漏。");
  lines.push("");
  lines.push("⑤ 我整理进【校招喵 | 校招网申表】，公司 + 投递入口 + 截止日期一键看，喵一眼小程序直接投。");
  lines.push("");
  lines.push("#27届秋招 #秋招信息差 #校招喵 #应届生 #求职 #内推码");
  return lines.join("\n");
}

// ——— 图片渲染（交给 Pillow） ———
function renderToPython({ cards }) {
  const payload = JSON.stringify(cards);
  const py = OUT + "render.py";
  fs.writeFileSync(py, buildRenderScript(payload), "utf8");
  execFileSync(PY, [py], { stdio: "inherit" });
  fs.unlinkSync(py);
}

function buildRenderScript(cardsJson) {
  return `#!/usr/bin/env python3
import json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CARDS = json.loads(${JSON.stringify(cardsJson)})
OUT = Path(${JSON.stringify(OUT)})

BG_TOP, BG_BOTTOM = (255, 107, 74), (229, 90, 60)
DARK_BG = (29, 27, 32)
ORANGE = (232, 90, 60)
ORANGE_SOFT = (255, 195, 130)
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
            if cur:
                lines.append(cur)
            cur = ch
    if cur: lines.append(cur)
    return "\\n".join(lines)

def draw_numbered(i, data):
    W, H = 1080, 1440
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 280), fill=ORANGE)
    draw.text((60, 80), f"{i+2} / 9 张", font=font(48), fill=SUBTLE)
    draw.text((60, 160), data["industry"], font=font(60, True), fill=WHITE)
    name_y = 340
    name = fit(draw, data["company"], font(84, True), W - 120)
    draw.multiline_text((60, name_y), name, font=font(84, True), fill=WHITE, spacing=10)
    tag_y = 580
    if data["tags"]:
        x = 60
        for tag in data["tags"]:
            tw = draw.textlength(tag, font=font(36, True)) + 60
            draw.rounded_rectangle((x, tag_y, x + tw, tag_y + 70), radius=35, fill=ORANGE)
            draw.text((x + 30, tag_y + 12), tag, font=font(36, True), fill=WHITE)
            x += tw + 20
    role_y = 740
    draw.text((60, role_y), "招聘岗位", font=font(40, True), fill=SUBTLE)
    role_lines = data["roles"][:6]
    role_text = "\\n".join(f"• {r}" for r in role_lines) if role_lines else "（以官网为准）"
    role_text = fit(draw, role_text, font(38), W - 120)
    draw.multiline_text((60, role_y + 60), role_text, font=font(38), fill=WHITE, spacing=10)
    role_n = len(role_text.split('\\n')) if role_text else 0
    loc_y = role_y + 60 + role_n * 50 + 40
    if loc_y < H - 200:
        draw.text((60, loc_y), "工作地点", font=font(40, True), fill=SUBTLE)
        loc_text = " · ".join(data["locations"][:6]) if data["locations"] else "（见官网）"
        loc_text = fit(draw, loc_text, font(38), W - 120)
        draw.multiline_text((60, loc_y + 60), loc_text, font=font(38), fill=WHITE, spacing=10)
    draw.text((60, H - 110), f"{i+2} / 9 张", font=font(36), fill=GREY)
    draw.text((W - 360, H - 110), "← 滑动看下一家", font=font(36), fill=GREY)
    img.save(OUT / f"02_company_{i+1}.png", "PNG", optimize=True)

def draw_cover(data):
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
    draw.text((80, 270), f"{data['date']}，家人们慌了！", font=font(56, True), fill=WHITE)
    draw.text((80, 360), f"昨天校招喵新收录 {data['total']} 条公告", font=font(48), fill=SUBTLE)
    draw.text((80, 430), f"{data['noTest']} 条明确免笔试", font=font(48), fill=SUBTLE)
    draw.line((80, 500, W - 80, 500), fill=(255, 255, 255, 130), width=3)
    draw.text((80, 570), "今天推荐 6 家（按板块）", font=font(48), fill=WHITE)
    for i, c in enumerate(data["picks"]):
        y = 670 + i * 100
        text = f"  {c['industry_emoji']}  {c['company']}"
        draw.text((80, y), text, font=font(40), fill=WHITE)
    draw.text((80, H - 130), "1 / 9 张", font=font(36), fill=SUBTLE)
    draw.text((W - 420, H - 130), "→ 滑动看今天盘点", font=font(36), fill=SUBTLE)
    img.save(OUT / "00_cover.png", "PNG", optimize=True)

def draw_stats(data):
    W, H = 1080, 1440
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 280), fill=ORANGE)
    draw.text((60, 80), "2 / 9 张", font=font(48), fill=SUBTLE)
    draw.text((60, 160), "今日新增 · 板块分布", font=font(60, True), fill=WHITE)
    draw.text((60, 360), str(data["total"]), font=font(160, True), fill=WHITE)
    draw.text((280, 410), "条新公告", font=font(48), fill=SUBTLE)
    draw.text((60, 580), str(data["noTest"]), font=font(140, True), fill=ORANGE_SOFT)
    draw.text((280, 620), "条免笔试", font=font(48), fill=SUBTLE)
    y = 820
    draw.text((60, y - 60), "板块分布", font=font(48, True), fill=WHITE)
    max_count = max(b["_count"] for b in data["byIndustry"])
    bar_w = W - 140
    for b in data["byIndustry"][:6]:
        bw = max(60, int(bar_w * b["_count"] / max_count))
        draw.rounded_rectangle((60, y, 60 + bw, y + 56), radius=28, fill=ORANGE)
        draw.text((80, y + 8), f"{b['industry']}  {b['_count']} 家", font=font(32, True), fill=WHITE)
        y += 76
    draw.text((60, H - 110), "2 / 9 张", font=font(36), fill=GREY)
    draw.text((W - 360, H - 110), "→ 滑动看公司", font=font(36), fill=GREY)
    img.save(OUT / "01_stats.png", "PNG", optimize=True)

def draw_cta():
    W, H = 1080, 1440
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, W, 280), fill=ORANGE)
    draw.text((60, 80), "9 / 9 张", font=font(48), fill=SUBTLE)
    draw.text((60, 160), "一键投递", font=font(64, True), fill=WHITE)
    draw.rounded_rectangle((80, 380, W - 80, 880), radius=48, fill=ORANGE)
    draw.text((120, 440), "校招喵 · 校招网申表", font=font(60, True), fill=WHITE)
    draw.text((120, 530), "公司 + 投递入口 + 截止日期", font=font(40), fill=SUBTLE)
    draw.text((120, 590), "一键查看 · 一键投递", font=font(40), fill=SUBTLE)
    draw.text((120, 690), "内推码 + 笔面试资料", font=font(40), fill=SUBTLE)
    draw.text((120, 750), "全部一键领取", font=font(40), fill=SUBTLE)
    draw.text((60, 940), "评论区扣「1」", font=font(56, True), fill=WHITE)
    draw.text((60, 1020), "领校招喵每日更新网申表", font=font(40), fill=SUBTLE)
    draw.text((60, 1100), "主页置顶", font=font(56, True), fill=WHITE)
    draw.text((60, 1180), "看完整校招时间表 + 投递通道", font=font(40), fill=SUBTLE)
    draw.text((60, H - 110), "9 / 9 张", font=font(36), fill=GREY)
    img.save(OUT / "99_cta.png", "PNG", optimize=True)

cover = next(c for c in CARDS if c["kind"] == "cover")
stats = next(c for c in CARDS if c["kind"] == "stats")
companies = [c for c in CARDS if c["kind"] == "company"]
cta = next(c for c in CARDS if c["kind"] == "cta")

draw_cover(cover)
draw_stats(stats)
for i, c in enumerate(companies):
    draw_numbered(i, c)
draw_cta()
print("OK 9 张图已生成:", OUT)
`;
}

(async () => {
  const jobs = await fetchTodayJobs();
  const total = jobs.length;
  const noTest = jobs.filter((j) => j.noWrittenTest === "true").length;
  const byIndustryRaw = {};
  for (const j of jobs) byIndustryRaw[j.industry] = (byIndustryRaw[j.industry] || 0) + 1;
  const byIndustry = Object.entries(byIndustryRaw)
    .map(([industry, _count]) => ({ industry, _count }))
    .sort((a, b) => b._count - a._count);

  const picks = pickCompanies(jobs);

  const cards = [
    { kind: "cover", date: "9月23日", total, noTest, picks: picks.map((c) => ({ company: c.company, industry_emoji: emojiOf(c._industry) })) },
    { kind: "stats", total, noTest, byIndustry },
    ...picks.map((c) => ({ kind: "company", industry: c._industry, industry_emoji: emojiOf(c._industry), company: c.company, tags: c._tags, roles: c._roles, locations: c._locs })),
    { kind: "cta" },
  ];

  renderToPython({ cards });

  const fullCaption = buildCaption({ total, noTest, byIndustry, picks });
  fs.writeFileSync(path.join(OUT, "04_caption.txt"), fullCaption, "utf8");
  fs.writeFileSync(
    path.join(OUT, "05_data.json"),
    JSON.stringify(
      {
        date: "2026-09-23",
        total,
        noTest,
        byIndustry,
        picks: picks.map((c) => ({
          company: c.company,
          industry: c._industry,
          locations: c._locs,
          roles: c._roles,
          tags: c._tags,
          noWrittenTest: c.noWrittenTest,
          endDate: c.endDate,
        })),
        caption: fullCaption,
      },
      null,
      2,
    ),
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT, "README.txt"),
    [
      "小红书图文（2026-09-23，9 张轮播）",
      "0  00_cover.png  封面 + 6 家代表预览",
      "1  01_stats.png  今日新增数据 + 板块分布",
      "2-7 02_company_1..6.png  每家公司：岗位 + 地点 + 亮点",
      "8  99_cta.png  转化卡（评论区扣 1 / 主页置顶）",
      "",
      "文案：04_caption.txt",
      "数据：05_data.json",
      "渲染脚本：scripts/xhs-2026-09-23.js → scripts/xhs-render.py",
    ].join("\n"),
    "utf8",
  );

  await prisma.$disconnect();
  console.log("OK →", OUT);
  console.log(`总 ${total} / 免笔试 ${noTest} / 公司卡 ${picks.length} 张`);
  picks.forEach((c) => console.log(`  - ${c._industry} | ${c.company}（${c._tags.join("·") || "在招"}）`));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});