"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "./hero-styles.css";
import { useRouter } from "next/navigation";
import { Industry, RecruitType, ApplyStatus } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { fetchJobsPage, updateJobStatus, type PageResult } from "@/lib/jobService";
import { ApiError } from "@/lib/apiClient";
import { getFavoriteJobIds, toggleFavoriteJobId } from "@/lib/favoriteService";
import { useUser } from "@/components/UserContext";
import type { Job, FilterState } from "@/lib/types";
import { Search, Filter, Lock, Sparkles, X, MapPin, Briefcase, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useRef } from "react";

export default function HomePage() {
  const router = useRouter();
  const { user, onLogin } = useUser();
  const [filters, setFilters] = useState<FilterState>({
    industry: "ALL",
    type: "ALL",
    location: "",
    deadlineDays: "ALL",
    roles: "",
  });
  const [onlyNewToday, setOnlyNewToday] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(30);
  const [pageResult, setPageResult] = useState<PageResult<Job> | null>(null);
  const [displayJobs, setDisplayJobs] = useState<Job[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVipExpiringSoon, setShowVipExpiringSoon] = useState(false);
  const [showVipExpired, setShowVipExpired] = useState(false);
  const hasAutoLoaded = useRef(false);

  // 检查VIP状态，显示到期提醒
  useEffect(() => {
    if (!user?.isVip || !user?.vipExpiry) return;
    const expiryDate = new Date(user.vipExpiry);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 检查是否已经显示过提醒（使用sessionStorage避免重复弹出）
    const hasShownExpiring = sessionStorage.getItem(`vip_expiring_${user.vipExpiry}`);
    const hasShownExpired = sessionStorage.getItem(`vip_expired_${user.vipExpiry}`);

    if (diffDays <= 1 && diffDays > 0 && !hasShownExpiring) {
      setShowVipExpiringSoon(true);
      sessionStorage.setItem(`vip_expiring_${user.vipExpiry}`, "1");
    } else if (diffDays <= 0 && !hasShownExpired) {
      setShowVipExpired(true);
      sessionStorage.setItem(`vip_expired_${user.vipExpiry}`, "1");
    }
  }, [user?.isVip, user?.vipExpiry]);

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds(new Set());
      hasAutoLoaded.current = false;
      return;
    }
    setFavoriteIds(getFavoriteJobIds(user.id));

    // VIP 用户登录后自动加载职位列表（只触发一次）
    if (user.isVip && !hasAutoLoaded.current) {
      hasAutoLoaded.current = true;
      // 使用 setTimeout 避免在 render 阶段调用 setState
      setTimeout(() => {
        loadPage(0, true, false);
      }, 0);
    }
  }, [user?.id, user?.isVip]);

  const handleToggleFavorite = (jobId: string) => {
    if (!user?.id) return;
    setFavoriteIds(toggleFavoriteJobId(user.id, jobId));
  };

  const listToShow = showFavoritesOnly ? displayJobs.filter((j) => favoriteIds.has(j.id)) : displayJobs;

  const loadPage = async (page: number, resetPage: boolean, onlyNewTodayOverride?: boolean) => {
    if (!user) {
      alert("请先登录后操作");
      return;
    }
    // 非VIP用户直接显示付费墙
    if (!user.isVip) {
      setShowPaywall(true);
      return;
    }
    const useOnlyNewToday = onlyNewTodayOverride ?? onlyNewToday;
    setShowPaywall(false);
    setLoading(true);
    try {
      const result = await fetchJobsPage(filters, useOnlyNewToday, page, pageSize);
      setPageResult(result);
      setDisplayJobs(result.content ?? []);
      setCurrentPage(result.number);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        alert("请先登录后操作");
        setDisplayJobs([]);
        setPageResult(null);
      } else {
        alert(((e as ApiError)?.body as { message?: string })?.message ?? (e as Error)?.message ?? "查询失败");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // 重置今日新增和收藏过滤状态，确保查询筛选能触发搜索
    setOnlyNewToday(false);
    setShowFavoritesOnly(false);
    loadPage(0, true, false);
  };
  const handlePageChange = (newPage: number) => {
    if (newPage < 0) return;
    if (pageResult?.hasNext === false && newPage > currentPage) return;
    loadPage(newPage, false);
  };
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateJobStatus = async (id: string, status: ApplyStatus) => {
    if (!user) {
      alert("请先登录后操作");
      return;
    }
    try {
      await updateJobStatus(id, status);
      setDisplayJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    } catch (e) {
      alert(((e as ApiError)?.body as { message?: string })?.message ?? (e as Error)?.message ?? "更新失败");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-700"
                value={filters.industry}
                onChange={(e) => handleFilterChange("industry", e.target.value)}
              >
                <option value="ALL">所有行业</option>
                {Object.values(Industry).map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <select
                className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-700"
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                <option value="ALL">所有类型</option>
                {Object.values(RecruitType).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-700"
                value={filters.deadlineDays}
                onChange={(e) => handleFilterChange("deadlineDays", e.target.value)}
              >
                <option value="ALL">截止时间不限</option>
                <option value="3">3天内截止</option>
                <option value="7">7天内截止</option>
                <option value="15">15天内截止</option>
              </select>
              <div className="relative col-span-1">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="工作地点"
                  className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700"
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="col-span-2 md:col-span-1 rounded-lg px-4 py-2.5 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400 flex items-center justify-center gap-2"
              >
                <Search size={16} /> {loading ? "查询中..." : "查询筛选"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="岗位关键词 (逗号隔开)"
                  className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700"
                  value={filters.roles}
                  onChange={(e) => handleFilterChange("roles", e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${showFavoritesOnly ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Star size={14} className={showFavoritesOnly ? "fill-current" : ""} /> 我的收藏
              </button>
              <button
                onClick={() => {
                  const next = !onlyNewToday;
                  setOnlyNewToday(next);
                  if (user) loadPage(0, true, next);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${onlyNewToday ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Sparkles size={14} className={onlyNewToday ? "fill-current" : ""} /> 今日新增
              </button>
              {!user?.isVip && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 cursor-pointer hover:bg-amber-100" onClick={() => setShowPaywall(true)}>
                  <Lock size={12} className="inline mr-1" />
                  VIP专属功能
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{showFavoritesOnly ? "我的收藏" : "校招信息，一站搞定"}</h2>
            {pageResult && (
              <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                {showFavoritesOnly
                  ? `共 ${listToShow.length} 条`
                  : typeof pageResult.totalElements === "number"
                    ? `共找到 ${pageResult.totalElements} 条`
                    : `本页 ${displayJobs.length} 条`}
              </span>
            )}
          </div>

          {loading && user && (
            <div className="grid grid-cols-1 gap-4" aria-busy="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/3 mb-3" />
                  <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!user && displayJobs.length === 0 && (
            <div className="relative rounded-[2rem] overflow-hidden mt-6 animate-slide-up noise-overlay">
              {/* 背景渐变 */}
              <div className="absolute inset-0 gradient-mesh" />

              {/* 动态 Blob 装饰 */}
              <div className="blob blob-orange w-64 h-64 -top-20 -left-20 animate-blob" />
              <div className="blob blob-teal w-80 h-80 -bottom-32 -right-20 animate-blob" style={{ animationDelay: '-4s' }} />
              <div className="blob blob-orange w-48 h-48 top-1/2 right-1/4 animate-blob" style={{ animationDelay: '-2s', opacity: 0.2 }} />

              {/* 网格装饰 */}
              <div className="absolute inset-0 opacity-[0.015]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,107,74,0.3) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255,107,74,0.3) 1px, transparent 1px)`,
                  backgroundSize: '60px 60px'
                }}
              />

              <div className="relative z-10 p-12 md:p-20 text-center">
                {/* Logo 动画图标 */}
                <div className="relative inline-block mb-10">
                  <div className="w-28 h-28 rounded-[1.5rem] flex items-center justify-center animate-float shadow-2xl relative"
                    style={{
                      background: 'linear-gradient(135deg, #FF6B4A 0%, #E85A3A 100%)',
                      boxShadow: '0 20px 40px -10px rgba(255, 107, 74, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
                    }}
                  >
                    <span className="text-6xl">🐱</span>
                    {/* 内部光晕 */}
                    <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  </div>
                  {/* 装饰星星 */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold animate-pulse-glow"
                    style={{
                      background: 'linear-gradient(135deg, #0D7377 0%, #14A8AD 100%)',
                      boxShadow: '0 4px 12px rgba(13, 115, 119, 0.4)'
                    }}
                  >
                    ✨
                  </div>
                  {/* 浮动装饰点 */}
                  <div className="absolute -bottom-2 -left-4 w-6 h-6 rounded-full bg-amber-400 animate-float" style={{ animationDelay: '-1s' }} />
                  <div className="absolute top-0 -left-8 w-4 h-4 rounded-full bg-rose-400 animate-float" style={{ animationDelay: '-2s' }} />
                </div>

                {/* 主标题 */}
                <h1 className="text-4xl md:text-6xl font-bold mb-5 tracking-tight font-serif"
                  style={{
                    background: 'linear-gradient(135deg, #1F2937 0%, #FF6B4A 30%, #0D7377 70%, #1F2937 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 8s linear infinite'
                  }}
                >
                  校招路上，喵陪你
                </h1>

                {/* 副标题 */}
                <p className="text-lg md:text-xl mb-2 max-w-xl mx-auto text-[#4B5563] font-medium">
                  全网校招信息聚合 · 投递进度管理 · 笔面资料库
                </p>
                <p className="text-sm mb-12 max-w-md mx-auto text-[#9CA3AF]">
                  新用户登录即送 <span className="font-bold text-[#FF6B4A]">2天VIP</span> 体验
                </p>

                {/* CTA 按钮组 */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={onLogin}
                    className="btn btn-primary text-base px-10 py-4 shadow-glow"
                  >
                    <span>开启校招之旅</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                  <Link
                    href="/exam"
                    className="group flex items-center gap-2 px-8 py-4 rounded-full font-semibold transition-all text-[#0D7377] hover:bg-[#0D7377]/5"
                  >
                    先逛逛资料库
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {/* 特性标签 */}
                <div className="mt-14 flex flex-wrap justify-center gap-3">
                  {['智能筛选', '进度追踪', '笔面资料', '内推码库'].map((tag, i) => (
                    <span
                      key={tag}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 cursor-default animate-slide-up"
                      style={{
                        background: i % 2 === 0 ? 'rgba(255,107,74,0.08)' : 'rgba(13,115,119,0.08)',
                        color: i % 2 === 0 ? '#E85A3A' : '#0D7377',
                        border: `1px solid ${i % 2 === 0 ? 'rgba(255,107,74,0.15)' : 'rgba(13,115,119,0.15)'}`,
                        animationDelay: `${0.3 + i * 0.1}s`,
                        opacity: 0,
                        animationFillMode: 'forwards'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 底部数据统计装饰 */}
                <div className="mt-16 flex justify-center gap-8 md:gap-16">
                  {[
                    { num: '10000+', label: '校招职位' },
                    { num: '80000+', label: '笔面资料' },
                    { num: '200+', label: '内推码' },
                  ].map((stat, i) => (
                    <div key={stat.label} className="text-center animate-slide-up" style={{ animationDelay: `${0.6 + i * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}>
                      <div className="text-2xl md:text-3xl font-bold text-gradient">{stat.num}</div>
                      <div className="text-xs text-[#9CA3AF] mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && user && displayJobs.length === 0 && !pageResult && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center mt-6">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={24} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">开始查询职位</h3>
              <p className="text-slate-500 mb-6">选择筛选条件后，点击「查询筛选」按钮查看职位信息</p>
            </div>
          )}

          {!loading && displayJobs.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {listToShow.length === 0 && showFavoritesOnly ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-500">
                  当前页暂无收藏，点击职位卡片上的星标可收藏
                </div>
              ) : (
                listToShow.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onStatusChange={handleUpdateJobStatus}
                    isFavorite={favoriteIds.has(job.id)}
                    onToggleFavorite={user ? handleToggleFavorite : undefined}
                  />
                ))
              )}
            </div>
          )}

          {!loading && pageResult && ((pageResult.hasNext ?? false) || currentPage > 0) && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0 || loading}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> 上一页
              </button>
              <span className="text-xs text-slate-500">
                第 {currentPage + 1} 页{typeof pageResult.totalPages === "number" ? ` / 共 ${pageResult.totalPages} 页` : ""}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!(pageResult.hasNext ?? false) || loading}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                下一页 <ChevronRight size={16} />
              </button>
            </div>
          )}

          {!loading && user && displayJobs.length === 0 && pageResult && pageResult.totalElements === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center mt-6">
              <Filter size={24} className="text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">暂无相关职位</h3>
              <p className="text-slate-500 mt-1">请尝试调整筛选条件</p>
              <button
                onClick={() => {
                  setFilters({ industry: "ALL", type: "ALL", location: "", deadlineDays: "ALL", roles: "" });
                  setOnlyNewToday(false);
                  setTimeout(handleSearch, 0);
                }}
                className="mt-4 text-blue-600 font-medium hover:underline text-sm"
              >
                清除所有筛选
              </button>
            </div>
          )}
        </div>
      </div>

      {showPaywall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => setShowPaywall(false)}>
              <X size={20} />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 mb-6">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">职位查询是VIP专属功能</h3>
            <p className="mt-3 text-sm text-slate-500">开通 VIP 会员，即可解锁无限次查询、投递进度管理、内推码库等全部高级功能！</p>
            <button
              onClick={() => { setShowPaywall(false); router.push("/vip"); }}
              className="mt-8 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              立即开通会员
            </button>
            <button onClick={() => setShowPaywall(false)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600">
              暂不需要，明天再来
            </button>
          </div>
        </div>
      )}

      {/* VIP即将到期提醒 */}
      {showVipExpiringSoon && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowVipExpiringSoon(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => setShowVipExpiringSoon(false)}>
              <X size={20} />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 mb-6">
              <Sparkles className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">VIP权益仅剩1天啦</h3>
            <p className="mt-3 text-sm text-slate-500">您的VIP会员将于明天到期，续费可继续享受无限查询、内推码库等全部权益</p>
            <button
              onClick={() => { setShowVipExpiringSoon(false); router.push("/vip"); }}
              className="mt-8 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              立即续费
            </button>
            <button onClick={() => setShowVipExpiringSoon(false)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600">
              稍后再说
            </button>
          </div>
        </div>
      )}

      {/* VIP已到期提醒 */}
      {showVipExpired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowVipExpired(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={() => setShowVipExpired(false)}>
              <X size={20} />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-gray-100 mb-6">
              <Lock className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">VIP权益已到期</h3>
            <p className="mt-3 text-sm text-slate-500">您的VIP会员已到期，续费即可恢复无限查询、投递进度管理等全部权益</p>
            <button
              onClick={() => { setShowVipExpired(false); router.push("/vip"); }}
              className="mt-8 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              立即续费
            </button>
            <button onClick={() => setShowVipExpired(false)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600">
              稍后再说
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
