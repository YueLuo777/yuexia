import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';

export default function PublishedSidebar() {
  const {
    volumes: sourceVolumes,
    currentNovelId,
    setVolumesMap,
    selectChapter,
    getChapterWordCount,
  } = useNovelsContext();

  const [sortAsc, setSortAsc] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; volumeId: number | null; chapterId: number | null }>({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });

  // 独立的卷折叠状态
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() =>
    new Set(sourceVolumes.filter((v) => v.isExpanded).map((v) => v.id))
  );
  // 卷结构变化时同步
  useEffect(() => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      sourceVolumes.forEach((v) => {
        if (!newSet.has(v.id) && !newSet.has(v.id)) newSet.add(v.id);
      });
      return newSet;
    });
  }, [sourceVolumes.map((v) => v.id).join(',')]);

  // 实时字数统计
  const [wordCountTick, setWordCountTick] = useState(0);
  useEffect(() => {
    const handler = () => setWordCountTick((t) => t + 1);
    window.addEventListener('chapter_content_saved', handler);
    return () => window.removeEventListener('chapter_content_saved', handler);
  }, []);

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  // 从 volumes 中提取已发布章节
  const publishedVolumes = sourceVolumes.map((vol) => ({
    ...vol,
    chapters: vol.chapters.filter((c) => c.isPublished),
  })).filter((vol) => vol.chapters.length > 0 || sourceVolumes.some((s) => s.id === vol.id));

  // 确保所有卷都存在（即使暂时没有已发布章节）
  const displayVolumes = sourceVolumes.map((sourceVol) => {
    const pubVol = publishedVolumes.find((p) => p.id === sourceVol.id);
    return pubVol || { ...sourceVol, chapters: [] };
  });

  const toggleVolume = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 撤回章节
  const handleUnpublishChapter = (volumeId: number, chapterId: number) => {
    setVolumesMap((prev) => {
      const currentVolumes = prev[currentNovelId] || [];
      return {
        ...prev,
        [currentNovelId]: currentVolumes.map((v) =>
          v.id === volumeId
            ? { ...v, chapters: v.chapters.map((c) => c.id === chapterId ? { ...c, isPublished: false } : c) }
            : v
        ),
      };
    });
  };

  // 删除已发布章节（彻底删除）
  const handleDeleteChapter = (volumeId: number, chapterId: number) => {
    setVolumesMap((prev) => {
      const currentVolumes = prev[currentNovelId] || [];
      return {
        ...prev,
        [currentNovelId]: currentVolumes.map((v) =>
          v.id === volumeId
            ? { ...v, chapters: v.chapters.filter((c) => c.id !== chapterId) }
            : v
        ),
      };
    });
  };

  const toggleSort = () => setSortAsc((prev) => !prev);

  const totalChapters = displayVolumes.reduce((sum, v) => sum + v.chapters.length, 0);

  return (
    <aside className="w-[190px] flex flex-col bg-white border-r border-gray-300 shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 h-[42px] shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">已发布</h2>
          <span className="flex items-center justify-center w-5 h-5 text-xs bg-brand/10 text-brand-dark rounded-full font-medium">
            {totalChapters}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleSort}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={sortAsc ? '正序' : '倒序'}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${sortAsc ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
          </button>
        </div>
      </div>

      {/* 目录树 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {displayVolumes.map((sourceVol) => {
          const pubVol = displayVolumes.find((p) => p.id === sourceVol.id);
          if (!pubVol) return null;
          return (
            <div key={sourceVol.id} className="mb-1">
              {/* 卷标题 */}
              <div className="flex items-center gap-1 rounded-md bg-brand-light hover:bg-brand/10 transition-colors px-2 py-1.5 h-[36px]">
                <button
                  onClick={() => toggleVolume(sourceVol.id)}
                  className="flex items-center gap-1.5 flex-1 text-left"
                >
                  {expandedIds.has(sourceVol.id) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-brand-dark" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-brand-dark" />
                  )}
                  <span className="text-sm font-medium text-brand-dark">{sourceVol.name}</span>
                  <span className="text-xs text-gray-400 ml-1">{pubVol.chapters.length}章</span>
                </button>
              </div>

              {/* 章节列表 */}
              {expandedIds.has(sourceVol.id) && (
                <div className="mt-0.5 ml-1 space-y-0.5">
                  {[...pubVol.chapters].sort((a, b) => sortAsc ? a.serialNumber - b.serialNumber : b.serialNumber - a.serialNumber).map((chapter) => (
                    <div
                      key={chapter.id}
                      onClick={() => selectChapter(sourceVol.id, chapter.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, volumeId: sourceVol.id, chapterId: chapter.id });
                      }}
                      className={`group relative flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors cursor-pointer border-l-[3px] ${
                        chapter.isSelected
                          ? 'bg-orange-50 border-orange-400'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <span className={`flex-1 text-sm font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis ${chapter.isSelected ? 'text-orange-600' : 'text-gray-700'}`}>
                        第{chapter.serialNumber}章<span className="hidden">{chapter.title ? ` ${chapter.title}` : ''}</span>
                      </span>
                      <span className="text-xs text-gray-400 shrink-0 group-hover:opacity-0 transition-opacity">{wordCountTick >= 0 && getChapterWordCount(chapter.id)}</span>
                      {/* 悬浮操作按钮 — 只有撤回 */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnpublishChapter(sourceVol.id, chapter.id); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-white bg-gray-400 rounded hover:bg-gray-500 transition-all leading-none shrink-0 opacity-0 group-hover:opacity-100 z-10"
                        title="撤回章节"
                      >
                        撤回
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {displayVolumes.every((v) => v.chapters.length === 0) && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <p className="text-xs">暂无已发布章节</p>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              if (contextMenu.volumeId && contextMenu.chapterId) {
                handleUnpublishChapter(contextMenu.volumeId, contextMenu.chapterId);
              }
              setContextMenu({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors text-left"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7 7 7-7"/></svg>
            撤回章节
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          <button
            onClick={() => {
              if (contextMenu.volumeId && contextMenu.chapterId) {
                handleDeleteChapter(contextMenu.volumeId, contextMenu.chapterId);
              }
              setContextMenu({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除章节
          </button>
        </div>
      )}
    </aside>
  );
}
