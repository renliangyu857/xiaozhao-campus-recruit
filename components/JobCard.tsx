"use client";

import type { Job, ApplyStatus } from "@/lib/types";
import { MapPin, Calendar, ExternalLink, ChevronDown, Star, Sparkles } from "lucide-react";

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: ApplyStatus) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (jobId: string) => void;
}

export function JobCard({ job, onStatusChange, isFavorite, onToggleFavorite }: JobCardProps) {
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

  const roles = Array.isArray(job.roles) ? job.roles : [];
  const locations = Array.isArray(job.locations) ? job.locations : [];

  return (
    <div
      className="group bg-white rounded-2xl p-5 hover:shadow-xl transition-all duration-500 border border-transparent hover:border-[#FF6B4A]/10 relative overflow-hidden"
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      data-testid="job-card"
    >
      {/* 悬停时的渐变边框效果 */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,107,74,0.03) 0%, rgba(13,115,119,0.03) 100%)',
        }}
      />

      {/* NEW 标签 */}
      {job.isNew && (
        <div className="absolute top-0 left-0">
          <div className="bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white text-[10px] font-bold px-3 py-1.5 rounded-br-xl shadow-sm flex items-center gap-1">
            <Sparkles size={10} />
            NEW
          </div>
        </div>
      )}

      {/* 收藏按钮 */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFavorite(job.id); }}
          className={`absolute top-3 right-3 p-2 rounded-xl transition-all duration-300 ${
            isFavorite
              ? "bg-amber-50 text-amber-500 shadow-md"
              : "text-slate-300 hover:bg-slate-50 hover:text-amber-400"
          }`}
          title={isFavorite ? "取消收藏" : "收藏"}
        >
          <Star size={18} className={isFavorite ? "fill-amber-500" : ""} />
        </button>
      )}

      <div className="flex flex-col gap-4 relative">
        {/* 头部信息 */}
        <div className="flex justify-between items-start pl-1">
          <div className="space-y-2 flex-1 pr-12">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-[#FF6B4A] transition-colors">
                {job.company}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/50">
                {job.industry}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#0D7377]/10 text-[#0D7377] border border-[#0D7377]/10">
                {job.type}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700">{roles.join(", ")}</p>
          </div>
          <div className="text-right">
            <span className="block text-lg font-bold bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] bg-clip-text text-transparent">
              {job.salary}
            </span>
            {job.noWrittenTest && (
              <span className="inline-block mt-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                免笔试
              </span>
            )}
          </div>
        </div>

        {/* 地点和截止时间 */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pl-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <MapPin size={12} className="text-[#FF6B4A]" />
            <span>{locations.join(" ")}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <Calendar size={12} className="text-[#0D7377]" />
            <span>截止: {job.endDate}</span>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-4 mt-1">
          {/* 状态选择器 */}
          <div className="relative inline-block w-36 sm:w-44">
            <select
              value={job.status}
              onChange={(e) => onStatusChange(job.id, e.target.value as ApplyStatus)}
              className={`appearance-none w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold border-2 focus:ring-2 focus:ring-[#FF6B4A]/20 focus:border-[#FF6B4A] focus:outline-none transition-all cursor-pointer ${getStatusColor(job.status as string)}`}
            >
              {["未投递", "已投递", "已笔试", "已面试", "已通过", "已挂"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {/* 状态图标 */}
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">
              {getStatusIcon(job.status as string)}
            </span>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-50 pointer-events-none" />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <a
              href={job.announcementLink}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200 hover:border-slate-300"
            >
              简章
            </a>
            <a
              href={job.applyLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-slate-800 to-slate-700 hover:from-[#FF6B4A] hover:to-[#FF8F7A] transition-all shadow-md hover:shadow-lg group/btn"
            >
              去投递
              <ExternalLink size={12} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
