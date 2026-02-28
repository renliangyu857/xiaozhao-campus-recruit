"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Search, Copy, CheckCircle, Sparkles, Briefcase, Crown } from "lucide-react";
import { getReferralCodes, useReferralCode, type ReferralCodeItem } from "@/lib/referralCodeService";
import { ApiError } from "@/lib/apiClient";
import { useUser } from "@/components/UserContext";

export default function ReferralCodesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [items, setItems] = useState<ReferralCodeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [usedId, setUsedId] = useState<string | null>(null);

  const isVip = !!user?.isVip;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getReferralCodes(page, 20, companyName || undefined);
      setItems(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setItems([]);
        setTotal(0);
        return;
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isVip) load();
    else setItems([]);
  }, [user?.id, user?.isVip, page, companyName]);

  const handleSearch = () => {
    setCompanyName(searchTerm.trim());
    setPage(0);
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = async (item: ReferralCodeItem) => {
    try {
      await useReferralCode(item.id);
      setUsedId(item.id);
      setTimeout(() => setUsedId(null), 2000);
      load();
    } catch (e) {
      alert(((e as ApiError)?.body as { message?: string })?.message ?? (e as Error)?.message ?? "使用失败");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] pt-20 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">请先登录</h2>
          <p className="text-slate-500 mt-2">登录后即可查看内推码</p>
          <Link href="/" className="mt-4 inline-block text-[#FF6B4A] font-medium hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-[#0D7377] to-[#14A085] rounded-2xl mb-5 shadow-lg shadow-teal-200">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">校招喵内推码库</h1>
          <p className="mt-3 text-slate-600">汇集各大厂最新内推码，助你快人一步直通面试</p>
        </div>

        {/* 搜索栏 */}
        <div className="relative max-w-xl mx-auto mb-10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={20} />
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              className="block flex-1 rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm focus:border-[#FF6B4A] focus:ring-4 focus:ring-[#FF6B4A]/10 outline-none transition placeholder:text-slate-400"
              placeholder="搜索公司名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white px-6 py-4 font-semibold hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              搜索
            </button>
          </div>
        </div>

        {/* 非VIP锁定状态 */}
        {!isVip && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="text-[#FF6B4A]" size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">VIP 专属内容</h2>
            <p className="text-slate-600 mb-6">升级会员查看完整内推码，直通名企面试</p>
            <button
              onClick={() => router.push("/vip")}
              className="bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              立即解锁
            </button>
          </div>
        )}

        {/* VIP内容区域 */}
        {isVip && (
          <>
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B4A]" />
                <p className="mt-3 text-slate-500">加载中...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-500">
                <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                暂无内推码
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 transition-all"
                  >
                    {/* 公司名 */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{item.companyName}</h3>
                      <span className="bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap border border-emerald-100">
                        {item.usageCount} 人已用
                      </span>
                    </div>

                    {/* 内推码 */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between mb-4">
                      <code className="font-mono text-lg font-bold text-slate-700 tracking-wider break-all">{item.code}</code>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.code, item.id)}
                        className="text-slate-400 hover:text-[#FF6B4A] transition-colors p-2 hover:bg-orange-50 rounded-lg shrink-0 ml-3"
                        title="复制"
                      >
                        {copiedId === item.id ? (
                          <CheckCircle size={20} className="text-emerald-500" />
                        ) : (
                          <Copy size={20} />
                        )}
                      </button>
                    </div>

                    {/* 使用按钮 */}
                    <button
                      type="button"
                      onClick={() => handleUse(item)}
                      disabled={usedId === item.id}
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                        usedId === item.id
                          ? "bg-emerald-50 text-emerald-600 cursor-default"
                          : "bg-gradient-to-r from-[#0D7377] to-[#14A085] text-white hover:shadow-lg hover:shadow-teal-200"
                      }`}
                    >
                      {usedId === item.id ? "✓ 已使用" : "标记已用"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {total > 20 && (
              <div className="mt-8 flex justify-center gap-3">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-white hover:shadow-sm transition-all bg-white"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-white hover:shadow-sm transition-all bg-white"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
