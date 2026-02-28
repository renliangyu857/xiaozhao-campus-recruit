"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { FileText, Edit, Users, Award, Save, X, TrendingUp, Target, Briefcase, Calendar } from "lucide-react";
import { fetchProgressList, updateProgressNote, type ProgressItem } from "@/lib/progressService";
import { ApplyStatus } from "@/lib/types";
import { useUser } from "@/components/UserContext";

// 精美的统计卡片组件
const StatCard = ({
  title,
  count,
  icon: Icon,
  color,
  gradient,
  delay = 0,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  gradient: string;
  delay?: number;
}) => (
  <div
    className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-slate-200/50 border border-slate-100 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 group animate-slide-up"
    style={{ animationDelay: `${delay}ms`, opacity: 0, animationFillMode: 'forwards' }}
  >
    {/* 背景装饰 */}
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${gradient}`} />
    <div className={`absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-5 ${gradient}`} />

    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h4 className="text-3xl font-bold text-slate-900 group-hover:scale-105 transition-transform origin-left">
          {count}
        </h4>
      </div>
      <div className={`p-3 rounded-xl ${color} shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>

    {/* 底部进度条装饰 */}
    <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} opacity-60`} style={{ width: `${Math.min((count / 20) * 100, 100)}%` }} />
    </div>
  </div>
);

// 状态标签组件
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    "未投递": { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", icon: "📋" },
    "已投递": { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", icon: "📤" },
    "已笔试": { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", icon: "📝" },
    "已面试": { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", icon: "🗣️" },
    "已通过": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", icon: "🎉" },
    "已挂": { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", icon: "💔" },
  };
  const c = config[status] || config["未投递"];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      <span>{c.icon}</span>
      {status}
    </span>
  );
};

export default function ProgressPage() {
  const { user } = useUser();
  const [progressList, setProgressList] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState("");
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const loadProgressList = async () => {
    try {
      setLoading(true);
      const list = await fetchProgressList();
      setProgressList(list);
    } catch (e) {
      console.error("Failed to load progress list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadProgressList();
    else setProgressList([]);
  }, [user?.id]);

  const handleEditNote = (item: ProgressItem) => {
    setEditingNoteId(item.jobId);
    setEditingNoteValue(item.note || "");
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteValue("");
  };

  const handleSaveNote = async (jobId: string) => {
    try {
      setSavingNoteId(jobId);
      await updateProgressNote(jobId, editingNoteValue);
      setProgressList((prev) =>
        prev.map((item) => (item.jobId === jobId ? { ...item, note: editingNoteValue } : item))
      );
      setEditingNoteId(null);
      setEditingNoteValue("");
    } catch (e) {
      alert((e as { body?: { message?: string }; message?: string })?.body?.message ?? (e as Error)?.message ?? "保存失败");
    } finally {
      setSavingNoteId(null);
    }
  };

  // 统计数据
  const stats: Record<string, number> = {
    [ApplyStatus.NOT_APPLIED]: 0,
    [ApplyStatus.APPLIED]: 0,
    [ApplyStatus.WRITTEN_TEST]: 0,
    [ApplyStatus.INTERVIEW]: 0,
    [ApplyStatus.OFFER]: 0,
    [ApplyStatus.REJECTED]: 0,
  };
  progressList.forEach((item) => {
    stats[item.status] = (stats[item.status] ?? 0) + 1;
  });

  const totalApplied = progressList.length;
  const offerRate = totalApplied > 0 ? Math.round((stats[ApplyStatus.OFFER] / totalApplied) * 100) : 0;

  // 饼图数据
  const pieData = [
    { name: "已投递", value: stats[ApplyStatus.APPLIED], color: "#3b82f6" },
    { name: "笔试", value: stats[ApplyStatus.WRITTEN_TEST], color: "#8b5cf6" },
    { name: "面试", value: stats[ApplyStatus.INTERVIEW], color: "#f59e0b" },
    { name: "Offer", value: stats[ApplyStatus.OFFER], color: "#10b981" },
    { name: "已挂", value: stats[ApplyStatus.REJECTED], color: "#f43f5e" },
  ].filter((d) => d.value > 0);

  // 柱状图数据
  const barData = [
    { name: "互联网", count: progressList.filter((j) => j.industry === "互联网" && j.status !== ApplyStatus.NOT_APPLIED).length },
    { name: "金融", count: progressList.filter((j) => j.industry === "金融" && j.status !== ApplyStatus.NOT_APPLIED).length },
    { name: "国央企", count: progressList.filter((j) => j.industry === "国央企" && j.status !== ApplyStatus.NOT_APPLIED).length },
    { name: "外企", count: progressList.filter((j) => j.industry === "外企" && j.status !== ApplyStatus.NOT_APPLIED).length },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] to-white pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Briefcase size={32} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">请先登录</h2>
          <p className="text-slate-500">登录后即可查看投递进度</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] to-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <span className="text-4xl">🐱</span>
              <span>我的投递看板</span>
            </h1>
            <p className="text-slate-500 mt-1">校招喵帮你实时掌握进度，科学规划每一步</p>
          </div>
          {totalApplied > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
              <Target size={16} />
              Offer 率 {offerRate}%
            </div>
          )}
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="总投递"
            count={totalApplied}
            icon={FileText}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            gradient="bg-blue-500"
            delay={0}
          />
          <StatCard
            title="笔试中"
            count={stats[ApplyStatus.WRITTEN_TEST]}
            icon={Edit}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            gradient="bg-purple-500"
            delay={100}
          />
          <StatCard
            title="面试中"
            count={stats[ApplyStatus.INTERVIEW]}
            icon={Users}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            gradient="bg-amber-500"
            delay={200}
          />
          <StatCard
            title="已拿 Offer"
            count={stats[ApplyStatus.OFFER]}
            icon={Award}
            color="bg-gradient-to-br from-emerald-500 to-teal-500"
            gradient="bg-emerald-500"
            delay={300}
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 饼图 */}
          <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 min-h-[420px] flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-blue-50">
                <TrendingUp size={20} className="text-blue-500" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">投递状态分布</h3>
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={6}
                      dataKey="value"
                      cornerRadius={8}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        padding: "12px 16px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={50}
                      iconType="circle"
                      formatter={(value) => <span className="text-slate-600 text-sm ml-1">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <FileText size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm">暂无投递数据</p>
                  <p className="text-xs mt-1 text-slate-300">开始投递职位后将显示统计</p>
                </div>
              )}
            </div>
          </div>

          {/* 柱状图 */}
          <div className="bg-white p-8 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 min-h-[420px] flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-amber-50">
                <Calendar size={20} className="text-amber-500" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">行业偏好分析</h3>
            </div>
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={48} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc", radius: 8 }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      padding: "12px 16px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#barGradient)"
                    radius={[8, 8, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B4A" />
                      <stop offset="100%" stopColor="#FF8F7A" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 投递列表 */}
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-50">
                <Briefcase size={20} className="text-slate-500" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">投递进度列表</h3>
            </div>
            <span className="text-sm text-slate-400">共 {progressList.length} 条记录</span>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-slate-200 border-t-[#FF6B4A]" />
              <p className="mt-4 text-slate-400 text-sm">加载中...</p>
            </div>
          ) : progressList.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-50 flex items-center justify-center">
                <FileText size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500">暂无投递记录</p>
              <p className="text-sm text-slate-400 mt-1">去首页投递职位，开始追踪你的校招进度</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">公司名称</th>
                    <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">投递进度</th>
                    <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {progressList.map((item, index) => (
                    <tr
                      key={item.jobId}
                      className="hover:bg-slate-50/80 transition-colors animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms`, opacity: 0, animationFillMode: 'forwards' }}
                    >
                      <td className="px-8 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm">
                            {item.company.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{item.company}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-8 py-4">
                        {editingNoteId === item.jobId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingNoteValue}
                              onChange={(e) => setEditingNoteValue(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#FF6B4A] focus:ring-2 focus:ring-[#FF6B4A]/10 transition-all"
                              placeholder="输入备注..."
                              maxLength={200}
                            />
                            <button
                              onClick={() => handleSaveNote(item.jobId)}
                              disabled={savingNoteId === item.jobId}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="保存"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              title="取消"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 group">
                            <span className="text-sm text-slate-600 flex-1">
                              {item.note || <span className="text-slate-400 italic">暂无备注</span>}
                            </span>
                            <button
                              onClick={() => handleEditNote(item)}
                              className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium text-[#FF6B4A] hover:bg-[#FF6B4A]/5 rounded-lg transition-all"
                            >
                              编辑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
