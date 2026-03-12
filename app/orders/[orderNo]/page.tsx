"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, RefreshCw, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { PaymentStatusBadge, getBizStatusLabel, getProductTypeLabel } from "@/components/PaymentStatusBadge";
import { fetchPaymentOrder, formatAmount, type PaymentOrderDetail } from "@/lib/payment";

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function OrderDetailPage() {
  const { user, onLogin } = useUser();
  const params = useParams<{ orderNo: string }>();
  const orderNo = params?.orderNo ?? "";

  const [order, setOrder] = useState<PaymentOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderNo || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchPaymentOrder(orderNo);
      setOrder(response);
    } catch (error) {
      console.error("Failed to load payment order:", error);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderNo, user?.id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const timeline = useMemo(() => {
    if (!order) return [];

    return [
      {
        title: "订单创建",
        time: formatDateTime(order.createdAt),
        desc: "系统已生成支付订单并保留支付凭证。",
      },
      {
        title: order.payStatus === "paid" ? "支付成功" : "等待支付确认",
        time: formatDateTime(order.payTime),
        desc: order.payStatus === "paid"
          ? "微信支付已确认成功，订单进入权益发放流程。"
          : "若微信端已扣款，可点击刷新状态触发主动查单。",
      },
      {
        title: `业务状态：${getBizStatusLabel(order.bizStatus)}`,
        time: order.lastNotifyAt ? formatDateTime(order.lastNotifyAt) : "—",
        desc: order.bizStatus === "completed"
          ? "权益已处理完成，可正常使用。"
          : "系统仍在同步或等待下一次状态确认。",
      },
    ];
  }, [order]);

  const handleRefresh = async () => {
    if (!orderNo) return;
    try {
      setRefreshing(true);
      const response = await fetchPaymentOrder(orderNo);
      setOrder(response);
    } catch (error) {
      alert(error instanceof Error ? error.message : "刷新订单失败");
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#fffaf5_0%,#fff_56%,#f6fbfb_100%)] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-sm">
          <h1 className="font-serif text-4xl font-semibold text-slate-900">登录后查看订单详情</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">订单详情页会展示支付状态、业务处理进度与微信交易号，方便你回溯每一笔支付。</p>
          <button
            onClick={onLogin}
            className="mt-8 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            微信登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(255,107,74,0.16),_transparent_22%),linear-gradient(180deg,#fffaf5_0%,#fff_45%,#f3f8f8_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/orders" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6B4A]">
            <ArrowLeft className="h-4 w-4" />
            返回订单列表
          </Link>
          {order?.canRefresh && (
            <button
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              刷新状态
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-10 text-center text-slate-500 shadow-sm">正在调取订单档案，请稍候…</div>
        ) : !order ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/85 p-12 text-center shadow-sm">
            <Sparkles className="mx-auto h-8 w-8 text-orange-400" />
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">这笔订单暂时无法查看</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">请确认订单号是否正确，或返回订单列表重新选择。</p>
          </div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.45)] sm:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(13,115,119,0.14),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,107,74,0.14),_transparent_30%)]" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {getProductTypeLabel(order.productType)}
                  </div>
                  <h1 className="mt-5 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">{order.productName}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <PaymentStatusBadge status={order.payStatus} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">业务状态：{getBizStatusLabel(order.bizStatus)}</span>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-500">订单号：<span className="font-mono text-slate-700">{order.orderNo}</span></p>
                </div>

                <div className="rounded-[1.75rem] bg-slate-900 px-6 py-5 text-white shadow-xl shadow-slate-200">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/60">支付金额</div>
                  <div className="mt-2 text-4xl font-semibold">¥{formatAmount(order.amount)}</div>
                  {order.originalAmount && order.originalAmount > order.amount && (
                    <div className="mt-2 text-sm text-white/60 line-through">原价 ¥{formatAmount(order.originalAmount)}</div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3 text-slate-900">
                  <div className="rounded-2xl bg-orange-100 p-3 text-[#FF6B4A]"><TimerReset className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-xl font-semibold">订单时间线</h2>
                    <p className="text-sm text-slate-500">从下单到到账，把每个关键节点都留档。</p>
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  {timeline.map((item, index) => (
                    <div key={item.title} className="relative pl-10">
                      {index !== timeline.length - 1 && <div className="absolute left-[0.95rem] top-9 h-[calc(100%+0.75rem)] w-px bg-slate-200" />}
                      <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg shadow-slate-200">
                        {index === 0 ? <Clock3 className="h-4 w-4" /> : index === 1 ? <CreditCard className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-base font-semibold text-slate-900">{item.title}</div>
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{item.time}</div>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="rounded-2xl bg-teal-100 p-3 text-[#0D7377]"><ShieldCheck className="h-5 w-5" /></div>
                    <div>
                      <h2 className="text-lg font-semibold">支付档案</h2>
                      <p className="text-sm text-slate-500">便于自助回溯或联系客服时提供。</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4 text-sm text-slate-600">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">微信交易号</div>
                      <div className="mt-2 break-all font-mono text-slate-800">{order.wxTransactionId || "支付完成后自动写入"}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">支付时间</div>
                      <div className="mt-2 text-slate-800">{formatDateTime(order.payTime)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">最后同步</div>
                      <div className="mt-2 text-slate-800">{formatDateTime(order.lastNotifyAt)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">回调计数</div>
                      <div className="mt-2 text-slate-800">{order.notifyCount ?? 0}</div>
                    </div>
                    {order.validEndAt && (
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">权益截止</div>
                        <div className="mt-2 text-slate-800">{formatDateTime(order.validEndAt)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
                  <div className="text-sm font-semibold text-amber-800">支付异常时怎么做？</div>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-amber-900/80">
                    <li>1. 微信侧已支付但页面未更新时，先点击“刷新状态”。</li>
                    <li>2. 若仍未到账，请保留本页订单号和微信交易号。</li>
                    <li>3. 联系客服时优先提供订单号：<span className="font-mono">{order.orderNo}</span></li>
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
