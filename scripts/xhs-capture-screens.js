// 用 playwright 在校招喵生产站抓 6 张宣传截图
// 输出：outputs/xhs/2026-09-23/screens/{01_home.png, 02_company_detail.png, 03_progress.png, 04_exam.png, 05_referral.png, 06_miniapp.png}
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const OUT = path.resolve(__dirname, "..", "outputs", "xhs", "2026-09-23", "screens");
fs.mkdirSync(OUT, { recursive: true });

// 优先 cookie jar（来自 /tmp/mvp_cookies.txt），无 cookie 走未登录视图
const COOKIE_JAR = "/tmp/mvp_cookies.txt";
function parseCookies(jarPath) {
  if (!fs.existsSync(jarPath)) return [];
  return fs.readFileSync(jarPath, "utf8").split("\n")
    .map(l => l.replace(/^#HttpOnly_/, ""))
    .filter(l => l.includes("campus_") && !l.startsWith("#"))
    .map(l => l.split("\t"))
    .filter(p => p.length >= 7)
    .map(p => ({ name: p[5], value: p[6], domain: ".xiaozhaomiao.cn", path: "/" }));
}

const BASE = process.env.VIDEO_SITE_URL || process.env.XHS_LOCAL_URL || "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  });
  const cookies = parseCookies(COOKIE_JAR);
  if (cookies.length) await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  async function snap(file, prep) {
    await prep();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, file), fullPage: false });
    console.log("snap →", file);
  }

  // 1 首页今日新增
  await snap("01_home.png", async () => {
    try {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector('[data-testid="job-card"]', { state: "visible", timeout: 30000 });
      const tab = page.getByRole("button", { name: /今日新增/ }).first();
      if (await tab.isVisible()) await tab.click();
      // 把过滤器面板点掉（关闭"显示已截止" / 翻页），让卡片更紧凑
      await page.waitForTimeout(2500);
      // 把卡片区滚动到首屏
      await page.evaluate(() => {
        const c = document.querySelector('[data-testid="job-card"]');
        if (c) c.scrollIntoView({ block: "start" });
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(800);
      // 放大 viewport 让截图像官网首屏
      await page.setViewportSize({ width: 540, height: 960 });
      await page.screenshot({ path: path.join(OUT, "01_home.png"), fullPage: false });
    } catch (e) {
      console.log("home fail", e.message);
    }
  });

  // 2 详情页（找第一张卡片点开）
  await snap("02_company_detail.png", async () => {
    try {
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const firstCard = page.locator('[data-testid="job-card"]').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForTimeout(2000);
      } else {
        // fallback：直接打开 /jobs/{一些 ID}
        await page.goto(`${BASE}/jobs/1`, { waitUntil: "domcontentloaded", timeout: 30000 });
      }
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log("detail fail", e.message);
    }
  });

  // 3 进度面板
  await snap("03_progress.png", async () => {
    try { await page.goto(`${BASE}/progress`, { waitUntil: "domcontentloaded", timeout: 30000 }); await page.waitForTimeout(2500); } catch (e) { console.log(e.message); }
  });

  // 4 笔面试资料
  await snap("04_exam.png", async () => {
    try { await page.goto(`${BASE}/exam`, { waitUntil: "domcontentloaded", timeout: 30000 }); await page.waitForTimeout(2500); } catch (e) { console.log(e.message); }
  });

  // 5 内推码
  await snap("05_referral.png", async () => {
    try { await page.goto(`${BASE}/referral-codes`, { waitUntil: "domcontentloaded", timeout: 30000 }); await page.waitForTimeout(2500); } catch (e) { console.log(e.message); }
  });

  // 6 会员中心（vip 页），作为小程序入口替代（喵一眼是小程序，没法在 web 截）
  await snap("06_vip.png", async () => {
    try { await page.goto(`${BASE}/vip`, { waitUntil: "domcontentloaded", timeout: 30000 }); await page.waitForTimeout(2500); } catch (e) { console.log(e.message); }
  });

  await browser.close();

  const files = fs.readdirSync(OUT).filter(f => f.endsWith(".png"));
  console.log("捕获到", files.length, "张截图");
  for (const f of files) {
    const p = path.join(OUT, f);
    const sz = fs.statSync(p).size;
    console.log(" ", f, sz, "bytes");
  }
})().catch((e) => { console.error(e); process.exit(1); });