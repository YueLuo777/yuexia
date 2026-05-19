import { ArrowUpDown, Check, Edit3, Library, Search, Star, Tag, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePlotLibrary } from '@/features/plot-library/hooks/usePlotLibrary';
import type { PlotLibraryItem } from '@/features/plot-library/model/plotLibraryTypes';

type SortMode = 'time' | 'wordCount-desc' | 'wordCount-asc';

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PlotLibraryPage() {
  const { items, tags, updateItem, deleteItem, clearAll } = usePlotLibrary();
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlotLibraryItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = items.filter((item) => {
      const matchKeyword = !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.chapter.toLowerCase().includes(keyword) ||
        item.novelTitle.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword);
      const matchTag = !activeTag || item.tags.includes(activeTag);
      return matchKeyword && matchTag;
    });

    result.sort((a, b) => {
      if (sortMode === 'wordCount-desc') return b.wordCount - a.wordCount;
      if (sortMode === 'wordCount-asc') return a.wordCount - b.wordCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [activeTag, items, search, sortMode]);

  const startEdit = (item: PlotLibraryItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  const saveEdit = (item: PlotLibraryItem) => {
    updateItem(item.id, { content: editContent });
    setDetail({ ...item, content: editContent, wordCount: editContent.replace(/\s+/g, '').length });
    setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-brand" />
            <div>
              <h1 className="text-base font-bold text-gray-900">剧情库</h1>
              <p className="text-[10px] text-gray-400">
                共 {items.length} 条剧情点{activeTag ? ` · 筛选「${activeTag}」${filteredItems.length} 条` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="relative w-48">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索..."
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-7 text-xs outline-none focus:border-brand"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </label>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand"
              >
                <option value="time">最新</option>
                <option value="wordCount-desc">字数高</option>
                <option value="wordCount-asc">字数低</option>
              </select>
            </div>
            {items.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-[11px] text-red-600 transition-colors hover:bg-red-100"
              >
                <Trash2 className="h-3 w-3" />
                清空
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-[180px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
            <Tag className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-bold text-gray-700">标签筛选</span>
            <span className="ml-auto text-[10px] text-gray-400">{tags.length} 个</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                activeTag === null ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>全部剧情点</span>
              <span>{items.length}</span>
            </button>
            {tags.map((tag) => (
              <button
                key={tag.tag}
                onClick={() => setActiveTag(tag.tag)}
                className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                  activeTag === tag.tag ? 'bg-brand-light text-brand' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">#{tag.tag}</span>
                <span>{tag.count}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
              <Star className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">{items.length === 0 ? '剧情库为空' : '没有匹配的剧情点'}</p>
              <p className="mt-1 text-xs text-gray-400">可从“提炼剧情”页面保存结果到这里</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredItems.map((item) => (
                <article key={item.id} className="flex min-h-[180px] flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-gray-900">{item.title}</h2>
                      <p className="mt-1 text-[11px] text-gray-400">{item.novelTitle} · {item.chapter} · {formatTime(item.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-400">{item.wordCount} 字</span>
                  </div>
                  <p className="line-clamp-5 flex-1 whitespace-pre-wrap text-xs leading-6 text-gray-600">{item.content}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] text-brand">#{tag}</span>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => setDetail(item)} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">查看</button>
                      <button onClick={() => deleteItem(item.id)} className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-500 hover:bg-red-100">删除</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="flex h-[70vh] w-[760px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">{detail.title}</h3>
                <p className="mt-0.5 text-xs text-gray-400">{detail.novelTitle} · {detail.chapter}</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {editingId === detail.id ? (
                <textarea
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  className="h-full min-h-[360px] w-full resize-none rounded-lg border border-gray-200 p-3 text-sm leading-7 text-gray-700 outline-none focus:border-brand"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{detail.content}</pre>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <div className="flex gap-1">
                {detail.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] text-brand">#{tag}</span>
                ))}
              </div>
              {editingId === detail.id ? (
                <button onClick={() => saveEdit(detail)} className="flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs text-white hover:bg-brand-dark">
                  <Check className="h-3.5 w-3.5" />
                  保存
                </button>
              ) : (
                <button onClick={() => startEdit(detail)} className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                  <Edit3 className="h-3.5 w-3.5" />
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
          <div className="w-[360px] rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900">确认清空</h3>
            <p className="mt-2 text-sm text-gray-500">清空后当前剧情库内容无法恢复。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowClearConfirm(false)} className="rounded-md border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button
                onClick={() => {
                  clearAll();
                  setShowClearConfirm(false);
                }}
                className="rounded-md bg-red-500 px-4 py-1.5 text-sm text-white hover:bg-red-600"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
