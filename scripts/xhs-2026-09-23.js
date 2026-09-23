/**
 * 2026-09-23 小红书图文（仿鲨鲨 6 段公式）
 * 数据源：Prisma 生产库
 * 输出：outputs/xhs/2026-09-23/{01_cover.png, 02_segments.png, 03_data.json, 04_caption.txt}
 * 不发布，不调用任何外部 LLM/图像 API（按凭据安全红线 v0）
 *
 * 鲨鲨公式（memory/2026-09-14）：
 *   ① 情绪钩子（时点+家人们+紧迫）
 *   ② 数字冲击（昨天新开 100+ 家）
 *   ③ 分板块盘点（银行金融→央国企→外企→互联网民企），每家跟一个亮点标签
 *      亮点标签只能从 {noWrittenTest, daysLeft, locations, industry} 派生，禁止薪资福利（salary 23884 全空）
 *   ④ 信息差焦虑
 *   ⑤ 转化钩子（喵一眼校招网申表 / 投递入口 / 内推码）
 *   ⑥ #27届秋招 #秋招信息差
 */
require("dotenv").config({ path: ".env.production" });
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const OUT = path.resolve(__dirname, "..", "outputs", "xhs", "2026-09-23");
fs.mkdirSync(OUT, { recursive: true });

// ——————————— ① 取数 ———————————
async function fetchTodayJobs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const all = await prisma.job.findMany({
    where: { createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { company: true, industry: true, locations: true, endDate: true, noWrittenTest: true, roles: true },
  });
  return all;
}

function daysLeft(endDate) {
  if (!endDate || endDate === "招满为止" || endDate === "招满即止") return null;
  const t = new Date(endDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
}

// 鲨鲨公式：每家公司只能从 {免笔试/截止天数/城市/板块} 派生亮点
function buildHighlight(j) {
  const noTest = j.noWrittenTest === "true";
  const dl = daysLeft(j.endDate);
  const locs = (j.locations || "").split(/[,，;；、\s]+/).filter(Boolean);
  const cityLabel = locs.length > 2 ? `${locs[0]}等${locs.length}地` : (locs[0] || "");
  if (noTest && dl !== null && dl <= 7) return ["免笔试", `${dl}天后截止`].filter(Boolean).join("·");
  if (noTest) return "免笔试";
  if (dl !== null && dl <= 7) return `${dl}天后截止`;
  if (cityLabel) return `地点${cityLabel}`;
  return j.industry || "";
}

function pickByIndustry(jobs, industries, perIndustry = 1) {
  const out = [];
  for (const ind of industries) {
    const candidates = jobs.filter((j) => j.industry === ind);
    if (candidates.length === 0) continue;
    // 排序：免笔试 > 截止最近
    candidates.sort((a, b) => {
      const sa = (a.noWrittenTest === "true" ? 100 : 0) + (daysLeft(a.endDate) !== null ? Math.max(0, 100 - daysLeft(a.endDate)) : 0);
      const sb = (b.noWrittenTest === "true" ? 100 : 0) + (daysLeft(b.endDate) !== null ? Math.max(0, 100 - daysLeft(b.endDate)) : 0);
      return sb - sa;
    });
    out.push(...candidates.slice(0, perIndustry).map((j) => ({ ...j, _highlight: buildHighlight(j) })));
  }
  return out;
}

// ——————————— ② 文案（鲨鲨 6 段公式） ———————————
function buildCaption({ total, noTest, byIndustry, topN }) {
  const date = "9月23日";
  const headline = `${date}，家人们慌了！昨天新开${total}家校招。`;
  const stats = `📊 今日校招喵新收录 ${total} 条校招公告，其中 ${noTest} 条明确免笔试。`;
  const sectors = byIndustry.map((b) => `${b.industry}${b._count}家`).join(" / ");

  const segments = [];
  segments.push(`① 情绪钩子：${headline}秋招竞争激烈，错过只能等春招/社招。\n`);
  segments.push(`② 数字冲击：${stats}`);
  segments.push(`板块分布：${sectors}。`);
  segments.push("");
  segments.push("③ 分板块盘点（每家跟一个亮点）：");
  // 按鲨鲨原始顺序：银行/金融 → 央国企 → 外企 → 互联网民企 → 制造业
  const order = ["金融", "国央企", "外企", "互联网", "制造业", "新能源", "生物医药", "消费", "科技", "传媒", "物流", "专业服务", "其他"];
  const picks = [];
  for (const ind of order) {
    const c = topN.find((j) => j.industry === ind);
    if (c) picks.push(c);
  }
  for (const c of picks.slice(0, 8)) {
    segments.push(`  ${emoji(c.industry)} ${c.industry} | ${c.company}（${c._highlight || "在招"}）`);
  }
  segments.push("");
  segments.push("④ 信息差焦虑：岗位散在公众号/官网/校招群，自己找必漏；不同公司截止日期、提前批、扩招 HC 全靠自己盯。");
  segments.push("");
  segments.push("⑤ 转化钩子：我整理进【校招喵 | 校招网申表】，公司 + 投递入口 + 截止日期一键看，喵一眼小程序直接投。");
  segments.push("");
  segments.push("⑥ #27届秋招 #秋招信息差 #校招喵 #应届生 #求职 #内推码");
  return segments.join("\n");
}

function emoji(industry) {
  return ({
    "金融": "🏦", "国央企": "🚀", "外企": "🌍", "互联网": "💻",
    "制造业": "🏭", "新能源": "🔋", "生物医药": "🧪", "消费": "🛒",
    "科技": "⚙️", "传媒": "📺", "物流": "🚚", "专业服务": "📋",
    "其他": "📦",
  })[industry] || "📌";
}

// ——————————— ③ 图片生成（纯 Pillow，不调 API） ———————————
function generateCover({ date, total, noTest, picks }) {
  // 用 Node.js 直接生成 SVG → 用 sharp/纯 SVG 文件，或用 Python Pillow
  // 这里直接落一个 SVG（无外部依赖），再标注 PNG 路径，PNG 留给后续手动导出或 sharp
  const svg = makeCoverSVG({ date, total, noTest, picks });
  fs.writeFileSync(path.join(OUT, "01_cover.svg"), svg, "utf8");
  // 同步写一段说明文件
  fs.writeFileSync(
    path.join(OUT, "README.txt"),
    [
      "小红书图文（2026-09-23）",
      "",
      "封面图源：01_cover.svg（3:4 竖版 1080×1440，可用浏览器直接截图导出 PNG，或用 sharp/Pillow 渲染）",
      "正文截图：02_segments.txt（段落式，便于切成 4-6 张图文素材）",
      "数据明细：03_data.json（含 topN 公司清单、亮点、原始文案）",
      "完整文案：04_caption.txt（直接粘到小红书发布框即可）",
    ].join("\n"),
    "utf8",
  );
}

function makeCoverSVG({ date, total, noTest, picks }) {
  const top3 = picks.slice(0, 3);
  const lines = top3
    .map((c, i) => `<text x="80" y="${680 + i * 130}" font-size="56" font-weight="700" fill="#FFFFFF" font-family="PingFang SC, sans-serif">${i + 1}. ${escapeXml(c.company)} · ${escapeXml(c._highlight)}</text>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B4A"/>
      <stop offset="100%" stop-color="#E55A3C"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1440" fill="url(#bg)"/>
  <rect x="40" y="40" width="1000" height="1360" rx="48" fill="rgba(255,255,255,0.08)"/>

  <text x="80" y="180" font-size="64" font-weight="900" fill="#FFFFFF" font-family="PingFang SC, sans-serif">校招喵 · 每日新增</text>
  <text x="80" y="280" font-size="56" font-weight="700" fill="#FFFFFF" font-family="PingFang SC, sans-serif">${date}，家人们慌了！</text>
  <text x="80" y="360" font-size="48" font-weight="600" fill="#FFE3D8" font-family="PingFang SC, sans-serif">昨天校招喵新收录 ${total} 条公告</text>
  <text x="80" y="430" font-size="48" font-weight="600" fill="#FFE3D8" font-family="PingFang SC, sans-serif">${noTest} 条明确免笔试</text>

  <line x1="80" y1="500" x2="1000" y2="500" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="3"/>

  <text x="80" y="580" font-size="44" font-weight="600" fill="#FFFFFF" font-family="PingFang SC, sans-serif">今日代表企业</text>
  ${lines}

  <rect x="80" y="1180" width="920" height="180" rx="32" fill="rgba(255,255,255,0.12)"/>
  <text x="120" y="1250" font-size="44" font-weight="700" fill="#FFFFFF" font-family="PingFang SC, sans-serif">校招喵 | 校招网申表</text>
  <text x="120" y="1310" font-size="36" font-weight="500" fill="#FFE3D8" font-family="PingFang SC, sans-serif">公司+投递入口+截止日期 · 一键投递</text>
</svg>`;
}

function escapeXml(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[m]);
}

// ——————————— ④ 段落式正文（直接粘到小红书） ———————————
function writeSegmentsText({ total, noTest, byIndustry, topN }) {
  const segments = [
    `① 9月23日，家人们慌了！`,
    ``,
    `② 昨天校招喵新收录 ${total} 条校招公告，其中 ${noTest} 条免笔试。`,
    `板块分布：${byIndustry.map((b) => `${b.industry}${b._count}家`).join(" / ")}。`,
    ``,
    `③ 分板块盘点（每家跟一个亮点）：`,
  ];
  const order = ["金融", "国央企", "外企", "互联网", "制造业", "新能源", "生物医药", "消费"];
  for (const ind of order) {
    const c = topN.find((j) => j.industry === ind);
    if (c) segments.push(`  ${emoji(c.industry)} ${c.industry} | ${c.company}（${c._highlight || "在招"}）`);
  }
  segments.push("");
  segments.push(`④ 信息差焦虑：岗位散在公众号/官网/校招群，自己找必漏。`);
  segments.push("");
  segments.push(`⑤ 我整理进【校招喵 | 校招网申表】，公司 + 投递入口 + 截止日期一键看，喵一眼小程序直接投。`);
  segments.push("");
  segments.push(`#27届秋招 #秋招信息差 #校招喵 #应届生 #求职 #内推码`);
  return segments.join("\n");
}

// ——————————— 主 ———————————
(async () => {
  const jobs = await fetchTodayJobs();
  const total = jobs.length;
  const noTest = jobs.filter((j) => j.noWrittenTest === "true").length;
  const byIndustryRaw = {};
  for (const j of jobs) byIndustryRaw[j.industry] = (byIndustryRaw[j.industry] || 0) + 1;
  const byIndustry = Object.entries(byIndustryRaw)
    .map(([industry, _count]) => ({ industry, _count }))
    .sort((a, b) => b._count - a._count);

  const order = ["金融", "国央企", "外企", "互联网", "制造业", "新能源", "生物医药", "消费"];
  const topN = pickByIndustry(jobs, order, 1);
  for (const c of topN) c._highlight = buildHighlight(c);

  const caption = buildCaption({ total, noTest, byIndustry, topN });
  fs.writeFileSync(path.join(OUT, "04_caption.txt"), caption, "utf8");
  fs.writeFileSync(
    path.join(OUT, "02_segments.txt"),
    writeSegmentsText({ total, noTest, byIndustry, topN }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT, "03_data.json"),
    JSON.stringify(
      {
        date: "2026-09-23",
        total,
        noTest,
        byIndustry,
        topN: topN.map((c) => ({
          company: c.company,
          industry: c.industry,
          locations: c.locations,
          endDate: c.endDate,
          noWrittenTest: c.noWrittenTest,
          roles: c.roles,
          highlight: c._highlight,
        })),
        caption,
      },
      null,
      2,
    ),
    "utf8",
  );
  generateCover({ date: "9月23日", total, noTest, picks: topN });
  await prisma.$disconnect();
  console.log("OK →", OUT);
  console.log(`总 ${total} / 免笔试 ${noTest}`);
  console.log("代表企业:", topN.map((c) => `${c.industry}:${c.company}`).join(" / "));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});