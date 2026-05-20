import { Image } from 'lucide-react';

import type { Novel } from '@/features/novels/model/novelTypes';

export interface NovelCardSettings {
  cardWidth: 'small' | 'medium' | 'large';
  coverHeight: 'small' | 'medium' | 'large';
  statFontSize?: 'small' | 'medium' | 'large';
  buttonFontSize?: 'small' | 'medium' | 'large';
  buttonFontWeight?: 'normal' | 'medium' | 'bold';
  btnPerRow?: 2 | 3;
  btnRows?: 1 | 2 | 3;
  btnOrder?: string[];
  btnColors?: Record<string, 'green' | 'orange' | 'blue' | 'red' | 'purple' | 'amber' | 'pink' | 'teal' | 'indigo' | 'gray'>;
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

const statFontMap = {
  small: 'text-[10px]',
  medium: 'text-xs',
  large: 'text-sm',
} as const;

const btnFontMap = {
  small: 'text-[10px]',
  medium: 'text-xs',
  large: 'text-sm',
} as const;

const btnWeightMap = {
  normal: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
} as const;

function getBtnColorClasses(color: NonNullable<NovelCardSettings['btnColors']>[string]) {
  switch (color) {
    case 'red': return 'bg-red-500 text-white hover:bg-red-600';
    case 'gray': return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    case 'green': return 'bg-green-500 text-white hover:bg-green-600';
    case 'orange': return 'bg-orange-500 text-white hover:bg-orange-600';
    case 'purple': return 'bg-purple-500 text-white hover:bg-purple-600';
    case 'amber': return 'bg-amber-500 text-white hover:bg-amber-600';
    case 'pink': return 'bg-pink-500 text-white hover:bg-pink-600';
    case 'teal': return 'bg-teal-500 text-white hover:bg-teal-600';
    case 'indigo': return 'bg-indigo-500 text-white hover:bg-indigo-600';
    default: return 'bg-brand text-white hover:bg-brand-dark';
  }
}

export function NovelCard({ novel, settings, onOpen, onRename, onCover, onExport, onDelete }: NovelCardProps) {
  const btnOrder = settings.btnOrder?.length ? settings.btnOrder : ['重命名', '封面', '导出', '删除'];
  const btnPerRow = settings.btnPerRow ?? 2;
  const btnRows = settings.btnRows ?? 2;
  const maxCount = btnPerRow * btnRows;
  const slots = btnOrder.slice(0, maxCount);
  while (slots.length < maxCount) slots.push('');
  const btnColors = settings.btnColors ?? { 重命名: 'blue', 封面: 'blue', 导出: 'blue', 删除: 'red' };
  const statFont = statFontMap[settings.statFontSize ?? 'medium'];
  const btnFont = btnFontMap[settings.buttonFontSize ?? 'medium'];
  const btnWeight = btnWeightMap[settings.buttonFontWeight ?? 'medium'];

  const actions: Record<string, (event: React.MouseEvent) => void> = {
    重命名: (event) => {
      event.stopPropagation();
      onRename(novel.id, novel.title);
    },
    封面: (event) => {
      event.stopPropagation();
      onCover(novel.id);
    },
    导出: (event) => {
      event.stopPropagation();
      onExport(novel.id);
    },
    删除: (event) => {
      event.stopPropagation();
      onDelete(novel.id);
    },
  };

  return (
    <article
      onClick={() => onOpen(novel.id)}
      className="group flex cursor-pointer flex-col rounded-[24px] border border-slate-100 bg-white p-3 transition-shadow hover:shadow-xl"
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
        <h3 className="mb-2 truncate text-sm font-bold text-slate-900" title={novel.title}>{novel.title}</h3>
        <div className={`mb-3 flex items-center justify-between text-slate-400 ${statFont}`}>
          <span>{novel.wordCount} 字</span>
          <span>{novel.lastModifiedAt || novel.createdAt}</span>
        </div>

        <div className="mt-auto grid gap-1" style={{ gridTemplateColumns: `repeat(${btnPerRow}, 1fr)` }}>
          {slots.map((label, index) => {
            if (!label) return <div key={index} className="py-1.5" />;
            return (
              <button
                key={`${label}-${index}`}
                onClick={actions[label]}
                className={`rounded-lg py-1.5 transition-colors ${getBtnColorClasses(btnColors[label] || 'gray')} ${btnFont} ${btnWeight}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
