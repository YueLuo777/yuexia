import { Image } from 'lucide-react';

import type { Novel } from '@/features/novels/model/novelTypes';

export interface NovelCardSettings {
  cardWidth: 'small' | 'medium' | 'large';
  coverHeight: 'small' | 'medium' | 'large';
}

interface NovelCardProps {
  novel: Novel;
  isSelected: boolean;
  settings: NovelCardSettings;
  onOpen: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onCover: (id: number) => void;
  onExport: (id: number) => void;
  onDelete: (id: number) => void;
}

const widthMap = {
  small: 220,
  medium: 250,
  large: 280,
} as const;

const coverHeightMap = {
  small: 220,
  medium: 250,
  large: 290,
} as const;

export function NovelCard({ novel, isSelected, settings, onOpen, onRename, onCover, onExport, onDelete }: NovelCardProps) {
  return (
    <article
      onClick={() => onOpen(novel.id)}
      className={`group flex cursor-pointer flex-col rounded-[24px] border border-gray-100 bg-white p-3 transition-shadow hover:shadow-xl ${
        isSelected ? 'ring-2 ring-orange-100' : ''
      }`}
      style={{ width: widthMap[settings.cardWidth], minHeight: 340 }}
    >
      <div
        className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-[20px]"
        style={{
          height: coverHeightMap[settings.coverHeight],
          background: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 100%)',
        }}
      >
        {novel.cover ? (
          <img src={novel.cover} alt="封面" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/60">
              <Image className="h-5 w-5 text-teal-600" />
            </div>
            <p className="mb-3 text-xs font-medium text-teal-700">暂无封面</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <h3 className="mb-2 truncate text-sm font-bold text-gray-900" title={novel.title}>{novel.title}</h3>
        <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
          <span>{novel.wordCount} 字</span>
          <span>{novel.lastModifiedAt || novel.createdAt}</span>
        </div>

        <div className="mt-auto grid grid-cols-4 gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onRename(novel.id, novel.title);
            }}
            className="rounded-lg bg-[#08B3D9] py-1.5 text-xs text-white transition-colors hover:bg-[#07a0c2]"
          >
            重命名
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onCover(novel.id);
            }}
            className="rounded-lg bg-[#08B3D9] py-1.5 text-xs text-white transition-colors hover:bg-[#07a0c2]"
          >
            封面
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onExport(novel.id);
            }}
            className="rounded-lg bg-[#08B3D9] py-1.5 text-xs text-white transition-colors hover:bg-[#07a0c2]"
          >
            导出
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(novel.id);
            }}
            className="rounded-lg bg-red-500 py-1.5 text-xs text-white transition-colors hover:bg-red-600"
          >
            删除
          </button>
        </div>
      </div>
    </article>
  );
}
