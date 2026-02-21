import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { getInviteStats, InviteStats } from '../services/inviteService';
import { Share2, Gift, Copy, CheckCircle } from 'lucide-react';

/** 邀请规则：前5人每人2天，第6人起每人4天，最高1个月。生成 30 条滚动文案（mpweixin*** 已邀请 N 人获得 R），打乱后返回 */
function buildInviteTickerMessages(): string[] {
  const messages: string[] = [];
  const name = 'mpweixin***';
  for (let i = 0; i < 30; i++) {
    const n = Math.floor(Math.random() * 11) + 1;
    const reward = n > 10 ? '1 个月 VIP' : n <= 5 ? `${2 * n} 天 VIP` : `${10 + (n - 5) * 4} 天 VIP`;
    messages.push(`${name} 已邀请 ${n} 人获得 ${reward}`);
  }
  return messages.sort(() => Math.random() - 0.5);
}

const INVITE_TICKER_MESSAGES = buildInviteTickerMessages();

interface InvitePageProps {
  user: User | null;
}

function buildInviteLink(inviteCode: string): string {
  const base = window.location.origin + window.location.pathname + (window.location.hash.split('?')[0] || '#/');
  const sep = base.includes('?') ? '&' : '?';
  return base + sep + 'inviteCode=' + inviteCode;
}

export const InvitePage: React.FC<InvitePageProps> = ({ user }) => {
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTickerIndex((i) => (i + 1) % INVITE_TICKER_MESSAGES.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getInviteStats()
      .then(setStats)
      .catch((e) => console.error(e));
  }, [user?.id]);

  const inviteLink = stats?.inviteCode ? buildInviteLink(stats.inviteCode) : '';

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">请先登录</h2>
          <p className="text-slate-500 mt-2">登录后即可参与邀请活动</p>
          <a href="#/" className="mt-4 inline-block text-blue-600 font-medium">返回首页</a>
        </div>
      </div>
    );
  }

  const totalInvited = stats?.totalInvited ?? 0;
  const progress = Math.min(totalInvited, 10);
  const nextReward = totalInvited < 5 ? '前5人每人2天' : totalInvited < 10 ? '1个月VIP' : '已达成最高奖励';
  const needed = totalInvited < 10 ? 10 - totalInvited : 0;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4">
      {/* 邀请滚动条 */}
      <div className="fixed top-16 left-0 right-0 z-40 border-b border-blue-100 bg-blue-50 py-2 overflow-hidden">
        <div className="flex justify-center items-center gap-2">
          <span className="text-xs font-medium text-blue-800">
            {INVITE_TICKER_MESSAGES[tickerIndex]}
          </span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto space-y-6 pt-10">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-bold border border-amber-200 shadow-sm">
            <Gift size={20} /> 邀请有礼
          </span>
        </div>
        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">邀请有礼 · 免费领 VIP</h1>
            <p className="text-blue-100 text-lg">前 5 人每人得 2 天 VIP，第 6 人起每人 4 天，最高可得 1 个月 VIP</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-blue-200 mb-1">我的邀请码</div>
                <div className="text-2xl font-mono font-bold tracking-wider">
                  {stats?.inviteCode || '加载中…'}
                </div>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-blue-200 mb-1">已成功邀请</div>
                <div className="text-2xl font-bold">
                  {totalInvited} <span className="text-sm font-normal text-blue-200">人</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Gift className="text-amber-500" /> 奖励进度
          </h3>
          <div className="relative pt-6 pb-2">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${(progress / 10) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-4 text-sm">
              <div className="text-center w-10 -ml-5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 mx-auto ${totalInvited >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>0</div>
                <span className="text-slate-500">起点</span>
              </div>
              <div className="text-center w-20 -ml-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 mx-auto ${totalInvited >= 5 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>5</div>
                <span className="font-bold text-slate-700">每人4天</span>
              </div>
              <div className="text-center w-20 -mr-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 mx-auto ${totalInvited >= 10 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>10</div>
                <span className="font-bold text-slate-700">1个月VIP</span>
              </div>
            </div>
          </div>
          {needed > 0 ? (
            <div className="mt-6 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm text-center">
              再邀请 <span className="font-bold">{needed}</span> 人即可获得 <span className="font-bold">{nextReward}</span>
            </div>
          ) : (
            <div className="mt-6 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm text-center font-bold">
              🎉 太棒了！您已解锁所有阶段奖励！
            </div>
          )}
        </div>

        {/* Share Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Share2 className="text-blue-500" /> 立即分享
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 text-slate-600 text-sm"
            />
            <button
              onClick={handleCopy}
              disabled={!inviteLink}
              className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
