import { SortableExtractModule } from '@/features/extract/components/SortableExtractModule';
import type { ExtractModule, ExtractZone } from '@/features/extract/model/extractTypes';

interface ExtractDropZoneProps {
  id: ExtractZone;
  title: string;
  modules: ExtractModule[];
  selectedId: string | null;
  activeDragId: string | null;
  dragOverId: string | null;
  dragOverZone: ExtractZone | null;
  onSelect: (id: string) => void;
  onToggleActive: (id: string) => void;
  onToggleZone?: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverModule: (id: string) => void;
  onDragOverZone: (id: ExtractZone) => void;
  onDropModule: (id: string) => void;
  onDropZone: (id: ExtractZone) => void;
}

export function ExtractDropZone({
  id,
  title,
  modules,
  selectedId,
  activeDragId,
  dragOverId,
  dragOverZone,
  onSelect,
  onToggleActive,
  onToggleZone,
  onDragStart,
  onDragEnd,
  onDragOverModule,
  onDragOverZone,
  onDropModule,
  onDropZone,
}: ExtractDropZoneProps) {
  const isSystem = id === 'system';
  const isOver = dragOverZone === id;
  const zoneBg = isSystem ? 'bg-amber-50/80' : 'bg-sky-50/80';

  return (
    <section className={`flex min-h-0 flex-1 flex-col border-b border-gray-100 ${isOver ? zoneBg : 'bg-white'}`}>
      <div className={`flex items-center justify-between border-b px-3 py-2 ${isOver ? (isSystem ? 'border-amber-200' : 'border-sky-200') : 'border-gray-100'}`}>
        <h3 className={`text-xs font-bold ${isSystem ? 'text-amber-700' : 'text-sky-700'}`}>{title}</h3>
        <span className="text-[10px] text-gray-400">{modules.length}</span>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          onDragOverZone(id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDropZone(id);
        }}
        className={`min-h-[140px] flex-1 overflow-y-auto border-2 border-dashed transition-colors ${
          isOver
            ? isSystem
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-sky-300 bg-sky-50/40'
            : 'border-transparent'
        }`}
      >
        {isOver && (
          <div className={`mx-2 mt-2 rounded-lg border border-dashed px-3 py-2 text-[11px] ${isSystem ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sky-300 bg-sky-50 text-sky-700'}`}>
            松开鼠标将模块放入这里
          </div>
        )}
        {modules.map((module) => (
          <SortableExtractModule
            key={module.id}
            module={module}
            isSelected={selectedId === module.id}
            isDragOver={dragOverId === module.id && activeDragId !== module.id}
            onSelect={onSelect}
            onToggleActive={onToggleActive}
            onToggleZone={onToggleZone ?? (() => {})}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOverModule}
            onDrop={onDropModule}
          />
        ))}
        {modules.length === 0 && (
          <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-gray-300">
            松开后可移动到这里
          </div>
        )}
      </div>
    </section>
  );
}
