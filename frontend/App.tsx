import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApplyStatus, Job, User } from './types';
import { NavBar } from './components/NavBar';
import { HomePage } from './pages/HomePage';
import { VIPPage } from './pages/VIPPage';
import { ProgressPage } from './pages/ProgressPage';
import { getCurrentUser, logout, wechatLogin } from './services/authService';
import { fetchJobsPage, updateJobStatus as apiUpdateJobStatus } from './services/jobService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    (async () => {
      // 1) 当前用户（基于 Spring Session cookie）
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch {
        setUser(null);
      }
      // 2) 初始列表（仅登录用户加载，未登录时不加载）
      // 注意：如果用户已登录，这里可以预加载第一页；未登录时由用户点击查询时提示登录
      // 暂时不自动加载，等待用户主动查询
    })();
  }, []);

  const handleLogin = () => {
    (async () => {
      // 开发 stub：后端未配置微信时 code 会直接当 openid 使用
      const code = window.prompt('输入微信 code（开发模式可随便填，例如 openid_abc123）：', `openid_${Date.now()}`);
      if (!code) return;
      try {
        const u = await wechatLogin(code);
        setUser(u);
        // 登录成功后可以预加载第一页数据（可选）
        // const emptyFilters: any = { industry: 'ALL', type: 'ALL', location: '', deadlineDays: 'ALL', roles: '' };
        // const result = await fetchJobsPage(emptyFilters, false, 0, 30);
        // setJobs(result.content || []);
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