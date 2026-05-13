import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  X,
  AlertTriangle,
} from 'lucide-react';

import { useNovelsContext } from '@/hooks/useNovels';
import { toChineseNumber } from '@/hooks/useNovels';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

interface SidebarProps {
  onSelectChapter?: () => void;
  onTogglePublished?: () => void;
  showPublished?: boolean;
}

/* ─── 章节回收站弹窗 ─── */
function ChapterRecycleModal({
  isOpen, onClose,
}: { isOpen: boolean; onClose: () => void }) {
  const { recycledChapters, restoreChapter, permanentDeleteChapter } = useNovelsContext();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEscToClose(onClose, isOpen);
  const backdropRef = useBackdropClick(onClose, isOpen);

  if (!isOpen) return null;

  const handlePermanentClick = (id: number) => {
    setPendingId(id);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (pendingId !== null) permanentDeleteChapter(pendingId);
    setShowConfirm(false);
    setPendingId(null);
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[520px] max-w-[90vw] h-[420px] max-h-[70vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-900">章节回收站</h3>
            <p className="text-xs text-gray-400 mt-0.5">已删除章节保留 30 天，可随时恢复</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {recycledChapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Trash2 className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">回收站为空</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recycledChapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-700">{ch.title}</p>
                    <p className="text-xs text-gray-400">删除于 {ch.deletedAt} · 剩余 {ch.remainingDays} 天</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => restoreChapter(ch.id)} className="px-2 py-1 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">恢复</button>
                    <button onClick={() => handlePermanentClick(ch.id)} className="px-2 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50">彻底删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[360px] bg-white rounded-xl shadow-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-gray-900">警告</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5">彻底删除后将无法恢复，是否继续？</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">取消</button>
              <button onClick={handleConfirm} className="px-4 py-1.5 text-sm text-white bg-amber-500 rounded-md hover:bg-amber-600">彻底删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ onSelectChapter, onTogglePublished, showPublished }: SidebarProps) {
  const {
    volumes, sortAsc, recycledChapters, currentNovelId, showToast, novels,
    addVolume, toggleVolume, deleteChapter, selectChapter, toggleSort, setVolumesMap,
    getChapterWordCount,
  } = useNovelsContext();

  // 获取当前作品类型
  const currentNovel = novels.find((n) => n.id === currentNovelId);
  const workType = currentNovel?.type || 'novel';
  // 章节单位：小说为"章"，剧本为"集"
  const chapterUnit = workType === 'script' ? '集' : '章';
  // 卷单位：小说为"卷"，剧本为"卡"

  const [showChapterRecycle, setShowChapterRecycle] = useState(false);
  const [volumeContextMenu, setVolumeContextMenu] = useState<{ visible: boolean; x: number; y: number; volumeId: number | null }>({ visible: false, x: 0, y: 0, volumeId: null });
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; volumeId: number | null; chapterId: number | null }>({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  // 点击其他地方关闭卷右键菜单
  useEffect(() => {
    if (!volumeContextMenu.visible) return;
    const handleClick = () => setVolumeContextMenu({ visible: false, x: 0, y: 0, volumeId: null });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [volumeContextMenu.visible]);

  // 中文数字 ↔ 阿拉伯数字 转换
  const cnNumMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
    '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
    '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25,
    '二十六': 26, '二十七': 27, '二十八': 28, '二十九': 29, '三十': 30,
  };

  // 新增卷
  const handleAddVolume = () => {
    // 从现有卷名中提取最大序号（支持中文数字和阿拉伯数字）
    let maxVolNum = 0;
    const volPattern = /第([一二三四五六七八九十\d]+)卷/;
    volumes.forEach((v) => {
      const match = v.name.match(volPattern);
      if (match) {
        const raw = match[1];
        let num: number;
        if (/^\d+$/.test(raw)) {
          num = parseInt(raw, 10);
        } else {
          num = cnNumMap[raw] || 0;
        }
        if (num > maxVolNum) maxVolNum = num;
      }
    });
    const nextNum = maxVolNum + 1;
    const isScript = workType === 'script';
    const name = isScript
      ? (nextNum <= 3 ? `第${toChineseNumber(nextNum)}卷` : '空')
      : `第${toChineseNumber(nextNum)}卷`;
    const newVolume = {
      id: Date.now(),
      name,
      isExpanded: true,
      chapters: [],
    };
    setVolumesMap((prev) => {
      const currentVolumes = prev[currentNovelId] || [];
      return {
        ...prev,
        [currentNovelId]: [...currentVolumes, newVolume],
      };
    });
  };

  // 删除卷
  const handleDeleteVolume = (volumeId: number) => {
    const vol = volumes.find((v) => v.id === volumeId);
    if (!vol) return;
    if (vol.chapters.length > 0) {
      showToast('删除失败', '该卷下还有章节，请先删除章节');
      return;
    }
    setVolumesMap((prev) => {
      const currentVolumes = prev[currentNovelId] || [];
      return {
        ...prev,
        [currentNovelId]: currentVolumes.filter((v) => v.id !== volumeId),
      };
    });
  };

  // 发布章节
  const handlePublishChapter = (volumeId: number, chapterId: number) => {
    const vol = volumes.find((v) => v.id === volumeId);
    const chapter = vol?.chapters.find((c) => c.id === chapterId);
    if (!vol || !chapter) return;
    // 检查已发布中是否已有同序号章节
    const alreadyPublished = vol.chapters.find((c) => c.id !== chapterId && c.serialNumber === chapter.serialNumber && c.isPublished);
    if (alreadyPublished) {
      showToast('发布失败', `已有第${chapter.serialNumber}${chapterUnit}，请检查序号`);
      return;
    }
    setVolumesMap((prev) => {
      const currentVolumes = prev[currentNovelId] || [];
      return {
        ...prev,
        [currentNovelId]: currentVolumes.map((v) =>
          v.id === volumeId
            ? { ...v, chapters: v.chapters.map((c) => c.id === chapterId ? { ...c, isPublished: true } : c) }
            : v
        ),
      };
    });
  };

  // 实时字数统计：监听 Editor 内容保存事件，触发重新计算
  const [wordCountTick, setWordCountTick] = useState(0);
  useEffect(() => {
    const handler = () => setWordCountTick((t) => t + 1);
    window.addEventListener('chapter_content_saved', handler);
    return () => window.removeEventListener('chapter_content_saved', handler);
  }, []);

  return (
    <aside className="w-[200px] flex flex-col bg-white border-r border-gray-300 shrink-0">
      {/* 目录头部 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 h-[42px] shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 whitespace-nowrap">未发布</h2>
          <span className="flex items-center justify-center w-5 h-5 text-xs bg-brand/10 text-brand-dark rounded-full font-medium">
            {volumes.reduce((sum, v) => sum + v.chapters.filter(c => !c.isPublished).length, 0)}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* 已发布按钮 — 脚本作品隐藏 */}
          {workType !== 'script' && (
            <button
              onClick={onTogglePublished}
              className="flex items-center justify-center px-2 py-1 text-xs text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-colors whitespace-nowrap"
              title="已发布"
            >
              {showPublished ? '收回已发布' : '展开已发布'}
            </button>
          )}
        </div>
      </div>

      {/* 目录树 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {volumes.map((volume) => (
          <div key={volume.id} className="mb-1">
            {/* 卷标题 - 可折叠 */}
            <div
              className="group flex items-center gap-1 rounded-md bg-brand-light hover:bg-brand/10 transition-colors px-2 py-1.5 h-[36px]"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setVolumeContextMenu({ visible: true, x: e.clientX, y: e.clientY, volumeId: volume.id });
              }}
            >
              <button
                onClick={() => toggleVolume(volume.id)}
                className="flex items-center gap-1.5 flex-1 text-left"
              >
                {volume.isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-brand-dark" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-brand-dark" />
                )}
                <span className="text-sm font-medium text-brand-dark">{volume.name}</span>
                <span className="text-xs text-gray-400 ml-1">{volume.chapters.length}{chapterUnit}</span>
              </button>

              {/* 卷内新增章节按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // 找到当前所有章节的最大 serialNumber
                  let maxSerial = 0;
                  volumes.forEach((v) => {
                    v.chapters.forEach((c) => {
                      if (c.serialNumber > maxSerial) maxSerial = c.serialNumber;
                    });
                  });
                  // 在当前卷新增章节
                  setVolumesMap((prev) => {
                    const currentVolumes = prev[currentNovelId] || [];
                    return {
                      ...prev,
                      [currentNovelId]: currentVolumes.map((v) => {
                        if (v.id !== volume.id) return v;
                        const nextNum = maxSerial + 1;
                        const newId = Date.now() + Math.floor(Math.random() * 1000);
                        const isJigang = v.name === '集纲';
                        const newChapter = { id: newId, title: isJigang ? `集纲${nextNum}` : '', serialNumber: nextNum, wordCount: 0, isSelected: true, isPublished: false };
                        return {
                          ...v,
                          chapters: [...v.chapters.map((c) => ({ ...c, isSelected: false })), newChapter]
                            .sort((a, b) => a.serialNumber - b.serialNumber),
                        };
                      }),
                    };
                  });
                }}
                className="flex items-center justify-center text-lg font-bold text-brand-dark hover:bg-brand/20 rounded transition-colors"
                style={{ width: '36px', height: '36px', fontSize: '20px' }}
                title="新增章节"
              >
                +
              </button>
            </div>

            {/* 章节列表 */}
            {volume.isExpanded && (
              <div className="mt-0.5 ml-1 space-y-0.5">
                {[...volume.chapters].filter(c => !c.isPublished).sort((a, b) => sortAsc ? a.serialNumber - b.serialNumber : b.serialNumber - a.serialNumber).map((chapter) => (
                  <div
                    key={chapter.id}
                    onClick={() => { selectChapter(volume.id, chapter.id); onSelectChapter?.(); }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, volumeId: volume.id, chapterId: chapter.id });
                    }}
                    className={`group relative flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                      chapter.isSelected
                        ? 'bg-orange-50 border-l-[3px] border-orange-400'
                        : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                    }`}>
                    <span className={`flex-1 text-sm font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis ${chapter.isSelected ? 'text-orange-600' : 'text-gray-700'}`}>{`第${chapter.serialNumber}${chapterUnit}`}{chapter.title ? ` ${chapter.title}` : ''}</span>
                    <span className="text-xs text-gray-400 shrink-0 group-hover:opacity-0 transition-opacity">{wordCountTick >= 0 && getChapterWordCount(chapter.id)}</span>
                    {/* 发布按钮 — 悬浮时替换字数位置 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePublishChapter(volume.id, chapter.id); }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-all leading-none shrink-0 opacity-0 group-hover:opacity-100 z-10"
                      title="发布"
                    >
                      发布
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      </div>

      {/* 底部功能栏 */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-gray-100">
        <button
          onClick={addVolume}
          className="flex-1 flex items-center justify-center px-1 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand transition-colors whitespace-nowrap"
        >
          {workType === 'script' ? '新增卡' : '新增卷'}
        </button>
        <button
          onClick={toggleSort}
          className="flex-1 flex items-center justify-center px-1 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand transition-colors whitespace-nowrap"
          title={sortAsc ? '倒序' : '正序'}
        >
          {sortAsc ? '倒序' : '正序'}
        </button>
        <button
          onClick={() => setShowChapterRecycle(true)}
          className="relative flex-1 flex items-center justify-center px-1 py-1.5 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors whitespace-nowrap"
        >
          回收站
          {recycledChapters.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* 底部操作区 */}
      <div className="p-2 border-t border-gray-200">
        <div className="flex items-center gap-1.5">
          <button className="flex-1 px-1.5 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap">
            导出章节
          </button>
          <button className="flex-1 px-1.5 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand transition-colors whitespace-nowrap">
            一键发布
          </button>
        </div>
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
                handlePublishChapter(contextMenu.volumeId, contextMenu.chapterId);
              }
              setContextMenu({ visible: false, x: 0, y: 0, volumeId: null, chapterId: null });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand hover:bg-brand-light transition-colors text-left"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
            发布章节
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          <button
            onClick={() => {
              if (contextMenu.volumeId && contextMenu.chapterId) {
                deleteChapter(contextMenu.volumeId, contextMenu.chapterId);
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
      {/* 卷右键菜单 */}
      {volumeContextMenu.visible && (
        <div
          className="fixed z-[100] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{ left: volumeContextMenu.x, top: volumeContextMenu.y }}
        >
          <button
            onClick={() => {
              handleAddVolume();
              setVolumeContextMenu({ visible: false, x: 0, y: 0, volumeId: null });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand hover:bg-brand-light transition-colors text-left"
          >
            <Plus className="w-3.5 h-3.5" />
            新增卷
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          <button
            onClick={() => {
              if (volumeContextMenu.volumeId) handleDeleteVolume(volumeContextMenu.volumeId);
              setVolumeContextMenu({ visible: false, x: 0, y: 0, volumeId: null });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除卷
          </button>
        </div>
      )}

      <ChapterRecycleModal isOpen={showChapterRecycle} onClose={() => setShowChapterRecycle(false)} />
    </aside>
  );
}
