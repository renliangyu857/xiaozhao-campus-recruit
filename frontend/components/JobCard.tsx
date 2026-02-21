import React from 'react';
import { ApplyStatus, Job } from '../types';
import { MapPin, Calendar, ExternalLink, ChevronDown, Star } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: ApplyStatus) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (jobId: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onStatusChange, isFavorite, onToggleFavorite }) => {
  const getStatusColor = (status: ApplyStatus) => {
    switch (status) {
      case ApplyStatus.NOT_APPLIED: return 'bg-slate-100 text-slate-500 border-slate-200';
      case ApplyStatus.APPLIED: return 'bg-blue-50 text-blue-600 border-blue-100';
      case ApplyStatus.WRITTEN_TEST: return 'bg-purple-50 text-purple-600 border-purple-100';
      case ApplyStatus.INTERVIEW: return 'bg-orange-50 text-orange-600 border-orange-100';
      case ApplyStatus.OFFER: return 'bg-green-50 text-green-600 border-green-100';
      case ApplyStatus.REJECTED: return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="group bg-white rounded-2xl p-5 hover:shadow-soft transition-all duration-300 border border-slate-100 hover:border-blue-100 relative overflow-hidden" data-testid="job-card">
      {/* New Badge */}
      {job.isNew && (
        <div className="absolute top-0 left-0">
          <div className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg shadow-sm">
            NEW
          </div>
        </div>
      )}
      {/* 收藏 */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFavorite(job.id); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-amber-500 transition-colors"
          title={isFavorite ? '取消收藏' : '收藏'}
        >
          <Star size={18} className={isFavorite ? 'fill-amber-500 text-amber-500' : ''} />
        </button>
      )}

      <div className="flex flex-col gap-4">
        {/* Header: Company & Salary */}
        <div className="flex justify-between items-start pl-1">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {job.company}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/50">
                  {job.industry}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100/50">
                  {job.type}
                </span>
             </div>
             <p className="text-sm font-medium text-slate-800">{job.roles.join(', ')}</p>
          </div>
          <div className="text-right">
             <span className="block text-base font-bold text-emerald-600">{job.salary}</span>
             {job.noWrittenTest && (
                 <span className="inline-block mt-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    免笔试
                 </span>
             )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 pl-1">
           <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
              <MapPin size={12} className="text-slate-400" />
              <span>{job.locations.join(' ')}</span>
           </div>
           <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
               <Calendar size={12} className="text-slate-400" />
               <span>截止: {job.endDate}</span>
           </div>
           <div className="flex-1 text-right text-slate-400">
              {job.remark && <span title={job.remark} className="truncate max-w-[200px] inline-block align-bottom">{job.remark}</span>}
           </div>
        </div>

        {/* Footer: Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-50 gap-4 mt-1">
           <div className="flex items-center gap-3 flex-1">
              <div className="relative inline-block w-32 sm:w-40">
                  <select
                    value={job.status}
                    onChange={(e) => onStatusChange(job.id, e.target.value as ApplyStatus)}
                    className={`appearance-none w-full pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold border focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer ${getStatusColor(job.status)}`}
                  >
                    {Object.values(ApplyStatus).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-50 pointer-events-none" />
              </div>
           </div>

           <div className="flex gap-2">
             <a
              href={job.announcementLink}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              简章
            </a>
            <a
              href={job.applyLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 hover:bg-blue-600 transition-all shadow-sm hover:shadow"
            >
              去投递 <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};