import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { NewNovelInput, WorkType } from '@/features/novels/model/novelTypes';

interface NewNovelModalProps {
  isOpen: boolean;
  type: WorkType;
  categories: string[];
  onClose: () => void;
  onCreate: (input: NewNovelInput) => void;
}

export function NewNovelModal({ isOpen, type, categories, onClose, onCreate }: NewNovelModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0] ?? '未分类');
  const [synopsis, setSynopsis] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(type === 'novel' ? '默认小说' : '默认剧本');
    setCategory(categories[0] ?? '未分类');
    setSynopsis('');
  }, [categories, isOpen, type]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeLabel = type === 'novel' ? '小说' : '剧本';

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate({ title: trimmed, category, synopsis, type });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[420px] rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">新建{typeLabel}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-gray-600">作品名称</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') handleSubmit(); }}
          className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm transition-colors focus:border-brand"
          autoFocus
        />

        <label className="mb-1.5 block text-xs font-medium text-gray-600">分类</label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="mb-4 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand"
        >
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <label className="mb-1.5 block text-xs font-medium text-gray-600">简介</label>
        <textarea
          value={synopsis}
          onChange={(event) => setSynopsis(event.target.value)}
          className="mb-5 h-24 w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm transition-colors focus:border-brand"
          placeholder="可以先留空"
        />

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50">
            取消
          </button>
          <button onClick={handleSubmit} className="rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark">
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
