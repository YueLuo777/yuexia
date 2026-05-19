import { BookOpen, Image, Trash2 } from 'lucide-react';

import type { Novel } from '@/features/novels/model/novelTypes';

interface NovelCardProps {
  novel: Novel;
  isSelected: boolean;
  onOpen: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function NovelCard({ novel, isSelected, onOpen, onRename, onDelete }: NovelCardProps) {
  const typeLabel = novel.type === 'novel' ? '小说' : '剧本';

  return (
    <article className={`group flex w-[220px] flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${isSelected ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100'}`}>
      <button
        onClick={() => onOpen(novel.id)}
        className="relative h-[132px] bg-gradient-to-br from-brand-light via-white to-orange-50 text-left"
      >
        {novel.cover ? (
          <img src={novel.cover} alt={novel.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-brand-dark">
            <BookOpen className="mb-2 h-9 w-9" />
            <span className="text-xs font-medium">{typeLabel}</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm">
          {novel.category}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-sm font-bold text-gray-900" title={novel.title}>{novel.title}</h3>
        <p className="mt-1 line-clamp-2 h-9 text-xs leading-relaxed text-gray-400">{novel.synopsis || '暂无简介'}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <p className="text-[10px] text-gray-400">字数</p>
            <p className="font-medium text-gray-700">{novel.wordCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">修改</p>
            <p className="font-medium text-gray-700">{novel.lastModifiedAt}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button onClick={() => onRename(novel.id, novel.title)} className="rounded-md bg-brand px-2 py-1.5 text-xs text-white transition-colors hover:bg-brand-dark">
            重命名
          </button>
          <button className="flex items-center justify-center rounded-md bg-brand px-2 py-1.5 text-xs text-white transition-colors hover:bg-brand-dark" title="封面">
            <Image className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(novel.id)} className="flex items-center justify-center rounded-md bg-red-500 px-2 py-1.5 text-xs text-white transition-colors hover:bg-red-600" title="删除">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
