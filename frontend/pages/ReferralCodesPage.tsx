import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { getReferralCodes, useReferralCode, ReferralCodeItem } from '../services/referralCodeService';
import { ApiError } from '../services/apiClient';
import { Lock, Search, Copy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReferralCodesPageProps {
  user: User | null;
}

export const ReferralCodesPage: React.FC<ReferralCodesPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReferralCodeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [usedId, setUsedId] = useState<number | null>(null);

  const isVip = !!(user?.isVip);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getReferralCodes(page, 20, companyName || undefined);
      setItems(res.content || []);
      setTotal(res.totalElements ?? 0);
    } catch (e: any) {
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

  const handleCopy = (code: string, id: number) => {
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
    } catch (e: any) {
      alert(e?.body?.message || e?.message || '使用失败');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">请先登录</h2>
          <p className="text-slate-500 mt-2">登录后即可查看内推码</p>
          <a href="#/" className="mt-4 inline-block text-blue-600 font-medium">返回首页</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">内推码广场</h1>
          <p className="mt-4 text-lg text-slate-600">汇集各大厂最新内推码，助你快人一步直通面试</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mb-12">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={20} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="block flex-1 rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 placeholder:text-slate-400 transition-all"
              placeholder="搜索公司名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="rounded-2xl bg-slate-900 text-white px-6 py-4 font-medium hover:bg-slate-800 transition-colors"
            >
              搜索
            </button>
          </div>
        </div>

        {/* Non-VIP: 居中卡片引导开通 */}
        {!isVip && (
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-sm border border-slate-100 p-10">
            <Lock className="mx-auto text-amber-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-900 mb-2">VIP 专属内容</h2>
            <p className="text-slate-600 mb-6">升级会员查看完整内推码</p>
            <button
              onClick={() => navigate('/vip')}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg"
            >
              立即解锁
            </button>
          </div>
        )}

        {/* VIP: 内推码网格 */}
        {isVip && (
          <>
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                加载中…
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                暂无内推码
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-slate-900">{item.companyName}</h3>
                      <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                        {item.usageCount} 人已用
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between mb-4">
                      <code className="font-mono text-lg font-bold text-slate-700 tracking-wider break-all">
                        {item.code}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.code, item.id)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1 shrink-0 ml-2"
                        title="复制"
                      >
                        {copiedId === item.id ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <Copy size={18} />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                      <span>内推码库</span>
                      <span className={item.isValid ? 'text-green-500 flex items-center gap-1' : 'text-red-500'}>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${item.isValid ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        {item.isValid ? '有效' : '已失效'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUse(item)}
                      disabled={usedId === item.id}
                      className="mt-4 w-full rounded-xl bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {usedId === item.id ? '已使用' : '标记已用'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {total > 20 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
                >
                  上一页
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
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
};
