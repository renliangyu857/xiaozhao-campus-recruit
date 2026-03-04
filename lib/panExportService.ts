import type { PanFileItem, PanStats } from "./types";
import { PAN_SHARE_INFO } from "./panMaterials";

export interface PanExportResult {
  items: PanFileItem[];
  stats: PanStats;
  fromExport: boolean;
}

const DEFAULT_STATS: PanStats = {
  totalSize: "0",
  fileCount: 0,
  lastUpdated: "-",
};

export async function loadPanExport(): Promise<PanExportResult> {
  if (typeof window === "undefined") {
    return { items: [], stats: DEFAULT_STATS, fromExport: false };
  }
  try {
    const txtRes = await fetch("/pan-export.txt", { cache: "no-store" });
    if (txtRes.ok) {
      const raw = await txtRes.text();
      const parsed = parseBaiduTxtExport(raw);
      const items: PanFileItem[] = parsed.map((p, i) => ({
        id: `pan-${i}`,
        displayId: i,
        name: p.name,
        path: p.path,
        format: p.format,
        shareUrl: PAN_SHARE_INFO.shareUrl,
        extractCode: PAN_SHARE_INFO.extractCode,
      }));
      return {
        items,
        stats: { totalSize: "-", fileCount: items.length, lastUpdated: new Date().toISOString().slice(0, 7) },
        fromExport: true,
      };
    }
  } catch {}
  try {
    const res = await fetch("/pan-export.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const list = data?.items ?? [];
      const items: PanFileItem[] = list.map((row: { name: string; path: string; size?: string; format?: string; displayId?: number }, i: number) => ({
        id: `pan-${row.displayId ?? i}`,
        displayId: row.displayId ?? i,
        name: row.name,
        path: row.path,
        size: row.size,
        format: row.format,
        shareUrl: PAN_SHARE_INFO.shareUrl,
        extractCode: PAN_SHARE_INFO.extractCode,
      }));
      const stats = data?.stats ?? DEFAULT_STATS;
      return { items, stats: { ...DEFAULT_STATS, ...stats }, fromExport: true };
    }
  } catch {}
  return { items: [], stats: DEFAULT_STATS, fromExport: false };
}

function parseBaiduTxtExport(text: string): { path: string; name: string; format: string }[] {
  const items: { path: string; name: string; format: string }[] = [];
  const lines = text.split(/\r?\n/);
  const stack: string[] = [];
  const fileExtRe = /\.([a-zA-Z0-9]+)$/;
  for (const line of lines) {
    // 查找 ├── 或 └──
    let idx = line.indexOf("├──");
    if (idx === -1) {
      idx = line.indexOf("└──");
    }
    if (idx === -1) continue;
    const prefix = line.slice(0, idx);
    const name = line.slice(idx + 3).trim(); // 3 is length of "├──" or "└──"
    if (!name) continue;

    // 计算深度：根据前缀中的 │ 数量，同时考虑空格缩进
    const depth = (prefix.match(/[│\u2502]/g) || []).length + Math.floor((prefix.match(/  /g) || []).length / 2);

    while (stack.length > depth) stack.pop();
    const path = stack.join(" / ");
    const extMatch = name.match(fileExtRe);
    if (extMatch) {
      items.push({
        path: path || "(根)",
        name,
        format: extMatch[1].toLowerCase(),
      });
    }
    stack.push(name);
  }
  return items;
}
