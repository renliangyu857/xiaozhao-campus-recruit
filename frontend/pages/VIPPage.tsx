import React, { useEffect, useState } from 'react';
import { User, VipPlan } from '../types';
import { Check, Crown, Star, Zap, ShieldCheck, Rocket } from 'lucide-react';
import { getVipPlans, createVipOrder } from '../services/vipService';
import { ApiError } from '../services/apiClient';

interface VIPPageProps {
  user: User | null;
  onUpgrade: (planId: string) => void;
}

export const VIPPage: React.FC<VIPPageProps> = ({ user, onUpgrade }) => {
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setPlans(await getVipPlans());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePurchase = (plan: VipPlan) => {
    (async () => {
      if (!user) {
        alert('请先登录');
        return;
      }
      const confirm = window.confirm(`确认支付 ¥${plan.price} 开通 ${plan.name}？（开发模式：后端返回 stub 下单参数）`);
      if (!confirm) return;
      try {
        const order = await createVipOrder(plan.id);
        alert(`已创建订单：${order.orderNo}\n（开发模式需模拟支付回调，当前前端仅演示下单）`);
        // 仍保留旧的本地升级演示（不影响后端已下单）
        onUpgrade(plan.id);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 401) {
          alert('请先登录');
          return;
        }
        alert(e?.body?.message || e?.message || '下单失败');
      }
    })();
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-6 tracking-wide uppercase">
                Premium Membership
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl tracking-tight mb-6">
                升级会员，<br className="sm:hidden"/>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    赢在校招起跑线
                </span>
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">
                解锁无限查询权限，获取独家内推码，全流程进度可视化管理，助你轻松拿 Offer。
            </p>
        </div>

        {/* User Status Banner */}
        {user?.isVip ? (
             <div className="mb-16 mx-auto max-w-3xl bg-slate-900 rounded-3xl p-1 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="bg-slate-900 rounded-[22px] p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                    <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-900 shadow-lg shrink-0 transform rotate-3">
                            <Crown size={40} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">尊贵的 VIP 会员</h2>
                            <p className="mt-2 text-slate-400">
                                您的会员权益有效期至：<span className="font-mono font-bold text-amber-400 text-lg">{user.vipExpiry}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="mb-16 mx-auto max-w-3xl bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white text-slate-400 rounded-xl shadow-sm border border-slate-100">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">当前为普通用户</h3>
                        <p className="text-slate-500 text-sm mt-1">每日仅限 3 次查询，升级解锁全部功能</p>
                    </div>
                </div>
            </div>
        )}

        {/* Pricing Cards */}
        {!user?.isVip && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 px-2">
            {(plans.length ? plans : []).map((plan) => (
                <div 
                    key={plan.id} 
                    className={`relative bg-white rounded-3xl p-8 flex flex-col transition-all duration-300 ${
                        plan.id === '3_month' 
                        ? 'shadow-xl border-2 border-blue-600 scale-105 z-10' 
                        : 'shadow-lg border border-slate-100 hover:border-slate-300 hover:shadow-xl'
                    }`}
                >
                    {plan.tag && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg tracking-wide uppercase">
                            {plan.tag}
                        </div>
                    )}
                    
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                        <div className="mt-4 flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-400 mr-1">¥</span>
                            <span className="text-5xl font-extrabold tracking-tight text-slate-900">{plan.price}</span>
                        </div>
                        <p className="mt-2 text-slate-400 text-sm line-through">原价 ¥{plan.originalPrice}</p>
                    </div>
                    
                    <div className="space-y-4 flex-1 mb-8">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                <Check size={12} className="text-green-600" strokeWidth={3} />
                            </div>
                            <span className="text-sm text-slate-600">无限次查询筛选职位</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                <Check size={12} className="text-green-600" strokeWidth={3} />
                            </div>
                            <span className="text-sm text-slate-600">投递进度智能看板</span>
                        </div>
                        {plan.id !== '1_month' && (
                             <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                    <Check size={12} className="text-green-600" strokeWidth={3} />
                                </div>
                                <span className="text-sm text-slate-600">优先获取内推码</span>
                            </div>
                        )}
                        {plan.id === 'lifetime' && (
                             <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                    <Check size={12} className="text-green-600" strokeWidth={3} />
                                </div>
                                <span className="text-sm text-slate-600 font-medium text-amber-600">专属求职社群 (永久)</span>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => handlePurchase(plan)}
                        className={`w-full rounded-xl px-4 py-3.5 text-center text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                            plan.id === '3_month' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        立即开通
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4">
                        有效期: {plan.durationLabel}
                    </p>
                </div>
            ))}
        </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                 <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm">
                     <Rocket size={24} />
                 </div>
                 <h3 className="font-bold text-lg mb-3 text-slate-900">极速信息聚合</h3>
                 <p className="text-slate-500 text-sm leading-relaxed">全网校招信息实时同步，不再错过任何一家名企网申时间，把握黄金投递期。</p>
             </div>
             <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                 <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-purple-600 mb-6 shadow-sm">
                     <ShieldCheck size={24} />
                 </div>
                 <h3 className="font-bold text-lg mb-3 text-slate-900">进度一目了然</h3>
                 <p className="text-slate-500 text-sm leading-relaxed">可视化的投递漏斗，帮您科学复盘，记录每一次笔试面试，提升面试转化率。</p>
             </div>
             <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                 <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 mb-6 shadow-sm">
                     <Star size={24} />
                 </div>
                 <h3 className="font-bold text-lg mb-3 text-slate-900">优质内推资源</h3>
                 <p className="text-slate-500 text-sm leading-relaxed">会员专属内推码库，直达面试官，让简历不再石沉大海。</p>
             </div>
        </div>

      </div>
    </div>
  );
};