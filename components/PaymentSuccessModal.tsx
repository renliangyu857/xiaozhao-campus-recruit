"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Check, X, PartyPopper, Star } from "lucide-react";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  expiryDate: string;
  onExperience?: () => void;
  onViewBenefits?: () => void;
}

// 彩带粒子
interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
  size: number;
}

// 星星粒子
interface StarPiece {
  id: number;
  x: number;
  y: number;
  delay: number;
  scale: number;
}

export function PaymentSuccessModal({
  isOpen,
  onClose,
  planName,
  expiryDate,
  onExperience,
  onViewBenefits,
}: PaymentSuccessModalProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [stars, setStars] = useState<StarPiece[]>([]);

  // 生成彩带
  const generateConfetti = useCallback(() => {
    const colors = ["#FF6B4A", "#FFD93D", "#0D7377", "#FF8F7A", "#14A085", "#C9A227"];
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 30; i++) {
      pieces.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        size: 8 + Math.random() * 8,
      });
    }
    setConfetti(pieces);
  }, []);

  // 生成星星
  const generateStars = useCallback(() => {
    const starPieces: StarPiece[] = [];
    for (let i = 0; i < 12; i++) {
      starPieces.push({
        id: i,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 60,
        delay: 0.3 + Math.random() * 0.7,
        scale: 0.5 + Math.random() * 0.8,
      });
    }
    setStars(starPieces);
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateConfetti();
      generateStars();
      // 6秒后自动关闭
      const timer = setTimeout(() => {
        onClose();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, generateConfetti, generateStars]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 彩带动画 */}
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{
                y: -20,
                x: `${piece.x}%`,
                opacity: 1,
                rotate: 0,
              }}
              animate={{
                y: "100vh",
                rotate: piece.rotation,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random() * 1,
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="fixed top-0 pointer-events-none z-50"
              style={{
                width: piece.size,
                height: piece.size * 0.6,
                backgroundColor: piece.color,
                borderRadius: 2,
              }}
            />
          ))}

          {/* 主弹窗 */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
            }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl z-50"
          >
            {/* 顶部装饰背景 */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-br from-[#FF6B4A] via-[#FF8F7A] to-[#0D7377]">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30" />

              {/* 漂浮星星 */}
              {stars.map((star) => (
                <motion.div
                  key={star.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: star.scale }}
                  transition={{
                    duration: 1.5,
                    delay: star.delay,
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  }}
                  className="absolute"
                  style={{ left: `${star.x}%`, top: `${star.y}%` }}
                >
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                </motion.div>
              ))}
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* 内容区域 */}
            <div className="relative pt-12 pb-8 px-8">
              {/* 成功图标 */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1,
                }}
                className="mx-auto w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#0D7377] flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                  >
                    <PartyPopper className="w-10 h-10 text-white" />
                  </motion.div>
                </div>
              </motion.div>

              {/* 成功文字 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF6B4A]" />
                  支付成功
                  <Sparkles className="w-5 h-5 text-[#FF6B4A]" />
                </h2>
                <p className="text-slate-500">欢迎加入 VIP 会员大家庭</p>
              </motion.div>

              {/* 会员信息卡片 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 mb-6 border border-orange-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] flex items-center justify-center shadow-lg">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">已开通</p>
                    <p className="text-lg font-bold text-slate-800">{planName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 rounded-xl p-3">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>
                    有效期至：
                    <span className="font-semibold text-slate-800 ml-1">{expiryDate}</span>
                  </span>
                </div>
              </motion.div>

              {/* 权益提示 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-4 text-xs text-slate-400 mb-6"
              >
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  无限查询
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  进度管理
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  内推码库
                </span>
              </motion.div>

              {/* 按钮组 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <button
                  onClick={() => {
                    onExperience?.();
                    onClose();
                  }}
                  className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:-translate-y-0.5 transition-all duration-200"
                >
                  立即体验
                </button>
                <button
                  onClick={() => {
                    onViewBenefits?.();
                    onClose();
                  }}
                  className="w-full py-3.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  查看权益详情
                </button>
              </motion.div>
            </div>

            {/* 底部装饰 */}
            <div className="h-1.5 bg-gradient-to-r from-[#FF6B4A] via-[#FF8F7A] to-[#0D7377]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
