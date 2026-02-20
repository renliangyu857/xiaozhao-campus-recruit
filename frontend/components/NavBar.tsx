import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Crown, BarChart3, List, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types';

interface NavBarProps {
  user: User | null;
  onLogin: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({ user, onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => 
    location.pathname === path 
      ? 'text-blue-600 bg-blue-50/80 font-semibold' 
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium';

  return (
    <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => navigate('/')}
            >
              <div className="bg-blue-600 p-1.5 rounded-lg text-white group-hover:scale-105 transition-transform">
                 <Sparkles size={20} fill="currentColor" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                JobHub
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-1">
              <button
                onClick={() => navigate('/')}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${isActive('/')}`}
              >
                <List size={16} />
                招聘列表
              </button>
              <button
                onClick={() => navigate('/progress')}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${isActive('/progress')}`}
              >
                <BarChart3 size={16} />
                进度统计
              </button>
              <button
                onClick={() => navigate('/vip')}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 flex items-center gap-2 ${isActive('/vip')}`}
              >
                <Crown size={16} className={user?.isVip ? 'text-yellow-500 fill-yellow-500' : ''} />
                会员中心
              </button>
            </div>
          </div>
          
          {/* User Section */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                 {user.isVip && (
                    <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/50">
                      <Crown size={12} className="fill-current" /> VIP
                    </span>
                 )}
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shadow-sm group-hover:shadow transition-all">
                        <UserIcon size={18} className="text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 hidden sm:block group-hover:text-blue-600 transition-colors">
                      {user.nickname}
                    </span>
                </div>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm hover:shadow-md active:scale-95 duration-200"
              >
                微信登录
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden flex justify-around border-t border-slate-100 bg-white/95 backdrop-blur-sm fixed bottom-0 w-full pb-safe pt-2 pb-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={() => navigate('/')} className={`flex flex-col items-center p-2 rounded-lg w-16 ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-400'}`}>
            <List size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium mt-1">列表</span>
          </button>
          <button onClick={() => navigate('/progress')} className={`flex flex-col items-center p-2 rounded-lg w-16 ${location.pathname === '/progress' ? 'text-blue-600' : 'text-slate-400'}`}>
            <BarChart3 size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium mt-1">进度</span>
          </button>
           <button onClick={() => navigate('/vip')} className={`flex flex-col items-center p-2 rounded-lg w-16 ${location.pathname === '/vip' ? 'text-blue-600' : 'text-slate-400'}`}>
            <Crown size={22} strokeWidth={2.5} className={user?.isVip ? 'text-yellow-500 fill-yellow-500' : ''}/>
            <span className="text-[10px] font-medium mt-1">会员</span>
          </button>
      </div>
    </nav>
  );
};