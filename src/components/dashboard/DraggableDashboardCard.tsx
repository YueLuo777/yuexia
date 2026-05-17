import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type CardSize = 'small' | 'third' | 'medium' | 'large' | 'full';
export type CardHeight = 'auto' | 'small' | 'medium' | 'large';

export interface DashboardCardConfig {
  id: string;
  type: string;
  size: CardSize;
  height?: CardHeight;
}

const sizeClasses: Record<CardSize, string> = {
  small: 'w-[20%]',
  third: 'w-1/3',
  medium: 'w-1/2',
  large: 'w-[75%]',
  full: 'w-full',
};

const sizeLabels: Record<CardSize, string> = {
  small: '小',
  third: '三等分',
  medium: '中',
  large: '大',
  full: '全宽',
};

const sizeNext: Record<CardSize, CardSize> = {
  small: 'third',
  third: 'medium',
  medium: 'large',
  large: 'full',
  full: 'small',
};

const heightClasses: Record<CardHeight, string> = {
  auto: '', // flex stretch 自动撑满
  small: 'h-[200px]',
  medium: 'h-[300px]',
  large: 'h-[400px]',
};

export const heightLabels: Record<CardHeight, string> = {
  auto: '自动',
  small: '小 (200px)',
  medium: '中 (300px)',
  large: '大 (400px)',
};

interface DraggableDashboardCardProps {
  id: string;
  size: CardSize;
  height?: CardHeight;
  isEditMode: boolean;
  onSizeChange: (id: string, size: CardSize) => void;
  onRemove: (id: string) => void;
  children: ReactNode;
  /** 非编辑模式下不显示白底圆角卡片外框 */
  borderless?: boolean;
}

export default function DraggableDashboardCard({
  id,
  size,
  height = 'auto',
  isEditMode,
  onSizeChange,
  onRemove,
  children,
  borderless = false,
}: DraggableDashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${sizeClasses[size]} ${heightClasses[height]} mb-0 transition-all`}
    >
      <div className={`relative h-full ${borderless && !isEditMode ? "" : "p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"}`}>
        {/* 编辑模式工具栏 */}
        {isEditMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            {/* 拖拽手柄 */}
            <button
              {...attributes}
              {...listeners}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
              title="拖拽排序"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            {/* 宽度切换 */}
            <button
              onClick={() => onSizeChange(id, sizeNext[size])}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title={`当前: ${sizeLabels[size]}，点击切换`}
            >
              {size === 'full' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            {/* 删除 */}
            <button
              onClick={() => onRemove(id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="移除卡片"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 卡片内容 */}
        <div className={isEditMode ? 'pt-6' : ''}>
          {children}
        </div>
      </div>
    </div>
  );
}
