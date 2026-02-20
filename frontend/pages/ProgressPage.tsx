import React, { useState, useEffect } from 'react';
import { ApplyStatus, Job } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileText, Edit, Users, Award, ExternalLink, Save, X } from 'lucide-react';
import { fetchProgressList, updateProgressNote, ProgressItem } from '../services/progressService';

interface ProgressPageProps {
  jobs: Job[];
}

export const ProgressPage: React.FC<ProgressPageProps> = ({ jobs }) => {
  const [progressList, setProgressList] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  useEffect(() => {
    loadProgressList();
  }, []);

  const loadProgressList = async () => {
    try {
      setLoading(true);
      const list = await fetchProgressList();
      setProgressList(list);
    } catch (e: any) {
      console.error('Failed to load progress list:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (item: ProgressItem) => {
    setEditingNoteId(item.jobId);
    setEditingNoteValue(item.note || '');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteValue('');
  };

  const handleSaveNote = async (jobId: string) => {
    try {
      setSavingNoteId(jobId);
      await updateProgressNote(jobId, editingNoteValue);
      setProgressList(prev => prev.map(item => 
        item.jobId === jobId ? { ...item, note: editingNoteValue } : item
      ));
      setEditingNoteId(null);
      setEditingNoteValue('');
    } catch (e: any) {
      alert(e?.body?.message || e?.message || '保存失败');
    } finally {
      setSavingNoteId(null);
    }
  };

  // Compute Stats
  const stats = {
    [ApplyStatus.NOT_APPLIED]: 0,
    [ApplyStatus.APPLIED]: 0,
    [ApplyStatus.WRITTEN_TEST]: 0,
    [ApplyStatus.INTERVIEW]: 0,
    [ApplyStatus.OFFER]: 0,
    [ApplyStatus.REJECTED]: 0,
  };

  jobs.forEach(job => {
    stats[job.status] = (stats[job.status] || 0) + 1;
  });

  const totalApplied = jobs.length - stats[ApplyStatus.NOT_APPLIED];
  
  const pieData = [
    { name: '已投递', value: stats[ApplyStatus.APPLIED], color: '#3b82f6' }, // blue-500
    { name: '笔试', value: stats[ApplyStatus.WRITTEN_TEST], color: '#8b5cf6' }, // violet-500
    { name: '面试', value: stats[ApplyStatus.INTERVIEW], color: '#f97316' }, // orange-500
    { name: 'Offer', value: stats[ApplyStatus.OFFER], color: '#10b981' }, // emerald-500
    { name: '已挂', value: stats[ApplyStatus.REJECTED], color: '#ef4444' }, // red-500
  ].filter(d => d.value > 0);

  const barData = [
     { name: '互联网', count: jobs.filter(j => j.industry === '互联网' && j.status !== ApplyStatus.NOT_APPLIED).length },
     { name: '金融', count: jobs.filter(j => j.industry === '金融' && j.status !== ApplyStatus.NOT_APPLIED).length },
     { name: '国央企', count: jobs.filter(j => j.industry === '国央企' && j.status !== ApplyStatus.NOT_APPLIED).length },
     { name: '外企', count: jobs.filter(j => j.industry === '外企' && j.status !== ApplyStatus.NOT_APPLIED).length },
  ];

  const StatCard = ({ title, count, icon: Icon, colorClass, bgClass }: any) => (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
              <h4 className="text-3xl font-bold text-slate-900">{count}</h4>
          </div>
          <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
              <Icon size={24} />
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">我的投递看板</h1>
            <p className="text-slate-500 text-sm mt-1">实时掌握校招进度，科学规划每一步</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="总投递" 
                count={totalApplied} 
                icon={FileText} 
                bgClass="bg-blue-50" 
                colorClass="text-blue-600" 
            />
            <StatCard 
                title="笔试中" 
                count={stats[ApplyStatus.WRITTEN_TEST]} 
                icon={Edit} 
                bgClass="bg-purple-50" 
                colorClass="text-purple-600" 
            />
             <StatCard 
                title="面试中" 
                count={stats[ApplyStatus.INTERVIEW]} 
                icon={Users} 
                bgClass="bg-orange-50" 
                colorClass="text-orange-600" 
            />
             <StatCard 
                title="已拿 Offer" 
                count={stats[ApplyStatus.OFFER]} 
                icon={Award} 
                bgClass="bg-green-50" 
                colorClass="text-green-600" 
            />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col">
                <h3 className="font-bold text-lg mb-6 text-slate-900">投递状态分布</h3>
                <div className="flex-1 w-full min-h-[300px]">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={6}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                <FileText size={24} className="text-slate-300"/>
                            </div>
                            <p>暂无投递数据</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bar Chart */}
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col">
                <h3 className="font-bold text-lg mb-6 text-slate-900">行业偏好分析</h3>
                 <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                axisLine={false} 
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                allowDecimals={false} 
                                axisLine={false} 
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Progress List Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-900">投递进度列表</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">加载中...</p>
            </div>
          ) : progressList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-3 text-slate-300" />
              <p>暂无投递记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">公司名称</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">投递进度</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">修改时间</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">工作地点</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">相关链接</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">笔记</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {progressList.map((item) => (
                    <tr key={item.jobId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{item.company}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === '已投递' ? 'bg-blue-100 text-blue-800' :
                          item.status === '已笔试' ? 'bg-purple-100 text-purple-800' :
                          item.status === '已面试' ? 'bg-orange-100 text-orange-800' :
                          item.status === '已通过' ? 'bg-green-100 text-green-800' :
                          item.status === '已挂' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(item.updatedAt).toLocaleDateString('zh-CN', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.locations && item.locations.length > 0 ? item.locations.join(', ') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.applyLink && (
                            <a
                              href={item.applyLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              投递
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {item.announcementLink && (
                            <a
                              href={item.announcementLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                            >
                              公告
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingNoteId === item.jobId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingNoteValue}
                              onChange={(e) => setEditingNoteValue(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="输入备注..."
                              maxLength={200}
                            />
                            <button
                              onClick={() => handleSaveNote(item.jobId)}
                              disabled={savingNoteId === item.jobId}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title="保存"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                              title="取消"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 flex-1">
                              {item.note || '暂无笔记'}
                            </span>
                            <button
                              onClick={() => handleEditNote(item)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              编辑
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};