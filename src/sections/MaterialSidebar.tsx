import { useState, useMemo } from 'react';
import { Book, BookOpen, Library, ChevronDown, ChevronRight } from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import type { Material } from '@/hooks/useMaterials';

type FilterType = 'novel' | 'script' | 'all';

interface MaterialSidebarProps {
  onSelectMaterial: (id: number) => void;
  width: number;
  selectedMaterialId: number | null;
}

interface NovelGroup {
  id: number;
  title: string;
  materials: Material[];
}

export default function MaterialSidebar({ onSelectMaterial, width, selectedMaterialId }: MaterialSidebarProps) {
  const { materials } = useMaterials();
  const [filterType, setFilterType] = useState<FilterType>('novel');
  const [expandedNovels, setExpandedNovels] = useState<Set<number>>(new Set());

  // 按当前筛选类型过滤资料
  const filteredMaterials = useMemo(() => {
    if (filterType === 'all') return materials;
    return materials.filter((m) => m.type === filterType);
  }, [materials, filterType]);

  // 按作品分组
  const groups = useMemo(() => {
    const map = new Map<number, NovelGroup>();
    filteredMaterials.forEach((m) => {
      if (!map.has(m.novelId)) {
        map.set(m.novelId, { id: m.novelId, title: m.novelTitle, materials: [] });
      }
      map.get(m.novelId)!.materials.push(m);
    });
    // 每组内按章节序号排序
    map.forEach((group) => {
      group.materials.sort((a, b) => {
        const sa = a.chapterSerial ?? Infinity;
        const sb = b.chapterSerial ?? Infinity;
        if (sa !== sb) return sa - sb;
        return a.id - b.id;
      });
    });
    return Array.from(map.values());
  }, [filteredMaterials]);

  const toggleNovel = (novelId: number) => {
    setExpandedNovels((prev) => {
      const next = new Set(prev);
      if (next.has(novelId)) next.delete(novelId);
      else next.add(novelId);
      return next;
    });
  };

  const filterButtons: { type: FilterType; label: string; icon: React.ReactNode }[] = [
    { type: 'novel', label: '小说', icon: <Book className="w-3.5 h-3.5" /> },
    { type: 'script', label: '剧本', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { type: 'all', label: '总', icon: <Library className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col bg-white border-l border-gray-200 h-full shrink-0 overflow-hidden" style={{ width }}>
      {/* 标题 + 类型切换 */}
      <div className="flex items-center justify-between px-3 h-[40px] bg-white border-b border-gray-100 shrink-0">
        <span className="text-sm font-bold text-blue-600">资料库侧边栏</span>
      </div>

      {/* 类型切换按钮 */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 shrink-0">
        {filterButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => setFilterType(btn.type)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-all flex-1 justify-center ${
              filterType === btn.type
                ? 'text-white bg-brand font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {btn.icon}
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* 资料列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {groups.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            暂无{filterType === 'novel' ? '小说' : filterType === 'script' ? '剧本' : ''}资料
          </p>
        ) : (
          groups.map((group) => {
            const isExpanded = expandedNovels.has(group.id);
            return (
              <div key={group.id}>
                {/* 作品分组标题 */}
                <button
                  onClick={() => toggleNovel(group.id)}
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-[#08B3D9] bg-[#E6F7FB] rounded-md hover:bg-[#D5F0F7] transition-colors mb-0.5"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-[#08B3D9]/80 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[#08B3D9]/80 shrink-0" />
                  )}
                  <span className="flex-1 text-left truncate">{group.title}</span>
                  <span className="text-[#08B3D9]/70 text-[10px]">{group.materials.length}条</span>
                </button>

                {/* 资料项列表 */}
                {isExpanded && (
                  <div className="ml-2 space-y-0.5">
                    {group.materials.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onSelectMaterial(m.id)}
                        className={`w-full flex items-center px-2 py-1.5 text-xs rounded transition-colors text-left ${
                          selectedMaterialId === m.id
                            ? 'bg-orange-50 text-orange-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">
                          {m.chapterSerial ? `第${m.chapterSerial}章 ` : ''}
                          {m.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
