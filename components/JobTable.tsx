"use client";

import type { Job, ApplyStatus } from "@/lib/types";
import { MapPin, Calendar, ExternalLink, ChevronDown, Star, Sparkles } from "lucide-react";

interface JobTableProps {
  jobs: Job[];
  onStatusChange: (id: string, status: ApplyStatus) => void;
  onToggleFavorite?: (jobId: string) => void;
  favoriteIds: Set<string>;
}

export function JobTable({ jobs, onStatusChange, onToggleFavorite, favoriteIds }: JobTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "未投递": return "bg-slate-100 text-slate-500 border-slate-200";
      case "已投递": return "bg-blue-50 text-blue-600 border-blue-200";
      case "已笔试": return "bg-purple-50 text-purple-600 border-purple-200";
      case "已面试": return "bg-amber-50 text-amber-600 border-amber-200";
      case "已通过": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "已挂": return "bg-rose-50 text-rose-600 border-rose-200";
      default: return "bg-slate-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "已通过": return "🎉";
      case "已挂": return "💔";
      case "已面试": return "🗣️";
      case "已笔试": return "📝";
      case "已投递": return "📤";
      default: return "📋";
    }
  };

  const roles = (job: Job) => Array.isArray(job.roles) ? job.roles : [];
  const locations = (job: Job) => Array.isArray(job.locations) ? job.locations : [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-xl border border-slate-200" data-testid="job-table">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              公司名称
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              招聘公告
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              工作城市
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              截止时间
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              届数
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              行业/类型
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              薪资
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              投递进度
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {job.isNew && (
                    <div className="flex-shrink-0">
                      <div className="bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                        <Sparkles size={10} />
                        NEW
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{job.company}</span>
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onToggleFavorite(job.id); }}
                        className={`p-1 rounded transition-colors ${
                          favoriteIds.has(job.id)
                            ? "text-amber-500"
                            : "text-slate-300 hover:text-amber-400"
                        }`}
                        title={favoriteIds.has(job.id) ? "取消收藏" : "收藏"}
                      >
                        <Star size={14} className={favoriteIds.has(job.id) ? "fill-amber-500" : ""} />
                      </button>
                    )}
                  </div>
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="max-w-xs truncate text-sm font-medium text-slate-700">
                  {roles(job).join(", ")}
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={12} className="text-[#FF6B4A]" />
                  <span className="truncate max-w-[120px]">{locations(job).join(" ")}</span>
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={12} className="text-[#0D7377]" />
                  <span>{job.endDate}</span>
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1">
                  {job.batch && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0D7377]/10 text-[#0D7377] border border-[#0D7377]/10">
                      {job.batch}
                    </span>
                  )}
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                    {job.industry}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0D7377]/10 text-[#0D7377] border border-[#0D7377]/10">
                    {job.type}
                  </span>
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="text-sm font-bold bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] bg-clip-text text-transparent">
                  {job.salary}
                </div>
                {job.noWrittenTest && (
                  <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-1">
                    免笔试
                  </div>
                )}
              </td>

              <td className="px-4 py-4">
                <div className="relative inline-block w-32">
                  <select
                    value={job.status}
                    onChange={(e) => onStatusChange(job.id, e.target.value as ApplyStatus)}
                    className={`appearance-none w-full pl-8 pr-7 py-2 rounded-xl text-xs font-semibold border-2 focus:ring-2 focus:ring-[#FF6B4A]/20 focus:border-[#FF6B4A] focus:outline-none transition-all cursor-pointer ${getStatusColor(job.status as string)}`}
                  >
                    {["未投递", "已投递", "已笔试", "已面试", "已通过", "已挂"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm">
                    {getStatusIcon(job.status as string)}
                  </span>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-50 pointer-events-none" />
                </div>
              </td>

              <td className="px-4 py-4">
                <div className="flex gap-1.5">
                  <a
                    href={job.announcementLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200 hover:border-slate-300"
                  >
                    简章
                  </a>
                  <a
                    href={job.applyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-slate-800 to-slate-700 hover:from-[#FF6B4A] hover:to-[#FF8F7A] transition-all shadow-md hover:shadow-lg"
                  >
                    去投递
                    <ExternalLink size={10} />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
