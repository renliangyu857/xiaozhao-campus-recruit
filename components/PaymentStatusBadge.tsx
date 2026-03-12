import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";

const PAYMENT_STATUS_META: Record<string, {
  label: string;
  className: string;
  icon: typeof Clock3;
}> = {
  pending: {
    label: "待确认",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  paid: {
    label: "已支付",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  failed: {
    label: "支付失败",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: XCircle,
  },
  cancelled: {
    label: "已取消",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    icon: AlertTriangle,
  },
  closed: {
    label: "已关闭",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    icon: AlertTriangle,
  },
};

const BIZ_STATUS_META: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "处理失败",
};

const PRODUCT_TYPE_META: Record<string, string> = {
  vip: "会员订单",
  material: "资料订单",
};

export function getPaymentStatusMeta(status: string) {
  return PAYMENT_STATUS_META[status] ?? {
    label: status || "未知状态",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    icon: LoaderCircle,
  };
}

export function getBizStatusLabel(status: string) {
  return (BIZ_STATUS_META[status] ?? status) || "未知";
}

export function getProductTypeLabel(type: string) {
  return (PRODUCT_TYPE_META[type] ?? type) || "订单";
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const meta = getPaymentStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}
