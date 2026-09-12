/**
 * 支付配置 - 商品价格
 * 2026-09 重构：单一商品「19.9 永久会员」，全部功能（含网盘资料）无差别解锁。
 */

export const PRODUCT_CONFIG = {
  vip: {
    lifetime: {
      name: "永久会员",
      price: 1990, // 19.9 元（单位：分）
      originalPrice: 1990,
      durationDays: 0, // 0 表示永久
    },
  },
  material: {
    // 资料已随 19.9 永久会员解锁，不再单独售卖；defaultPrice 仅作历史兼容保留
    defaultPrice: 660,
  },
};

export type ProductType = "vip" | "material";
export type VipPlanId = "lifetime";

/** 永久会员固定到期时间 */
export const LIFETIME_END_AT = new Date("2099-12-31T23:59:59.000Z");

/**
 * 获取商品价格（单位：分）
 */
export async function getProductPrice(
  productType: ProductType,
  productId: string,
  userId: bigint,
  materialPrice?: number
): Promise<{
  price: number;
  originalPrice: number;
  productName: string;
  isFirstMonth?: boolean;
}> {
  if (productType === "vip") {
    const plan = PRODUCT_CONFIG.vip[productId as VipPlanId];
    if (!plan) {
      throw new Error("无效的会员套餐");
    }
    return {
      price: plan.price,
      originalPrice: plan.originalPrice,
      productName: plan.name,
      isFirstMonth: false,
    };
  }

  if (productType === "material") {
    const price = materialPrice || PRODUCT_CONFIG.material.defaultPrice;
    return {
      price,
      originalPrice: price,
      productName: "笔面试资料",
    };
  }

  throw new Error("无效的商品类型");
}

/**
 * 计算 VIP 有效期（永久会员固定到 2099-12-31）
 */
export function calculateVipValidity(
  _planId: VipPlanId,
  currentEndAt?: Date
): { startAt: Date; endAt: Date } {
  const now = new Date();
  const startAt = currentEndAt && currentEndAt > now ? new Date(currentEndAt) : now;
  const endAt = new Date(LIFETIME_END_AT);
  return { startAt, endAt };
}

/**
 * 生成订单号
 * 格式: ORDER_YYYYMMDD_HHMMSS_RAND
 */
export function generateOrderNo(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORDER_${dateStr}_${timeStr}_${random}`;
}

/**
 * 验证商品ID是否有效
 */
export function isValidProduct(productType: ProductType, productId: string): boolean {
  if (productType === "vip") {
    return productId === "lifetime";
  }
  if (productType === "material") {
    return productId.length > 0;
  }
  return false;
}
