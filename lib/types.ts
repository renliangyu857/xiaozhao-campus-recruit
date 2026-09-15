export enum Industry {
  INTERNET = "互联网",
  FINANCE = "金融",
  SOE = "国央企",
  FOREIGN = "外企",
  MANUFACTURING = "制造业",
  OTHER = "其他",
}

export enum RecruitType {
  FALL = "秋招",
  SPRING = "春招",
  INTERN = "实习",
  OTHER = "其他",
  OVERSEAS = "海外",
  PARTIAL = "部分",
}

export enum ApplyStatus {
  NOT_APPLIED = "未投递",
  APPLIED = "已投递",
  WRITTEN_TEST = "已笔试",
  INTERVIEW = "已面试",
  OFFER = "已通过",
  REJECTED = "已挂",
}

export interface Job {
  id: string;
  company: string;
  industry: Industry | string;
  type: RecruitType | string;
  locations: string[];
  status: ApplyStatus | string;
  startDate: string;
  endDate: string;
  noWrittenTest: boolean;
  roles: string[];
  announcementLink: string;
  applyLink: string;
  remark: string;
  batch: "25" | "26";
  salary: string;
  isNew?: boolean;
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  isVip: boolean;
  isTrial?: boolean;
  vipExpiry?: string;
  canDownloadMaterials?: boolean;
  queryCount: number;
  remainingFreeQueries?: number;
}

export interface VipDashboard {
  isVip: boolean;
  planId?: string;
  isTrial?: boolean;
  vipExpiry?: string;
  referralCodeCount: number;
  savedQueryCount: number;
  totalValidDays?: number; // 累计有效会员天数
  canDownloadMaterials?: boolean; // 是否有笔面试资料下载权限（累计>=90天）
}

export interface FilterState {
  industry: Industry | "ALL";
  type: RecruitType | "ALL";
  location: string;
  deadlineDays: "3" | "7" | "15" | "ALL";
  roles: string;
}

export interface VipPlan {
  id: string;
  name: string;
  durationLabel: string;
  price: number;
  originalPrice: number;
  tag?: string;
}

export interface PanFileItem {
  id: string;
  displayId?: number;
  name: string;
  category?: string;
  path: string;
  size?: string;
  format?: string;
  shareUrl: string;
  extractCode: string;
}

export interface PanStats {
  totalSize: string;
  fileCount: number;
  lastUpdated: string;
}
