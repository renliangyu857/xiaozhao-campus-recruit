import { prisma } from "./prisma";

/**
 * 支付配置 - 商品价格、首月优惠等
 */

export const PRODUCT_CONFIG = {
  vip: {
    "1_month": {
      name: "月度会员",
      getPrice: async (userId: bigint): Promise<number> => {
        // 检查用户是否购买过VIP
        const hasPurchased = await prisma.order.findFirst({
          where: {
            userId,
            productType: "vip",
            payStatus: "paid",
          },
        });

        // 首月5.8元，之后9.9元（单位：分）
        return hasPurchased ? 10 : 10;
      },
      originalPrice: 990, // 原价9.9元
      durationDays: 30,
    },
    "3_month": {
      name: "季度会员",
      price: 1660, // 16.6元
      originalPrice: 2970, // 29.7元（原价）
      durationDays: 90,
    },
    "1_year": {
      name: "年度会员",
      price: 4990, // 49.9元
      originalPrice: 11880, // 118.8元（原价）
      durationDays: 365,
    },
  },
  material: {
    defaultPrice: 660, // 6.6元
  },
};

export type ProductType = "vip" | "material";
export type VipPlanId = "1_month" | "3_month" | "1_year";

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
    const planId = productId as VipPlanId;
    const plan = PRODUCT_CONFIG.vip[planId];

    if (!plan) {
      throw new Error("无效的会员套餐");
    }

    // 月度会员可能有首月优惠
    if (planId === "1_month") {
      const monthPlan = plan as { name: string; getPrice: (userId: bigint) => Promise<number>; originalPrice: number; durationDays: number };
      const price = await monthPlan.getPrice(userId);
      const isFirstMonth = price < monthPlan.originalPrice;
      return {
        price,
        originalPrice: monthPlan.originalPrice,
        productName: monthPlan.name,
        isFirstMonth,
      };
    }

    // 季度/年度固定价格
    const fixedPlan = plan as { name: string; price: number; originalPrice: number; durationDays: number };
    return {
      price: fixedPlan.price,
      originalPrice: fixedPlan.originalPrice,
      productName: fixedPlan.name,
    };
  }

  if (productType === "material") {
    // 资料价格由调用方传入，或使用默认价格
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
 * 计算VIP有效期
 */
export function calculateVipValidity(
  planId: VipPlanId,
  currentEndAt?: Date
): { startAt: Date; endAt: Date } {
  const now = new Date();

  // 如果有当前有效会员，从结束时间开始顺延
  const startAt = currentEndAt && currentEndAt > now ? new Date(currentEndAt) : now;
  const endAt = new Date(startAt);

  switch (planId) {
    case "1_month":
      endAt.setMonth(endAt.getMonth() + 1);
      break;
    case "3_month":
      endAt.setMonth(endAt.getMonth() + 3);
      break;
    case "1_year":
      endAt.setFullYear(endAt.getFullYear() + 1);
      break;
  }

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
    return ["1_month", "3_month", "1_year"].includes(productId);
  }
  if (productType === "material") {
    return productId.length > 0;
  }
  return false;
}
