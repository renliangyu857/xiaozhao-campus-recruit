import React, { useEffect, useState } from 'react';
import { User, VipPlan } from '../types';
import { Crown, Zap, Award, FileText, Shield, Star, MessageCircle } from 'lucide-react';
import { getVipPlans, getVipDashboard, createVipOrder } from '../services/vipService';
import { ApiError } from '../services/apiClient';

const MOCK_PAYMENT_TICKER = [
  { avatar: '', message: '用户 *** 刚刚开通了季度会员' },
  { avatar: '', message: '用户 *** 刚刚开通了永久会员' },
  { avatar: '', message: '已有 1000+ 同学升级 VIP' },
];

interface VIPPageProps {
  user: User | null;
  onUpgrade: (planId: string) => void;
}

const benefits = [
  { icon: <Zap className="w-5 h-5 text-amber-500" />, title: '无限次查询', desc: '每日节省 30+ 次查询费用' },
  { icon: <Award className="w-5 h-5 text-amber-500" />, title: '内推码库', desc: '解锁 500+ 热门公司内推码' },
  { icon: <FileText className="w-5 h-5 text-amber-500" />, title: 'AI 简历诊断', desc: '深度优化简历，提升通过率' },
  { icon: <Star className="w-5 h-5 text-amber-500" />, title: '投递进度看板', desc: '可视化记录笔试面试进度' },
  { icon: <Shield className="w-5 h-5 text-amber-500" />, title: '优先推送', desc: '新职位第一时间通知' },
  { icon: <MessageCircle className="w-5 h-5 text-amber-500" />, title: '专属社群', desc: '加入 VIP 求职交流群' },
];

export const VIPPage: React.FC<VIPPageProps> = ({ user, onUpgrade }) => {
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [dashboard, setDashboard] = useState<{ isTrial?: boolean; referralCodeCount?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('3_month');
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await getVipPlans();
        setPlans(list);
        if (list.length && !list.some((p) => p.id === selectedPlan)) setSelectedPlan(list[0].id);
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
      setTickerIndex((prev) => (prev + 1) % MOCK_PAYMENT_TICKER.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpgrade = () => {
    if (!user) {
      alert('请先登录');
      return;
    }
    const plan = plans.find((p) => p.id === selectedPlan);
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
        <div className="flex justify-center items-center gap-2 animate-pulse">
          <span className="text-xs font-medium text-amber-800">
            {MOCK_PAYMENT_TICKER[tickerIndex].message}
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

        {/* 非 VIP：权益 + 定价 */}
        {!user?.isVip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">会员专属权益</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-amber-50/50 transition-colors border border-transparent hover:border-amber-100"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">{benefit.icon}</div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{benefit.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                限时特惠
              </div>
              <div className="space-y-4 mb-8">
                {(plans.length ? plans : []).map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-amber-500 bg-amber-50/30 shadow-md scale-[1.02]'
                        : 'border-slate-100 hover:border-amber-200 hover:bg-slate-50'
                    }`}
                  >
                    {plan.tag && (
                      <span
                        className={`absolute -top-2.5 left-4 px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                          selectedPlan === plan.id ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                      >
                        {plan.tag}
                      </span>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className={`font-bold ${selectedPlan === plan.id ? 'text-slate-900' : 'text-slate-600'}`}>
                          {plan.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{plan.durationLabel}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-amber-600">¥</span>
                          <span className="text-2xl font-bold text-amber-600">{plan.price}</span>
                        </div>
                        <div className="text-xs text-slate-400 line-through">¥{plan.originalPrice}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpgrade}
                disabled={loading || !plans.length}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Crown size={20} className="fill-white/20" />
                立即开通会员
              </button>
              <p className="text-center text-xs text-slate-400 mt-4">支付即代表同意《会员服务协议》</p>
            </div>
          </div>
        )}

        {/* 底部功能简述（所有用户可见） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-2">极速信息聚合</h3>
            <p className="text-slate-500 text-sm">全网校招信息实时同步，把握黄金投递期。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-2">进度一目了然</h3>
            <p className="text-slate-500 text-sm">可视化投递漏斗，记录笔试面试，提升转化率。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-2">优质内推资源</h3>
            <p className="text-slate-500 text-sm">会员专属内推码库，直达面试官。</p>
          </div>
        </div>
      </div>
    </div>
  );
};
