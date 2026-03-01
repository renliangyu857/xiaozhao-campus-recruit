import type { PanFileItem, PanStats } from "./types";

const SHARE_URL = "https://pan.baidu.com/s/1_udWahpE9WUwA3xT_Il2XQ?pwd=yjdf";
const EXTRACT_CODE = "yjdf";

export const PAN_STATS: PanStats = {
  totalSize: "7.95TB",
  fileCount: 385259,
  lastUpdated: "2026-3",
};

export const PAN_FILTER_TAGS = [
  "国企", "北森", "牛客", "行测", "银行", "建行", "四大", "三桶油", "中信", "邮政",
  "中国烟草", "电网", "中车", "中广核", "茅台", "互联网", "浦发银行", "国家能源", "农业银行", "丝芙兰", "安永",
];

function item(
  displayId: number,
  name: string,
  path: string,
  size: string,
  format: string
): PanFileItem {
  return {
    id: `pan-${displayId}`,
    displayId,
    name,
    path,
    size,
    format,
    shareUrl: SHARE_URL,
    extractCode: EXTRACT_CODE,
  };
}

export const PAN_MATERIALS_LIST: PanFileItem[] = [
  item(297532, "资料分析与图表分析类题型解题技巧讲....pdf", "国央企秋招 / 2024年十大热门题库更新中 / 02、智鼎汇总 / 智鼎题库题型汇总和解析 / 资料分析与图表", "671KB", "pdf"),
  item(43732, "丝芙兰校招求职大礼包.pdf", "24快消 / 快消题库-2 / 2023快消合集(17家持续更新中) / 全球500强快消公司 / 快消大礼包 / 丝芙兰校招", "1.3MB", "pdf"),
  item(128901, "行政职业能力测验核心考点.pdf", "24中国烟草笔试资料 / 中国烟草 / 【4】Yancao公司2024年招聘笔试练习题库(公基+行测+申论)/新版", "793B", "pdf"),
  item(88542, "群面技巧及注意事项.docx", "25届国家能源 / 国家能源面试 / 面试理论/ 【优先推荐】结构化面试基础理论套餐/课件04.理论课程-认", "14.6MB", "docx"),
  item(200156, "推理测验D第1套.mp4", "各类笔试题库 / 互联网题库-1 / 02互联网汇总 / 33、其他公司资料整理及面试资料/ 【互联网面试题库】", "3.1MB", "mp4"),
  item(310022, "英语部分专练题库(4-3-4).pdf", "25届浦发银行 / 2-浦发银行招聘必刷专练题库(分科目) / -3-英语部分专练题库/4-3-4-英语部分专练题", "7.5MB", "pdf"),
  item(189034, "各大行历年面试真题库及精华知识讲义.pdf", "银行笔试面试资料 / 各银行资料 / 银行面试资料汇总 / 各大行历年面试真题库及精华知识讲义 / 银行简历", "2.2MB", "pdf"),
  item(45678, "2024年中国农业银行秋招笔试真题汇总.pdf", "24银行招聘/往年银行招聘资料等多个文件/ 2024秋招【目前最新】 / 24农业银行资料/ 2024年中国农", "5.8MB", "pdf"),
  item(267801, "推理测验D第1套.mp4", "各类笔试题库 / 四大题库1 / EY安永 / 【05】推理测验D/推理测验D第1套.mp4", "3.1MB", "mp4"),
  item(156234, "国家电网行测专项训练.pdf", "国企央企秋招 / 电网 / 国家电网2024校招 / 行测专项 / 国家电网行测", "4.2MB", "pdf"),
  item(99812, "中国烟草行测+公基模拟卷.pdf", "24中国烟草笔试资料 / 中国烟草 / 行测+公基 / 中国烟草行测+公基模拟卷", "1.8MB", "pdf"),
  item(334567, "北森题库题型解析与练习.pdf", "国央企秋招 / 2024年十大热门题库更新中 / 北森汇总 / 北森题库题型汇总和解析", "671KB", "pdf"),
  item(77890, "牛客互联网大厂笔试真题汇总.pdf", "各类笔试题库 / 互联网题库-1 / 牛客 / 互联网大厂笔试真题汇总", "6.2MB", "pdf"),
];

export const PAN_SHARE_INFO = {
  title: "笔面试资料库",
  shareUrl: SHARE_URL,
  extractCode: EXTRACT_CODE,
};
