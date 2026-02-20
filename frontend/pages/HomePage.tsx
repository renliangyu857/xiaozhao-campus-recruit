import React, { useState, useEffect } from 'react';
import { ApplyStatus, FilterState, Industry, Job, RecruitType, User } from '../types';
import { MAX_FREE_QUERIES } from '../constants';
import { JobCard } from '../components/JobCard';
import { fetchJobsPage, PageResult } from '../services/jobService';
import { consumeQuery } from '../services/queryService';
import { ApiError } from '../services/apiClient';
import { Search, Filter, Lock, Sparkles, X, MapPin, Briefcase, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  user: User | null;
  onUpdateQueryCount: () => void;
  onUpdateJobStatus: (id: string, status: ApplyStatus) => void;
  jobs: Job[];
  onJobsUpdated: (jobs: Job[]) => void;
  onLogin?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, onUpdateQueryCount, jobs, onUpdateJobStatus, onJobsUpdated, onLogin }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({
    industry: 'ALL',
    type: 'ALL',
    location: '',
    deadlineDays: 'ALL',
    roles: '',
  });
  const [onlyNewToday, setOnlyNewToday] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(30);
  const [pageResult, setPageResult] = useState<PageResult<Job> | null>(null);
  const [displayJobs, setDisplayJobs] = useState<Job[]>(jobs);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initial load - 仅当用户已登录且有数据时才显示
  useEffect(() => {
    if (user && jobs.length > 0) {
      setDisplayJobs(jobs);
    } else {
      setDisplayJobs([]);
      setPageResult(null);
    }
  }, [jobs, user]);

  const loadPage = async (page: number, resetPage: boolean = false) => {
    // 检查登录状态
    if (!user) {
      alert('请先登录后操作');
      return;
    }

    setShowPaywall(false);
    setLoading(true);
    try {
      // 免费次数与 VIP 权限由后端控制：/query/consume
      if (!user.isVip && resetPage) {
        try {
          await consumeQuery();
          onUpdateQueryCount();
        } catch (e: any) {
          if (e instanceof ApiError && e.status === 403) {
            setShowPaywall(true);
            return;
          }
          if (e instanceof ApiError && e.status === 401) {
            alert('请先登录');
            return;
          }
          throw e;
        }
      }

      const result = await fetchJobsPage(filters, onlyNewToday, page, pageSize);
      setPageResult(result);
      setDisplayJobs(result.content || []);
      setCurrentPage(result.number);
      onJobsUpdated(result.content || []);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) {
        alert('请先登录后操作');
        setDisplayJobs([]);
        setPageResult(null);
      } else {
        alert(e?.body?.message || e?.message || '查询失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadPage(0, true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && pageResult && newPage < Math.ceil(pageResult.totalElements / pageSize)) {
      loadPage(newPage, false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Fixed Navbar Spacer */}
      <div className="h-16"></div>

      {/* Filter Header - Restored to Horizontal Layout */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-3">
             {/* Top Row: Dropdowns & Basic Inputs */}
             <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Industry */}
                <div className="relative">
                   <select 
                      className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:ring-blue-500 cursor-pointer hover:bg-slate-100 transition-colors"
                      value={filters.industry}
                      onChange={(e) => handleFilterChange('industry', e.target.value)}
                   >
                      <option value="ALL">所有行业</option>
                      {Object.values(Industry).map(i => <option key={i} value={i}>{i}</option>)}
                   </select>
                </div>

                {/* Type */}
                <div className="relative">
                   <select 
                      className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:ring-blue-500 cursor-pointer hover:bg-slate-100 transition-colors"
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                   >
                      <option value="ALL">所有类型</option>
                      {Object.values(RecruitType).map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>

                {/* Deadline */}
                <div className="relative">
                   <select 
                      className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:ring-blue-500 cursor-pointer hover:bg-slate-100 transition-colors"
                      value={filters.deadlineDays}
                      onChange={(e) => handleFilterChange('deadlineDays', e.target.value)}
                   >
                      <option value="ALL">截止时间不限</option>
                      <option value="3">3天内截止</option>
                      <option value="7">7天内截止</option>
                      <option value="15">15天内截止</option>
                   </select>
                </div>

                {/* Location */}
                <div className="relative col-span-1">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin size={14} className="text-slate-400" />
                   </div>
                   <input 
                      type="text" 
                      placeholder="工作地点" 
                      className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                   />
                </div>

                {/* Search Button */}
                <button 
                    onClick={handleSearch}
                    disabled={loading}
                    className={`col-span-2 md:col-span-1 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm hover:shadow active:scale-95 transition-all flex items-center justify-center gap-2 ${
                      loading ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                >
                    <Search size={16} /> {loading ? '查询中...' : '查询筛选'}
                </button>
             </div>

             {/* Bottom Row: Advanced Inputs & Toggles */}
             <div className="flex flex-col md:flex-row md:items-center gap-3">
                 <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Briefcase size={14} className="text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="岗位关键词 (支持多个，逗号隔开)" 
                        className="block w-full rounded-lg border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                        value={filters.roles}
                        onChange={(e) => handleFilterChange('roles', e.target.value)}
                    />
                 </div>
                 
                 <div className="flex items-center justify-between md:justify-end gap-3">
                     <button 
                        onClick={() => setOnlyNewToday(!onlyNewToday)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            onlyNewToday 
                            ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                     >
                        <Sparkles size={14} className={onlyNewToday ? 'fill-current' : ''} />
                        今日新增
                     </button>
                     
                     {!user?.isVip && (
                         <div className="text-xs text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            免费剩余:{' '}
                            <span className="font-bold text-slate-700">
                              {typeof user?.remainingFreeQueries === 'number'
                                ? user.remainingFreeQueries
                                : Math.max(0, MAX_FREE_QUERIES - (user?.queryCount || 0))}
                            </span>{' '}
                            次
                         </div>
                     )}
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">最新职位</h2>
                {pageResult && (
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">
                      共找到 {pageResult.totalElements} 条
                  </span>
                )}
             </div>

            {/* 未登录提示 */}
            {!user && displayJobs.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center mt-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-blue-500"/>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">请先登录后查询职位</h3>
                <p className="text-slate-500 mb-6">登录后即可查看最新校招职位信息</p>
                <button
                  onClick={() => {
                    if (onLogin) {
                      onLogin();
                    } else {
                      // 如果没有传入 onLogin，尝试触发导航栏的登录按钮
                      const event = new CustomEvent('triggerLogin');
                      window.dispatchEvent(event);
                    }
                  }}
                  className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                >
                  立即登录
                </button>
              </div>
            )}

            {/* 已登录但未查询时的提示 */}
            {user && displayJobs.length === 0 && !loading && !pageResult && (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center mt-6">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-slate-300"/>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">开始查询职位</h3>
                <p className="text-slate-500 mb-6">选择筛选条件后，点击"查询筛选"按钮查看职位信息</p>
              </div>
            )}

            {/* 职位列表 */}
            {displayJobs.length > 0 && (
              <div className="grid grid-cols-1 gap-4">
                {displayJobs.map(job => (
                  <JobCard key={job.id} job={job} onStatusChange={onUpdateJobStatus} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {pageResult && pageResult.totalElements > pageSize && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0 || loading}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-1 ${
                    currentPage === 0 || loading
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <ChevronLeft size={16} />
                  上一页
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(pageResult.totalElements / pageSize)) }, (_, i) => {
                    const totalPages = Math.ceil(pageResult.totalElements / pageSize);
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 2) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pageResult || currentPage >= Math.ceil(pageResult.totalElements / pageSize) - 1 || loading}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-1 ${
                    !pageResult || currentPage >= Math.ceil(pageResult.totalElements / pageSize) - 1 || loading
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  下一页
                  <ChevronRight size={16} />
                </button>
                <span className="text-xs text-slate-500 ml-2">
                  第 {currentPage + 1} 页 / 共 {Math.ceil((pageResult?.totalElements ?? 0) / pageSize)} 页
                </span>
              </div>
            )}

            {/* 查询后无结果 */}
            {user && displayJobs.length === 0 && !loading && pageResult && pageResult.totalElements === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center mt-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter size={24} className="text-slate-300"/>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">暂无相关职位</h3>
                    <p className="text-slate-500 mt-1">请尝试调整筛选条件，或者查看全部职位</p>
                    <button 
                        onClick={() => {
                             setFilters({ industry: 'ALL', type: 'ALL', location: '', deadlineDays: 'ALL', roles: '' });
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

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowPaywall(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
                <div className="absolute top-4 right-4 cursor-pointer text-slate-400 hover:text-slate-600" onClick={() => setShowPaywall(false)}>
                    <X size={20} />
                </div>
                <div className="p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 mb-6 shadow-inner">
                        <Lock className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">今日免费次数已用完</h3>
                    <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                        升级 VIP 会员，解锁<span className="text-amber-600 font-bold">无限次查询</span>与更多高级功能，助力校招上岸！
                    </p>
                    <button
                        onClick={() => {
                            setShowPaywall(false);
                            navigate('/vip');
                        }}
                        className="mt-8 w-full rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 py-3.5 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                        立即开通会员
                    </button>
                    <button
                        onClick={() => setShowPaywall(false)}
                        className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600"
                    >
                        暂不需要，明天再来
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};