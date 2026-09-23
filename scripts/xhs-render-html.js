// 把 /tmp/xhs-screens/*.html 用 playwright 加载成截图（page.setContent + 等动画稳定）
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const SRC = "/tmp/xhs-screens";
const OUT = path.resolve(__dirname, "..", "outputs", "xhs", "2026-09-23", "screens");
fs.mkdirSync(OUT, { recursive: true });

// 清空旧图
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

const targets = [
  { name: "01_home.png", file: "home.html" },
  { name: "02_exam.png", file: "_exam.html" },
  { name: "03_referral.png", file: "_referral-codes.html" },
  { name: "04_vip.png", file: "_vip.html" },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const t of targets) {
    const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const html = fs.readFileSync(path.join(SRC, t.file), "utf8");
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, t.name), fullPage: false });
    const sz = fs.statSync(path.join(OUT, t.name)).size;
    console.log(`snap ${t.name} ${sz}B`);
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });