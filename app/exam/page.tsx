"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ExternalLink, Lock, FileText, FileSpreadsheet, Video, X, Sparkles, BookOpen } from "lucide-react";
import type { PanFileItem, PanStats } from "@/lib/types";
import { PAN_MATERIALS_LIST, PAN_STATS, PAN_FILTER_TAGS } from "@/lib/panMaterials";
import { loadPanExport } from "@/lib/panExportService";
import { useUser } from "@/components/UserContext";
import { apiFetch } from "@/lib/apiClient";

function FileIcon({ format }: { format?: string }) {
  const f = (format || "").toLowerCase();
  if (f === "pdf" || f === "doc" || f === "docx") return <FileText size={18} className="text-[#FF6B4A] shrink-0" />;
  if (f === "mp4" || f === "avi" || f === "mov") return <Video size={18} className="text-[#0D7377] shrink-0" />;
  return <FileSpreadsheet size={18} className="text-slate-400 shrink-0" />;
}

const HIGHLIGHT_KEYS = [
  "中国烟草", "浦发银行", "农业银行", "国家能源", "丝芙兰", "安永", "互联网", "银行",
  "四大", "国企", "电网", "北森", "牛客", "建行", "中信", "邮政", "茅台", "中车", "中广核", "三桶油",
];

function PathWithHighlights({ path }: { path: string }) {
  let pos = 0;
  const parts: React.ReactNode[] = [];
  while (pos < path.length) {
    let earliest = path.length;
    let matchKey = "";
    for (const key of HIGHLIGHT_KEYS) {
      const i = path.indexOf(key, pos);
      if (i !== -1 && i < earliest) {
        earliest = i;
        matchKey = key;
      }
    }
    if (!matchKey) {
      parts.push(path.slice(pos));
      break;
    }
    if (earliest > pos) parts.push(path.slice(pos, earliest));
    parts.push(<span key={`${matchKey}-${pos}`} className="font-semibold text-[#FF6B4A]">{matchKey}</span>);
    pos = earliest + matchKey.length;
  }
  return <span className="text-slate-600">{parts}</span>;
}

const PAGE_SIZE = 50;

export default function ExamPage() {
  const router = useRouter();
  const { user } = useUser();
  const [keyword, setKeyword] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<PanFileItem[]>(PAN_MATERIALS_LIST);
  const [stats, setStats] = useState<PanStats>(PAN_STATS);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PanFileItem | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  // 加载用户已购买的资料
  useEffect(() => {
    if (!user?.id) {
      setPurchasedIds(new Set());
      return;
    }
    apiFetch<{ purchasedIds: string[] }>("/pan-materials/check")
      .then((data) => setPurchasedIds(new Set(data.purchasedIds)))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    loadPanExport().then(({ items: loaded, stats: loadedStats, fromExport }) => {
      if (fromExport && loaded.length > 0) {
        setItems(loaded);
        setStats(loadedStats);
      }
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    const k = keyword.trim().toLowerCase();
    if (k) {
      list = list.filter((item) => item.name.toLowerCase().includes(k) || item.path.toLowerCase().includes(k));
    }
    if (activeTag) {
      list = list.filter((item) => item.path.includes(activeTag) || item.name.includes(activeTag));
    }
    return list;
  }, [items, keyword, activeTag]);

  useEffect(() => {
    setPage(0);
  }, [keyword, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE), [filtered, currentPage]);

  // 检查是否有下载权限：永久会员（pan-materials/check 返回全部资料 ID）或历史单独购买
  const hasDownloadAccess = (item: PanFileItem): boolean => purchasedIds.has(item.id);

  const handleDownload = (item: PanFileItem) => {
    if (!user) {
      alert("请先登录");
      return;
    }
    if (!hasDownloadAccess(item)) {
      setSelectedItem(item);
      setShowPaywall(true);
      return;
    }
    window.open(item.shareUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] pt-20 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-[#FF6B4A] to-[#FF8F7A] rounded-2xl shadow-lg shadow-orange-200">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">校招喵笔面试资料库</h1>
          </div>
          <p className="text-slate-600 ml-1">全网笔面试资料聚合，真实文件名与路径，一键前往网盘下载</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">题库大小</div>
            <div className="text-xl font-bold text-slate-800">{loading ? "..." : stats.totalSize}</div>
          </div>
          <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">文件数</div>
            <div className="text-xl font-bold text-[#FF6B4A]">{loading ? "..." : stats.fileCount.toLocaleString()}</div>
          </div>
          <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">最后更新</div>
            <div className="text-xl font-bold text-[#0D7377]">{loading ? "..." : stats.lastUpdated}</div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="跨盘搜索关键词..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#FF6B4A] focus:ring-4 focus:ring-[#FF6B4A]/10 outline-none transition text-sm"
              />
            </div>
            <button
              type="button"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              搜索
            </button>
          </div>

          {/* 标签筛选 */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            {PAN_FILTER_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTag === tag
                    ? "bg-[#FF6B4A] text-white shadow-md shadow-orange-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 永久会员下载权限提示 */}
        {user && purchasedIds.size === 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF6B4A]" />
              <span className="text-slate-700">
                <span className="font-semibold">永久会员（¥19.9）</span>可无差别解锁全部 {stats.fileCount.toLocaleString()} 份资料下载，
                <button onClick={() => router.push("/vip")} className="text-[#FF6B4A] hover:underline font-medium ml-1">
                  去开通 →
                </button>
              </span>
            </div>
          </div>
        )}

        {/* 资料表格 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-4 font-semibold text-slate-600 w-20">ID</th>
                  <th className="px-5 py-4 font-semibold text-slate-600">文件名</th>
                  <th className="px-5 py-4 font-semibold text-slate-600 w-32">下载链接</th>
                  <th className="px-5 py-4 font-semibold text-slate-600 w-24">大小</th>
                  <th className="px-5 py-4 font-semibold text-slate-600">路径</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-slate-500">
                      <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      暂无匹配资料，试试其他关键词或标签
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 text-slate-400 font-mono">{item.displayId ?? item.id}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-slate-700">
                          <FileIcon format={item.format} />
                          <span className="truncate max-w-[260px]" title={item.name}>{item.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDownload(item)}
                          className={`inline-flex items-center gap-1.5 font-medium transition-colors ${
                            hasDownloadAccess(item)
                              ? "text-[#FF6B4A] hover:text-[#E55A3C]"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {hasDownloadAccess(item) ? (
                            <>
                              前往下载 <ExternalLink size={14} />
                            </>
                          ) : purchasedIds.has(item.id) ? (
                            <>
                              <ExternalLink size={14} /> 已购下载
                            </>
                          ) : (
                            <>
                              <Lock size={14} /> 解锁下载
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{item.size ?? "-"}</td>
                      <td className="px-5 py-4 max-w-[360px] truncate" title={item.path}>
                        <PathWithHighlights path={item.path} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 分页 */}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <span className="text-sm text-slate-500">
              共 {filtered.length.toLocaleString()} 条，第 {currentPage + 1}/{totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                上一页
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 下载权限弹窗 */}
      {showPaywall && selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowPaywall(false)}>
              <X size={20} />
            </button>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6B4A]/20 to-[#FF8F7A]/10 mb-6">
              <Lock className="h-10 w-10 text-[#FF6B4A]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">解锁资料下载</h3>
            <p className="mt-2 text-sm text-slate-600 font-medium truncate px-4" title={selectedItem.name}>
              {selectedItem.name}
            </p>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              开通永久会员（¥19.9）即可无差别解锁全部 {stats.fileCount.toLocaleString()} 份资料下载，
              <br />
              一次付费，终身可用
            </p>

            <button
              onClick={() => { setShowPaywall(false); router.push("/vip"); }}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#FF8F7A] py-4 text-sm font-bold text-white hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              开通永久会员 ¥19.9
            </button>

            <button onClick={() => setShowPaywall(false)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
              暂不需要
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
