/**
 * Honeytoken (蜜罐) 系统
 * 用于识别和溯源数据爬取
 *
 * 原理：
 * 1. 在真实数据中混入虚假的"水印职位"
 * 2. 每个用户看到的水印职位不同（基于 userId 计算）
 * 3. 如果竞争对手展示了这些水印职位，即可溯源到具体用户
 */

import { createHash } from "crypto";

// 虚拟职位模板
const HONEY_JOB_TEMPLATES = [
  {
    id: -1,
    title: "资深架构师（AI方向）",
    company: "未来科技",
    location: "北京·海淀",
    salary: "80-120K·16薪",
    tags: ["AI", "架构", "大模型"],
    description: "负责公司核心AI产品的架构设计与技术规划...",
    url: "https://example.com/job/honey1",
    source: "内部推荐",
    createdAt: new Date().toISOString(),
  },
  {
    id: -2,
    title: "区块链开发专家",
    company: "链上未来",
    location: "上海·浦东",
    salary: "60-90K·15薪",
    tags: ["区块链", "Web3", "Rust"],
    description: "参与公链核心模块的开发与优化...",
    url: "https://example.com/job/honey2",
    source: "猎头",
    createdAt: new Date().toISOString(),
  },
  {
    id: -3,
    title: "量子计算研究员",
    company: "量子实验室",
    location: "深圳·南山",
    salary: "100-150K·18薪",
    tags: ["量子计算", "Python", "科研"],
    description: "从事量子算法研究与实现...",
    url: "https://example.com/job/honey3",
    source: "校园招聘",
    createdAt: new Date().toISOString(),
  },
];

/**
 * 根据用户ID选择水印职位
 * 确保同一用户始终看到相同的水印职位
 */
export function selectHoneyJobs(userId: string, count: number = 1): typeof HONEY_JOB_TEMPLATES {
  const hash = createHash("sha256").update(userId).digest("hex");
  const indices: number[] = [];

  for (let i = 0; i < count; i++) {
    const index = parseInt(hash.slice(i * 2, i * 2 + 2), 16) % HONEY_JOB_TEMPLATES.length;
    indices.push(index);
  }

  return indices.map((idx) => ({
    ...HONEY_JOB_TEMPLATES[idx],
    // 添加用户专属标记（隐藏在数据中）
    _honey: encodeHoneyMarker(userId, idx),
  }));
}

/**
 * 编码用户标记到职位数据中
 * 使用零宽字符或特殊编码
 */
function encodeHoneyMarker(userId: string, jobIndex: number): string {
  // 将 userId 和 jobIndex 编码为不可见标记
  const data = `${userId}:${jobIndex}`;
  return Buffer.from(data).toString("base64url");
}

/**
 * 解码标记，溯源到用户
 */
export function decodeHoneyMarker(marker: string): { userId: string; jobIndex: number } | null {
  try {
    const decoded = Buffer.from(marker, "base64url").toString();
    const [userId, jobIndex] = decoded.split(":");
    return { userId, jobIndex: parseInt(jobIndex) };
  } catch {
    return null;
  }
}

/**
 * 在文本中嵌入隐形水印
 * 使用零宽字符（Zero-Width Characters）
 */
export function embedInvisibleWatermark(text: string, userId: string): string {
  // 零宽字符映射
  const ZERO_WIDTH = {
    "0": "\u200B", // 零宽空格
    "1": "\u200C", // 零宽非连接符
    "2": "\u200D", // 零宽连接符
    "3": "\u2060", // 零宽非断空格
    "4": "\uFEFF", // 零宽非断空格 (BOM)
  };

  // 将 userId 哈希转为二进制
  const hash = createHash("sha256").update(userId).digest("hex").slice(0, 8);
  const binary = parseInt(hash, 16).toString(2).padStart(32, "0");

  // 将二进制转为零宽字符（每2位一组）
  let watermark = "";
  for (let i = 0; i < binary.length; i += 2) {
    const bits = binary.slice(i, i + 2);
    watermark += ZERO_WIDTH[bits as keyof typeof ZERO_WIDTH] || ZERO_WIDTH["0"];
  }

  // 将水印嵌入到文本开头（人眼不可见）
  return watermark + text;
}

/**
 * 从文本中提取隐形水印
 */
export function extractInvisibleWatermark(text: string): string | null {
  const ZERO_WIDTH_CHARS = ["\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF"];
  const REVERSE_MAP: Record<string, string> = {
    "\u200B": "0",
    "\u200C": "1",
    "\u200D": "2",
    "\u2060": "3",
    "\uFEFF": "4",
  };

  let binary = "";
  for (const char of text) {
    if (ZERO_WIDTH_CHARS.includes(char)) {
      binary += REVERSE_MAP[char];
    } else if (binary.length > 0) {
      // 遇到非零宽字符且已收集到水印，停止
      break;
    }
  }

  if (binary.length < 16) return null;

  // 将二进制转回哈希
  const hash = parseInt(binary, 2).toString(16).padStart(8, "0");
  return hash;
}

/**
 * 混合真实数据和蜜罐数据
 * @param realJobs 真实职位列表
 * @param userId 当前用户ID
 * @param insertPositions 插入位置（默认随机）
 */
type HoneyJob = typeof HONEY_JOB_TEMPLATES[0] & { id: number | string };

export function mixWithHoneyJobs<T extends { id: number | string }>(
  realJobs: T[],
  userId: string,
  insertPositions?: number[]
): (T | HoneyJob)[] {
  const honeyJobs = selectHoneyJobs(userId, 1);
  const result: (T | HoneyJob)[] = [...realJobs];

  // 默认插入到第 3 个位置（不明显但会被抓取）
  const positions = insertPositions || [Math.min(3, realJobs.length)];

  honeyJobs.forEach((honey, idx) => {
    const pos = positions[idx] ?? result.length;
    // 创建唯一 ID（负数，便于识别）
    const uniqueHoney: HoneyJob = {
      ...honey,
      id: -Math.abs(parseInt(userId.slice(-6)) + idx),
    };
    result.splice(pos, 0, uniqueHoney);
  });

  return result;
}

/**
 * 检查数据是否包含蜜罐
 * 用于发现竞争对手的爬取行为
 */
export function detectHoneyLeak(data: unknown): {
  leaked: boolean;
  userId?: string;
  confidence: number;
} {
  const jsonStr = JSON.stringify(data);

  // 1. 检查显式标记
  const honeyMatch = jsonStr.match(/_honey":"([^"]+)"/);
  if (honeyMatch) {
    const decoded = decodeHoneyMarker(honeyMatch[1]);
    if (decoded) {
      return {
        leaked: true,
        userId: decoded.userId,
        confidence: 1.0,
      };
    }
  }

  // 2. 检查隐形水印
  const watermark = extractInvisibleWatermark(jsonStr);
  if (watermark) {
    return {
      leaked: true,
      confidence: 0.8,
    };
  }

  // 3. 检查虚拟公司名
  const honeyCompanies = ["未来科技", "链上未来", "量子实验室"];
  for (const company of honeyCompanies) {
    if (jsonStr.includes(company)) {
      return {
        leaked: true,
        confidence: 0.9,
      };
    }
  }

  return { leaked: false, confidence: 0 };
}
