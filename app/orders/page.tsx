"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, Crown, FileText, RefreshCw, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { useUser } from "@/components/UserContext";
import { PaymentStatusBadge, getBizStatusLabel, getProductTypeLabel } from "@/components/PaymentStatusBadge";
import { fetchPaymentOrder, fetchPaymentOrders, formatAmount, type PaymentOrderSummary } from "@/lib/payment";

const STATUS_FILTERS = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待确认" },
  { value: "paid", label: "已支付" },
  { value: "failed", label: "支付失败" },
  { value: "cancelled", label: "已取消" },
];

const TYPE_FILTERS = [
  { value: "all", label: "全部订单" },
  { value: "vip", label: "会员订单" },
  { value: "material", label: "资料订单" },
];

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isPending(order: PaymentOrderSummary) {
  return order.payStatus === "pending";
}

export default function OrdersPage() {
  const { user, onLogin } = useUser();
  const [orders, setOrders] = useState<PaymentOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshingOrderNo, setRefreshingOrderNo] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, pendingCount: 0, paidCount: 0 });

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchPaymentOrders({
        status: statusFilter,
        productType: typeFilter,
        limit: 50,
      });
      setOrders(response.items);
      setMeta({
        total: response.total,
        pendingCount: response.pendingCount,
        paidCount: response.paidCount,
      });
    } catch (error) {
      console.error("Failed to load payment orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, user?.id]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const stats = useMemo(() => {
    const amountTotal = orders
      .filter((order) => order.payStatus === "paid")
      .reduce((sum, order) => sum + order.amount, 0);

    const vipCount = orders.filter((order) => order.productType === "vip" && order.payStatus === "paid").length;
    const materialCount = orders.filter((order) => order.productType === "material" && order.payStatus === "paid").length;

    return {
      amountTotal,
      vipCount,
      materialCount,
    };
  }, [orders]);

  const handleRefreshOrder = async (orderNo: string) => {
    try {
      setRefreshingOrderNo(orderNo);
      await fetchPaymentOrder(orderNo);
      await loadOrders();
    } catch (error) {
      alert(error instanceof Error ? error.message : "刷新订单状态失败");
    } finally {
      setRefreshingOrderNo(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(255,107,74,0.18),_transparent_32%),linear-gradient(180deg,#fffaf5_0%,#fff 52%,#f7fbfb_100%)]">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:px-8">
          <div className="mb-6 inline-flex rounded-full border border-orange-200 bg-white/90 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm shadow-orange-100">
            支付记录中心
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            每一笔支付，都应该可追溯、可确认。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            登录后可查看会员开通、资料购买、待确认订单与支付时间线，出现异常时也能快速定位订单号并联系客服。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onLogin}
              className="rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5"
            >
              微信登录后查看订单
            </button>
            <Link
              href="/vip"
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6B4A]"
            >
              去开通会员
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top,_rgba(255,107,74,0.18),_transparent_26%),linear-gradient(180deg,#fffaf5_0%,#fff 48%,#f3f8f8_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_80px_-40px_rgba(255,107,74,0.45)] backdrop-blur sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(13,115,119,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(255,107,74,0.16),_transparent_26%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
                <ReceiptText className="h-4 w-4" />
                Payment Ledger
              </div>
              <h1 className="mt-5 font-serif text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                我的订单
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                这里汇总会员开通、资料购买与待确认订单。若微信已支付但页面未刷新，可进入详情页手动刷新状态，系统会主动向微信查单补账。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
                <div className="text-xs text-slate-500">全部订单</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{meta.total}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
                <div className="text-xs text-amber-700">待确认</div>
                <div className="mt-2 text-2xl font-semibold text-amber-800">{meta.pendingCount}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                <div className="text-xs text-emerald-700">已支付</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-800">{meta.paidCount}</div>
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 shadow-sm">
                <div className="text-xs text-teal-700">累计支付</div>
                <div className="mt-2 text-2xl font-semibold text-teal-800">¥{formatAmount(stats.amountTotal)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="rounded-2xl bg-orange-100 p-3 text-[#FF6B4A]"><Crown className="h-5 w-5" /></div>
              <div>
                <div className="text-sm text-slate-500">会员订单</div>
                <div className="text-2xl font-semibold">{stats.vipCount}</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="rounded-2xl bg-teal-100 p-3 text-[#0D7377]"><FileText className="h-5 w-5" /></div>
              <div>
                <div className="text-sm text-slate-500">资料订单</div>
                <div className="text-2xl font-semibold">{stats.materialCount}</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/70 bg-slate-900 p-6 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-orange-300"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <div className="text-sm text-white/70">支付保护</div>
                <div className="mt-1 text-base font-medium">支持微信回调 + 查单补账</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-500">订单筛选</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">按照支付状态或商品类型快速定位</div>
            </div>
            <button
              onClick={() => void loadOrders()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6B4A]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              刷新列表
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${statusFilter === filter.value ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTypeFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${typeFilter === filter.value ? "bg-[#0D7377] text-white shadow-lg shadow-teal-100" : "bg-teal-50 text-teal-700 hover:bg-teal-100"}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/85 p-10 text-center text-slate-500 shadow-sm">订单正在装订成册，请稍候…</div>
          ) : orders.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm">
              <Sparkles className="mx-auto h-8 w-8 text-orange-400" />
              <h2 className="mt-4 text-2xl font-semibold text-slate-900">还没有订单记录</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">你可以先开通会员或购买笔面试资料，后续所有支付都会在这里沉淀为可回溯记录。</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/vip" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5">查看会员方案</Link>
                <Link href="/exam" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:text-[#FF6B4A]">浏览资料专区</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article key={order.orderNo} className="group overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <PaymentStatusBadge status={order.payStatus} />
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{getProductTypeLabel(order.productType)}</span>
                        <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">{order.orderNo}</span>
                      </div>

                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{order.productName}</h2>
                        <p className="mt-1 text-sm text-slate-500">业务状态：{getBizStatusLabel(order.bizStatus)} · 创建时间：{formatDateTime(order.createdAt)}</p>
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">支付金额</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">¥{formatAmount(order.amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">支付时间</div>
                          <div className="mt-1 font-medium text-slate-700">{formatDateTime(order.payTime)}</div>
                        </div>
                        {order.validEndAt && (
                          <div>
                            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">权益截止</div>
                            <div className="mt-1 font-medium text-slate-700">{formatDateTime(order.validEndAt)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                      {isPending(order) && (
                        <button
                          onClick={() => void handleRefreshOrder(order.orderNo)}
                          disabled={refreshingOrderNo === order.orderNo}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshingOrderNo === order.orderNo ? "animate-spin" : ""}`} />
                          刷新状态
                        </button>
                      )}
                      <Link
                        href={`/orders/${order.orderNo}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        查看详情
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </Link>
                      {isPending(order) && (
                        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5 text-amber-500" />
                          若已完成支付，可点“刷新状态”主动补单
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
