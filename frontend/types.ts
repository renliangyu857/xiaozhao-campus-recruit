export enum Industry {
  INTERNET = '互联网',
  FINANCE = '金融',
  SOE = '国央企',
  FOREIGN = '外企',
  MANUFACTURING = '制造业',
  OTHER = '其他',
}

export enum RecruitType {
  FALL = '秋招',
  SPRING = '春招',
  INTERN = '实习',
}

export enum ApplyStatus {
  NOT_APPLIED = '未投递',
  APPLIED = '已投递',
  WRITTEN_TEST = '已笔试',
  INTERVIEW = '已面试',
  OFFER = '已通过',
  REJECTED = '已挂',
}

export interface Job {
  id: string;
  company: string;
  industry: Industry;
  type: RecruitType;
  locations: string[];
  status: ApplyStatus;
  startDate: string; // ISO Date
  endDate: string; // ISO Date
  noWrittenTest: boolean;
  roles: string[]; // e.g. ["Frontend", "Backend"]
  announcementLink: string;
  applyLink: string;
  remark: string;
  batch: '25' | '26';
  salary: string;
  isNew?: boolean; // For "New Today"
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  isVip: boolean;
  vipExpiry?: string;
  queryCount: number; // To track free usage
  remainingFreeQueries?: number; // 后端返回，VIP 时可能不存在/为空
}

export interface FilterState {
  industry: Industry | 'ALL';
  type: RecruitType | 'ALL';
  location: string;
  deadlineDays: '3' | '7' | '15' | 'ALL';
  roles: string; // Comma separated input
}

export interface VipPlan {
  id: string;
  name: string;
  durationLabel: string;
  price: number;
  originalPrice: number;
  tag?: string;
}