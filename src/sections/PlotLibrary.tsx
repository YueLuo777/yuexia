import { useState, useMemo } from 'react';
import {
  Star, Trash2, Search, ArrowUpDown, Library, X,
} from 'lucide-react';
import { usePlotLibrary } from '@/hooks/usePlotLibrary';

type SortMode = 'time' | 'wordCount-desc' | 'wordCount-asc' | 'score-desc' | 'score-asc';

export default function PlotLibrary() {
  const { items, deleteItem, clearAll } = usePlotLibrary();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...items];
    // 搜索过滤
    if (search.trim()) {
      const kw = search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(kw) ||
        p.content.toLowerCase().includes(kw) ||
        p.chapter.toLowerCase().includes(kw)
      );
    }
    // 排序
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
      case 'score-desc':
        list.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'score-asc':
        list.sort((a, b) => (a.score || 0) - (b.score || 0));
        break;
    }
    return list;
  }, [items, search, sortMode]);

  const detail = useMemo(() => {
    if (!selected) return null;
    return items.find((p) => p.id === selected) || null;
  }, [selected, items]);

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
          {items.length > 0 && (
            <button
              onClick={() => { if (confirm('确定清空全部剧情点？')) clearAll(); }}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> 清空
            </button>
          )}
        </div>
      </div>

      {/* 搜索和排序 */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索剧情点..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-brand"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand bg-white"
          >
            <option value="time">最新导入</option>
            <option value="wordCount-desc">字数 高→低</option>
            <option value="wordCount-asc">字数 低→高</option>
            <option value="score-desc">评分 高→低</option>
            <option value="score-asc">评分 低→高</option>
          </select>
        </div>
      </div>

      {/* 列表区域 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 左侧列表 */}
        <div className="w-[260px] border-r border-gray-200 bg-white overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-xs">
              {items.length === 0 ? '暂无剧情点，在提炼剧情页面导入' : '没有匹配的剧情点'}
            </div>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`w-full text-left px-3 py-2 border-b border-gray-50 transition-colors ${
                selected === item.id ? 'bg-brand-light border-l-[3px] border-l-brand' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-800 truncate flex-1">{item.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); if (selected === item.id) setSelected(null); }}
                  className="ml-1 p-0.5 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-400">{item.chapter}</span>
                <span className="text-[10px] text-gray-400">·</span>
                <span className="text-[10px] text-gray-400">{item.wordCount} 字</span>
              </div>
            </button>
          ))}
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 overflow-y-auto bg-white p-4">
          {!detail && (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <Library className="w-12 h-12 mb-2" />
              <p className="text-sm">选择左侧剧情点查看详情</p>
            </div>
          )}
          {detail && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">{detail.title}</h2>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{detail.chapter}</span>
                  <span>·</span>
                  <span>{detail.wordCount} 字</span>
                </div>
              </div>
              <div className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                {detail.content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
