import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApplyStatus, Job, User } from './types';
import { NavBar } from './components/NavBar';
import { HomePage } from './pages/HomePage';
import { VIPPage } from './pages/VIPPage';
import { ReferralCodesPage } from './pages/ReferralCodesPage';
import { InvitePage } from './pages/InvitePage';
import { ProgressPage } from './pages/ProgressPage';
import { getCurrentUser, wechatLogin } from './services/authService';
import { bindInviteCode } from './services/inviteService';
import { fetchJobsPage, updateJobStatus as apiUpdateJobStatus } from './services/jobService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const code = params.get('inviteCode');
    if (code) sessionStorage.setItem('inviteCode', code);
  }, []);

  const defaultFilters = { industry: 'ALL' as const, type: 'ALL' as const, location: '', deadlineDays: 'ALL' as const, roles: '' };

  const loadJobsIfHasPermission = (u: User) => {
    fetchJobsPage(defaultFilters, false, 0, 30)
      .then((res) => setJobs(res.content || []))
      .catch(() => setJobs([]));
  };

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
        if (u?.id) loadJobsIfHasPermission(u);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const code = sessionStorage.getItem('inviteCode');
    if (!code) return;
    sessionStorage.removeItem('inviteCode');
    bindInviteCode(code).then(() => {}).catch(() => {});
  }, [user?.id]);

  const handleLogin = () => {
    (async () => {
      // 开发 stub：后端未配置微信时 code 会直接当 openid 使用
      const code = window.prompt('输入微信 code（开发模式可随便填，例如 openid_abc123）：', `openid_${Date.now()}`);
      if (!code) return;
      try {
        const u = await wechatLogin(code);
        setUser(u);
        const savedCode = sessionStorage.getItem('inviteCode');
        if (savedCode) {
          sessionStorage.removeItem('inviteCode');
          try { await bindInviteCode(savedCode); } catch (_) {}
        }
        if (u?.id) loadJobsIfHasPermission(u);
      } catch (e: any) {
        alert(e?.body?.message || e?.message || '登录失败');
      }
    })();
  };

  const handleUpgrade = (planId: string) => {
    if (!user) return;
    
    // Calculate expiry based on plan
    const now = new Date();
    if (planId === '1_month') now.setMonth(now.getMonth() + 1);
    if (planId === '3_month') now.setMonth(now.getMonth() + 3);
    if (planId === 'lifetime') now.setFullYear(now.getFullYear() + 99);

    const updatedUser: User = {
      ...user,
      isVip: true,
      vipExpiry: now.toISOString().split('T')[0],
    };
    setUser(updatedUser);
    alert('模拟：支付成功，会员已开通！');
  };

  const updateQueryCount = () => {
    // 查询次数由后端 /query/consume 控制，这里不再本地自增
  };

  const updateJobStatus = (id: string, status: ApplyStatus) => {
    (async () => {
      if (!user) {
        alert('请先登录后操作');
        return;
      }
      try {
        await apiUpdateJobStatus(id, status);
        setJobs(prev => prev.map(j => (j.id === id ? { ...j, status } : j)));
      } catch (e: any) {
        alert(e?.body?.message || e?.message || '更新失败');
      }
    })();
  };

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen">
        <NavBar user={user} onLogin={handleLogin} />
        <main className="flex-grow">
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage 
                  user={user} 
                  jobs={jobs} 
                  onUpdateQueryCount={updateQueryCount} 
                  onUpdateJobStatus={updateJobStatus}
                  onJobsUpdated={setJobs}
                  onLogin={handleLogin}
                />
              } 
            />
            <Route 
              path="/vip" 
              element={
                <VIPPage 
                  user={user} 
                  onUpgrade={handleUpgrade} 
                />
              } 
            />
            <Route path="/referral-codes" element={<ReferralCodesPage user={user} />} />
            <Route path="/invite" element={<InvitePage user={user} />} />
            <Route 
              path="/progress" 
              element={
                  user ? (
                    <ProgressPage jobs={jobs} />
                  ) : (
                    <div className="text-center py-20">
                        <p className="text-slate-500 mb-4">请登录后查看投递统计</p>
                        <button onClick={handleLogin} className="text-blue-600 font-bold">去登录</button>
                    </div>
                  )
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;