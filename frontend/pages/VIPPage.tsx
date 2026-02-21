import React, { useEffect, useState } from 'react';
import { User, VipPlan } from '../types';
import { Crown, Check, Bell, BookOpen, Sparkles } from 'lucide-react';
import { getVipPlans, getVipDashboard, createVipOrder } from '../services/vipService';
import { ApiError } from '../services/apiClient';

/** 会员页滚动：某某用户已购买X会员 / 已投递N家职位抢占先机；30 条随机生成后打乱 */
function buildVipTickerMessages(): string[] {
  const plans = ['1个月会员', '3个月会员', '永久会员'];
  const messages: string[] = [];
  for (let i = 0; i < 30; i++) {
    const type = Math.floor(Math.random() * 2);
    if (type === 0) {
      messages.push(`用户*** 已购买 ${plans[Math.floor(Math.random() * plans.length)]}`);
    } else {
      const count = 50 + Math.floor(Math.random() * 251);
      messages.push(`用户*** 已投递 ${count} 家职位，抢占先机`);
    }
  }
  return messages.sort(() => Math.random() - 0.5);
}

const VIP_TICKER_MESSAGES = buildVipTickerMessages();

interface VIPPageProps {
  user: User | null;
  onUpgrade: (planId: string) => void;
}

/** 权益对比看板：每行权益 + 哪些套餐包含（1_month | 3_month | lifetime）；exclusive 表示该权益为高 tier 专属，用图标突显 */
const BENEFIT_ROWS: { id: string; label: string; note?: string; plans: ('1_month' | '3_month' | 'lifetime')[]; exclusive?: boolean }[] = [
  { id: 'query', label: '无限查询', plans: ['1_month', '3_month', 'lifetime'] },
  { id: 'board', label: '进度看板', plans: ['1_month', '3_month', 'lifetime'] },
  { id: 'collect', label: '职位收藏', plans: ['1_month', '3_month', 'lifetime'] },
  { id: 'referral', label: '内推码库', plans: ['1_month', '3_month', 'lifetime'] },
  { id: 'community', label: '专属社群', plans: ['1_month', '3_month', 'lifetime'] },
  { id: 'push', label: '个性化推送', note: '关注公司和职位后，岗位上新后通过公众号个性化推送', plans: ['3_month', 'lifetime'], exclusive: true },
  { id: 'material', label: '解锁全部笔面试资料', plans: ['3_month', 'lifetime'], exclusive: true },
  { id: 'value', label: '无敌性价比', plans: ['lifetime'], exclusive: true },
];

const PLAN_ORDER: ('1_month' | '3_month' | 'lifetime')[] = ['1_month', '3_month', 'lifetime'];

const getPlanDays = (planId: string): number | null =>
  planId === '1_month' ? 30 : planId === '3_month' ? 90 : null;

export const VIPPage: React.FC<VIPPageProps> = ({ user, onUpgrade }) => {
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [dashboard, setDashboard] = useState<{ isTrial?: boolean; referralCodeCount?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await getVipPlans();
        setPlans(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.isVip) return;
    getVipDashboard().then((d) => setDashboard({ isTrial: d.isTrial, referralCodeCount: d.referralCodeCount })).catch(() => {});
  }, [user?.id, user?.isVip]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % VIP_TICKER_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpgrade = (planId: string) => {
    if (!user) {
      alert('请先登录');
      return;
    }
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const confirm = window.confirm(`确认支付 ¥${plan.price} 开通 ${plan.name}？（开发模式：后端返回 stub 下单参数）`);
    if (!confirm) return;
    createVipOrder(plan.id)
      .then((order) => {
        alert(`已创建订单：${order.orderNo}\n（开发模式需模拟支付回调，当前前端仅演示下单）`);
        onUpgrade(plan.id);
      })
      .catch((e: any) => {
        if (e instanceof ApiError && e.status === 401) alert('请先登录');
        else alert(e?.body?.message || e?.message || '下单失败');
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Ticker */}
      <div className="fixed top-16 left-0 right-0 bg-amber-50 border-b border-amber-100 py-2 overflow-hidden z-40">
        <div className="flex justify-center items-center gap-2">
          <span className="text-xs font-medium text-amber-800">
            {VIP_TICKER_MESSAGES[tickerIndex]}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-full mb-4 shadow-inner">
            <Crown className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">升级 VIP 会员</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            解锁全站高级功能，助力校招快人一步，早日拿到心仪 Offer
          </p>
        </div>

        {/* VIP 状态横幅 */}
        {user?.isVip && (
          <div className="mb-12 mx-auto max-w-3xl bg-slate-900 rounded-3xl p-1 text-white shadow-2xl relative overflow-hidden">
            <div className="bg-slate-900 rounded-[22px] p-8 relative">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-900 shadow-lg shrink-0">
                  <Crown size={40} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {user.isTrial || dashboard?.isTrial ? '体验会员' : '尊贵的 VIP 会员'}
                  </h2>
                  <p className="mt-2 text-slate-400">
                    会员权益有效期至：<span className="font-mono font-bold text-amber-400 text-lg">{user.vipExpiry}</span>
                  </p>
                  {dashboard && (dashboard.referralCodeCount ?? 0) > 0 && (
                    <p className="mt-1 text-slate-500 text-sm">
                      内推码库共 {dashboard.referralCodeCount} 个热门公司
                      <a href="#/referral-codes" className="ml-2 text-blue-400 hover:text-blue-300 font-medium">去查看 →</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 权益对比看板 */}
        <div className="mb-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <h2 className="sr-only">会员权益对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-white">
                  <th className="w-48 px-4 py-4 text-sm font-semibold text-slate-200">权益</th>
                  {PLAN_ORDER.map((planId) => {
                    const plan = plans.find((p) => p.id === planId);
                    if (!plan) return <th key={planId} className="px-4 py-4" />;
                    const days = getPlanDays(plan.id);
                    const dailyStr = days != null ? `¥${(plan.price / days).toFixed(2)}/天` : '永久';
                    const totalStr = days != null ? `¥${plan.price}/${days}天` : `¥${plan.price}/永久`;
                    const isRecommended = plan.id === '3_month';
                    return (
                      <th
                        key={plan.id}
                        className={`px-4 py-4 text-center ${isRecommended ? 'relative border-2 border-amber-400 bg-slate-800 shadow-lg shadow-amber-500/20' : ''}`}
                      >
                        {plan.tag && (
                          <span
                            className={`inline-block mb-2 rounded px-2 py-0.5 text-[10px] font-bold ${isRecommended ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-200'}`}
                          >
                            {plan.tag}
                          </span>
                        )}
                        <div className="font-bold text-white">{plan.name}</div>
                        <div className="mt-1 text-xs text-slate-300">{dailyStr}</div>
                        <div className="text-xs text-slate-400">{totalStr}</div>
                        <button
                          type="button"
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loading}
                          className={`mt-3 w-full max-w-[100px] rounded-lg px-3 py-2 text-sm font-medium shadow disabled:opacity-50 ${isRecommended ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
                        >
                          {user?.isVip ? '升级' : '购买'}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {BENEFIT_ROWS.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.exclusive && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600" title="该套餐专属权益">
                            {row.id === 'push' && <Bell className="h-3.5 w-3.5" />}
                            {row.id === 'material' && <BookOpen className="h-3.5 w-3.5" />}
                            {row.id === 'value' && <Sparkles className="h-3.5 w-3.5" />}
                          </span>
                        )}
                        <div>
                          <span className="font-medium text-slate-800">{row.label}</span>
                          {row.note && <p className="mt-0.5 text-xs text-slate-500">{row.note}</p>}
                        </div>
                      </div>
                    </td>
                    {PLAN_ORDER.map((planId) => (
                      <td key={planId} className={`px-4 py-3 text-center ${planId === '3_month' ? 'bg-amber-50/40' : ''}`}>
                        {row.plans.includes(planId) ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-400">支付即代表同意《会员服务协议》</p>
        </div>

      </div>
    </div>
  );
};
