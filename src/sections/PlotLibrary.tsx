import { useState, useMemo } from 'react';
import {
  Star, Trash2, Search, ArrowUpDown, Library, X, AlertTriangle,
} from 'lucide-react';
import { usePlotLibrary, type PlotLibraryItem } from '@/hooks/usePlotLibrary';

type SortMode = 'time' | 'wordCount-desc' | 'wordCount-asc';

/** 从剧情点内容中提取评分 */
function extractScore(content: string): number | null {
  // 匹配 "平均分：69" 或 "评分：85" 等
  const match = content.match(/平均分[:：]\s*(\d+)/);
  if (match) return parseInt(match[1], 10);
  // 尝试匹配其他评分格式
  const m2 = content.match(/评分[:：]\s*(\d+)/);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

export default function PlotLibrary() {
  const { items, deleteItem, clearAll } = usePlotLibrary();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState<PlotLibraryItem | null>(null);

  const filtered = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const kw = search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(kw) ||
        p.content.toLowerCase().includes(kw) ||
        p.chapter.toLowerCase().includes(kw)
      );
    }
    switch (sortMode) {
      case 'time':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'wordCount-desc':
        list.sort((a, b) => b.wordCount - a.wordCount);
        break;
      case 'wordCount-asc':
        list.sort((a, b) => a.wordCount - b.wordCount);
        break;
    }
    return list;
  }, [items, search, sortMode]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 标题栏 */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-brand" />
            <div>
              <h1 className="text-base font-bold text-gray-900">剧情库</h1>
              <p className="text-[10px] text-gray-400">共 {items.length} 条剧情点</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 搜索 */}
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-6 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* 排序 */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand bg-white"
              >
                <option value="time">最新</option>
                <option value="wordCount-desc">字数高</option>
                <option value="wordCount-asc">字数低</option>
              </select>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> 清空
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 卡片网格区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <Library className="w-12 h-12 mb-2" />
            <p className="text-sm">{items.length === 0 ? '暂无剧情点，在提炼页面导入' : '没有匹配的剧情点'}</p>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {filtered.map((item) => {
              const score = extractScore(item.content);
              return (
                <button
                  key={item.id}
                  onClick={() => setShowDetail(item)}
                  className="text-left bg-white rounded-lg border border-gray-200 p-3 hover:border-brand hover:shadow-md transition-all group flex flex-col"
                >
                  {/* 卡片头部：标题 */}
                  <div className="text-xs font-bold text-gray-800 line-clamp-1 mb-1.5 group-hover:text-brand transition-colors">
                    {item.title}
                  </div>
                  {/* 章节名 */}
                  <div className="text-[10px] text-gray-400 mb-2 truncate">
                    {item.chapter}
                  </div>
                  {/* 卡片内容预览（前3行） */}
                  <div className="text-[11px] text-gray-500 leading-relaxed line-clamp-3 mb-2 flex-1">
                    {item.content}
                  </div>
                  {/* 底部信息 */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400">{item.wordCount} 字</span>
                    {score !== null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        score >= 80 ? 'bg-green-100 text-green-700' :
                        score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {score} 分
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ 详情弹窗 ═══════ */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDetail(null)}>
          <div className="w-[600px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{showDetail.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">{showDetail.chapter}</span>
                  <span className="text-[10px] text-gray-300">·</span>
                  <span className="text-[10px] text-gray-400">{showDetail.wordCount} 字</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { deleteItem(showDetail.id); setShowDetail(null); }}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> 删除
                </button>
                <button onClick={() => setShowDetail(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                {showDetail.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ 清空确认弹窗 ═══════ */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-[400px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">清空剧情库</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                <span className="text-xs text-gray-600">将删除</span>
                <span className="text-sm font-bold text-red-600">{items.length}</span>
                <span className="text-xs text-gray-600">条剧情点，且无法恢复</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => { clearAll(); setShowClearConfirm(false); setShowDetail(null); }}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
