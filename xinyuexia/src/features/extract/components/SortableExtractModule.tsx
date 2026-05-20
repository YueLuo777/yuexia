import { Check, GripVertical, Layers, Lock, Unlock } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import type { ExtractModule } from '@/features/extract/model/extractTypes';

interface SortableExtractModuleProps {
  module: ExtractModule;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onToggleZone: (id: string) => void;
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
  onToggleZone,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: SortableExtractModuleProps) {
  const [isArmedDrag, setIsArmedDrag] = useState(false);
  const pressTimerRef = useRef<number | null>(null);
  const pressStartRef = useRef({ x: 0, y: 0 });
  const nativeDraggingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    };
  }, []);

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const resetDragState = () => {
    clearPressTimer();
    nativeDraggingRef.current = false;
    setIsArmedDrag(false);
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      setIsArmedDrag(true);
    }, 180);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (nativeDraggingRef.current || isArmedDrag) return;
    const deltaX = Math.abs(event.clientX - pressStartRef.current.x);
    const deltaY = Math.abs(event.clientY - pressStartRef.current.y);
    if (deltaX > 6 || deltaY > 6) {
      clearPressTimer();
    }
  };

  const handlePointerUp = () => {
    if (!nativeDraggingRef.current) resetDragState();
    else clearPressTimer();
  };

  const isSystem = module.zone === 'system';

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
          draggable={isArmedDrag}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={resetDragState}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', module.id);
            nativeDraggingRef.current = true;
            onDragStart(module.id);
          }}
          onDragEnd={() => {
            resetDragState();
            onDragEnd();
          }}
          className={`flex w-6 self-stretch cursor-grab items-center justify-center rounded-l active:cursor-grabbing hover:bg-gray-200/60 ${
            isArmedDrag ? 'bg-brand/10' : ''
          }`}
          title="长按后拖拽排序"
        >
          <GripVertical className={`h-3.5 w-3.5 ${isArmedDrag ? 'text-brand' : 'text-gray-300'}`} />
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
          <Layers className={`h-3.5 w-3.5 shrink-0 ${isSystem ? 'text-amber-500' : module.active ? 'text-brand' : 'text-gray-400'}`} />
          <span className={`truncate text-xs ${isSelected ? 'font-medium text-brand' : 'text-gray-700'}`}>{module.label}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isSystem ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'}`}>
            {isSystem ? '系统' : '输出'}
          </span>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleZone(module.id);
            }}
            className={`ml-1 rounded p-0.5 transition-colors ${isSystem ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
            title={isSystem ? '改为输出模块' : '改为系统指令'}
          >
            {isSystem ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
        </button>
      </div>
    </div>
  );
}
