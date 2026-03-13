import { apiFetch } from "./apiClient";
import { PAYMENT_ORDER_EXPIRY_SECONDS } from "./payment-constants";

/**
 * 创建支付订单
 */
export interface CreatePaymentParams {
  productType: "vip" | "material";
  productId: string;
  materialId?: string;
  materialName?: string;
  materialPrice?: number;
}

export interface CreatePaymentResult {
  orderNo: string;
  productName: string;
  amount: number;
  originalAmount?: number;
  isFirstMonth?: boolean;
  qrcodeUrl: string;
  qrcodeImageUrl: string;
  expiryTime: number;
}

export interface PaymentOrderSummary {
  orderNo: string;
  productType: string;
  productId: string;
  productName: string;
  amount: number;
  originalAmount?: number;
  payStatus: "pending" | "paid" | "failed" | "cancelled" | "closed" | string;
  bizStatus: string;
  payTime?: string;
  createdAt: string;
  validEndAt?: string;
}

export interface PaymentOrderDetail extends PaymentOrderSummary {
  wxTransactionId?: string;
  notifyCount?: number;
  lastNotifyAt?: string;
  canRefresh?: boolean;
}

export interface PaymentOrdersResponse {
  total: number;
  pendingCount: number;
  paidCount: number;
  items: PaymentOrderSummary[];
}

export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const response = await apiFetch<{ success: boolean; data: CreatePaymentResult }>(
    "/payment/create",
    {
      method: "POST",
      json: params,
    }
  );

  if (!response.success) {
    throw new Error("创建支付订单失败");
  }

  return response.data;
}

/**
 * 查询订单状态
 */
export interface OrderStatus {
  orderNo: string;
  payStatus: "pending" | "paid" | "failed" | "cancelled";
  productType: string;
  productName: string;
  amount: number;
  originalAmount?: number;
  payTime?: string;
  validEndAt?: string;
  createdAt: string;
}

export async function queryOrderStatus(orderNo: string): Promise<OrderStatus> {
  const response = await apiFetch<{ success: boolean; data: OrderStatus }>(
    `/payment/order/${orderNo}`
  );

  if (!response.success) {
    throw new Error("查询订单状态失败");
  }

  return response.data;
}

export async function fetchPaymentOrders(params?: {
  status?: string;
  productType?: string;
  limit?: number;
}): Promise<PaymentOrdersResponse> {
  const searchParams = new URLSearchParams();

  if (params?.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }

  if (params?.productType && params.productType !== "all") {
    searchParams.set("productType", params.productType);
  }

  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  const response = await apiFetch<{ success: boolean; data: PaymentOrdersResponse }>(
    `/payment/orders${query ? `?${query}` : ""}`
  );

  if (!response.success) {
    throw new Error("查询订单列表失败");
  }

  return response.data;
}

export async function fetchPaymentOrder(orderNo: string): Promise<PaymentOrderDetail> {
  const response = await apiFetch<{ success: boolean; data: PaymentOrderDetail }>(
    `/payment/order/${orderNo}?t=${Date.now()}`
  );

  if (!response.success) {
    throw new Error("查询订单详情失败");
  }

  return response.data;
}

/**
 * 轮询查询订单状态
 */
export async function pollOrderStatus(
  orderNo: string,
  options: {
    onSuccess?: (status: OrderStatus) => void;
    onExpired?: () => void;
    onError?: (error: Error) => void;
    interval?: number;
    maxAttempts?: number;
  } = {}
): Promise<OrderStatus> {
  const { onSuccess, onExpired, onError, interval = 2000, maxAttempts } = options;
  const resolvedMaxAttempts = maxAttempts ?? Math.ceil((PAYMENT_ORDER_EXPIRY_SECONDS * 1000) / interval);

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = async () => {
      try {
        attempts++;
        const status = await queryOrderStatus(orderNo);

        if (status.payStatus === "paid") {
          onSuccess?.(status);
          resolve(status);
          return;
        }

        if (status.payStatus === "failed" || status.payStatus === "cancelled") {
          reject(new Error(`订单${status.payStatus === "failed" ? "支付失败" : "已取消"}`));
          return;
        }

        if (attempts >= resolvedMaxAttempts) {
          onExpired?.();
          reject(new Error("支付超时，请重新下单"));
          return;
        }

        setTimeout(check, interval);
      } catch (error) {
        onError?.(error as Error);

        if (attempts >= resolvedMaxAttempts) {
          reject(error);
          return;
        }

        setTimeout(check, interval);
      }
    };

    check();
  });
}

/**
 * 获取二维码图片URL
 */
export function getQRCodeImageUrl(orderNo: string): string {
  return `/api/payment/qrcode/${orderNo}`;
}

/**
 * 格式化金额（分转元）
 */
export function formatAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}

/**
 * 计算倒计时秒数
 */
export function calculateCountdown(expiryTime: number): number {
  const normalizedExpiryTime = expiryTime < 1_000_000_000_000 ? expiryTime * 1000 : expiryTime;
  return Math.max(0, Math.ceil((normalizedExpiryTime - Date.now()) / 1000));
}
