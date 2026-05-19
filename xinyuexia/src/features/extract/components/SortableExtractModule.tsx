import { Check, GripVertical, Layers, Lock } from 'lucide-react';

import type { ExtractModule } from '@/features/extract/model/extractTypes';

interface SortableExtractModuleProps {
  module: ExtractModule;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
}

export function SortableExtractModule({
  module,
  isSelected,
  isDragOver,
  onSelect,
  onToggleActive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: SortableExtractModuleProps) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(module.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(module.id);
      }}
      className={`group border-b border-gray-50 bg-white transition-all ${isDragOver ? 'shadow-inner ring-2 ring-brand/30' : ''}`}
    >
      <div className={`flex items-center text-left transition-colors ${isSelected ? 'bg-brand-light/70' : 'hover:bg-gray-50'}`}>
        <button
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', module.id);
            onDragStart(module.id);
          }}
          onDragEnd={onDragEnd}
          className="flex w-6 self-stretch cursor-grab items-center justify-center rounded-l active:cursor-grabbing hover:bg-gray-200/60"
          title="按住拖拽排序"
        >
          <GripVertical className="h-3.5 w-3.5 text-gray-300" />
        </button>

        <button onClick={() => onSelect(module.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-2 pr-2 text-left">
          <span
            onClick={(event) => {
              event.stopPropagation();
              onToggleActive(module.id);
            }}
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
              module.active ? 'border-brand bg-brand' : 'border-gray-300 hover:border-brand'
            }`}
          >
            {module.active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
          </span>
          <Layers className={`h-3.5 w-3.5 shrink-0 ${module.active ? 'text-brand' : 'text-gray-400'}`} />
          <span className={`truncate text-xs ${isSelected ? 'font-medium text-brand' : 'text-gray-700'}`}>{module.label}</span>
          {module.locked && <Lock className="ml-auto h-3 w-3 shrink-0 text-amber-500" />}
        </button>
      </div>
    </div>
  );
}

export function ExtractModuleOverlay({ module }: { module: ExtractModule }) {
  return (
    <div className="flex w-[220px] items-center gap-2 rounded-lg border border-brand/30 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xl ring-4 ring-brand/10">
      <GripVertical className="h-3.5 w-3.5 text-brand" />
      <Layers className="h-3.5 w-3.5 text-brand" />
      <span className="truncate">{module.label}</span>
    </div>
  );
}
