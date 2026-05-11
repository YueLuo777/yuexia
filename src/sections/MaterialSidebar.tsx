import { useState, useMemo } from 'react';
import { Book, BookOpen, Library, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
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
  const { materials, deleteMaterial } = useMaterials();
  const [filterType, setFilterType] = useState<FilterType>('novel');
  const [expandedNovels, setExpandedNovels] = useState<Set<number>>(new Set());

  const filteredMaterials = useMemo(() => {
    if (filterType === 'all') return materials;
    return materials.filter((m) => m.type === filterType);
  }, [materials, filterType]);

  const groups = useMemo(() => {
    const map = new Map<number, NovelGroup>();
    filteredMaterials.forEach((m) => {
      if (!map.has(m.novelId)) {
        map.set(m.novelId, { id: m.novelId, title: m.novelTitle, materials: [] });
      }
      map.get(m.novelId)!.materials.push(m);
    });
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

  // 提取摘要内容（去掉【来源：xxx】前缀）
  const extractSummary = (content: string): string => {
    return content.replace(/^【来源：[^】]+】\n\n/, '').trim();
  };

  return (
    <div className="flex flex-col bg-white border-l border-gray-200 h-full shrink-0 overflow-hidden" style={{ width }}>
      {/* 标题 */}
      <div className="flex items-center justify-between px-3 h-[40px] bg-white border-b border-gray-100 shrink-0">
        <span className="text-sm font-bold text-blue-600">资料库侧边栏</span>
      </div>

      {/* 类型切换 */}
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

                {/* 资料项卡片 — 剧情点格式 */}
                {isExpanded && (
                  <div className="ml-1 space-y-2">
                    {group.materials.map((m) => {
                      // 从 content 解析标记
                      const lines = m.content.split('\n');
                      let abstractStart = -1, abstractEnd = lines.length;
                      for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith('【摘要】')) { abstractStart = i; break; }
                      }
                      const metaMarkers = ['【出处】', '【评分】', '【标签】', '【章节】'];
                      for (let i = 0; i < lines.length; i++) {
                        if (metaMarkers.some((mk) => lines[i].startsWith(mk))) {
                          if (abstractStart === -1 || i > abstractStart) { abstractEnd = i; break; }
                        }
                      }
                      let abstract = '';
                      if (abstractStart >= 0) {
                        abstract = lines.slice(abstractStart + 1, abstractEnd).join('\n').trim();
                      } else {
                        abstract = lines.slice(0, abstractEnd).join('\n').trim();
                      }
                      const sourceMatch = m.content.match(/【出处】《([^》]+)》-(第[\d一二三四五六七八九十百]+章(?:\(或第[\d-]+章\))?)/);
                      const ratingMatch = m.content.match(/【评分】\s*(\d+)分?/);
                      const source = sourceMatch ? sourceMatch[1] : m.novelTitle;
                      const chapter = sourceMatch ? sourceMatch[2] : `第${m.chapterSerial}章${m.chapterName ? ` ${m.chapterName}` : ''}`;
                      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : (m.rating ?? 0);
                      return (
                        <div
                          key={m.id}
                          className={`w-full text-left rounded-lg p-3 transition-colors border ${
                            selectedMaterialId === m.id
                              ? 'bg-orange-50 border-orange-200'
                              : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {/* 摘要 */}
                          <div className="mb-2">
                            <span className="text-[10px] text-gray-400 font-medium">摘要：</span>
                            <p className="text-xs text-gray-700 leading-relaxed line-clamp-3 mt-0.5">{abstract}</p>
                          </div>
                          {/* 书名 */}
                          <div className="mb-1">
                            <span className="text-[10px] text-gray-400 font-medium">书名：</span>
                            <span className="text-xs text-gray-700">《{source}》</span>
                          </div>
                          {/* 章节 */}
                          <div className="mb-1">
                            <span className="text-[10px] text-gray-400 font-medium">章节：</span>
                            <span className="text-xs text-gray-700">{chapter}</span>
                          </div>
                          {/* 评分 */}
                          <div className="mb-2">
                            <span className="text-[10px] text-gray-400 font-medium">评分：</span>
                            <span className="text-xs text-gray-700">{rating}分</span>
                          </div>
                          {/* 底部：左日期 + 右操作 */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <span className="text-[10px] text-gray-400">{m.createdAt}</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); onSelectMaterial(m.id); }}
                                className="text-[11px] text-brand hover:underline flex items-center gap-0.5"
                              >
                                <Pencil className="w-3 h-3" />
                                编辑
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteMaterial(m.id); }}
                                className="text-[11px] text-red-400 hover:text-red-600 hover:underline flex items-center gap-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
