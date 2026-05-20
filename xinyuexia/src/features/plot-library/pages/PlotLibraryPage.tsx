import { ArrowUpDown, Check, Edit3, Library, Search, Tag, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { usePlotLibrary } from '@/features/plot-library/hooks/usePlotLibrary';
import type { PlotLibraryItem } from '@/features/plot-library/model/plotLibraryTypes';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

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
  const [deleteTarget, setDeleteTarget] = useState<PlotLibraryItem | null>(null);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = items.filter((item) => {
      const matchKeyword =
        !keyword
        || item.title.toLowerCase().includes(keyword)
        || item.chapter.toLowerCase().includes(keyword)
        || item.novelTitle.toLowerCase().includes(keyword)
        || item.content.toLowerCase().includes(keyword);
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
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-light text-brand">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-slate-900">剧情库</h1>
              <p className="mt-1 text-sm text-slate-400">共 {items.length} 条剧情点</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索剧情点..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="bg-transparent text-sm text-slate-600 outline-none"
              >
                <option value="time">最新</option>
                <option value="wordCount-desc">字数高</option>
                <option value="wordCount-asc">字数低</option>
              </select>
            </div>
            {items.length > 0 && (
              <button onClick={() => setShowClearConfirm(true)} className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-500 hover:bg-red-100">
                清空
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="w-[200px] shrink-0 border-r border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Tag className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">标签筛选</span>
          </div>
          <div className="space-y-1 p-3">
            <button
              onClick={() => setActiveTag(null)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                activeTag === null ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              全部
            </button>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  activeTag === tag ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{tag}</span>
                <span className="ml-2 text-xs opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filteredItems.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white text-slate-400">
              <Library className="mb-4 h-12 w-12" />
              <p className="text-base">{items.length === 0 ? '剧情库为空，请先在提炼页面导入' : '没有匹配的剧情点'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDetail(item)}
                  className="flex min-h-[180px] flex-col rounded-[22px] border border-slate-200 bg-white p-4 text-left transition-all hover:border-brand hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-slate-900">{item.title}</h2>
                      <p className="mt-1 text-[11px] text-slate-400">{item.chapter} · {formatTime(item.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">{item.wordCount} 字</span>
                  </div>
                  <p className="line-clamp-6 text-xs leading-6 text-slate-600">{item.content}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="flex h-[74vh] w-[760px] max-w-[92vw] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{detail.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{detail.novelTitle} · {detail.chapter}</p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {editingId === detail.id ? (
                <textarea
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  className="h-full min-h-[420px] w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm leading-7 text-slate-700 outline-none focus:border-brand"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{detail.content}</pre>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {detail.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-brand-light px-3 py-1 text-xs text-brand">#{tag}</span>
                ))}
              </div>
              {editingId === detail.id ? (
                <button onClick={() => saveEdit(detail)} className="flex items-center gap-1 rounded-2xl bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">
                  <Check className="h-4 w-4" />
                  保存
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(detail)} className="flex items-center gap-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Edit3 className="h-4 w-4" />
                    编辑
                  </button>
                  <button onClick={() => setDeleteTarget(detail)} className="flex items-center gap-1 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-500 hover:bg-red-100">
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="清空剧情库"
        description="确定要清空当前剧情库吗？清空后所有剧情点都无法恢复。"
        confirmText="确认清空"
        confirmVariant="danger"
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearAll();
          setShowClearConfirm(false);
          setDetail(null);
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="确认删除"
        description={`确定要删除剧情点「${deleteTarget?.title ?? ''}」吗？删除后将无法恢复。`}
        confirmText="确认删除"
        confirmVariant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteItem(deleteTarget.id);
          setDeleteTarget(null);
          setDetail(null);
        }}
      />
    </div>
  );
}
