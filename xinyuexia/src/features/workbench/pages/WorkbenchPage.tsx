import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { ChapterEditor } from '@/features/workbench/components/ChapterEditor';
import { ChapterRecycleModal } from '@/features/workbench/components/ChapterRecycleModal';
import { ChapterSidebar } from '@/features/workbench/components/ChapterSidebar';
import { WorkbenchAIPanel } from '@/features/workbench/components/WorkbenchAIPanel';
import { WorkbenchHeader } from '@/features/workbench/components/WorkbenchHeader';
import { WorkbenchLibraryPanel } from '@/features/workbench/components/WorkbenchLibraryPanel';
import { WorkbenchModal } from '@/features/workbench/components/WorkbenchModal';
import { useWorkbenchData } from '@/features/workbench/hooks/useWorkbenchData';

type ModalKey = 'workInfo' | 'extract' | 'settings' | 'outline' | 'notes';

export function WorkbenchPage() {
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [notes, setNotes] = useState(() => localStorage.getItem('xinyuexia_workbench_notes') ?? '');
  const [aiPanelWidth, setAiPanelWidth] = useState(() => {
    const saved = Number.parseInt(localStorage.getItem('xinyuexia_ai_panel_width') ?? '290', 10);
    return Number.isFinite(saved) ? saved : 290;
  });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(290);
  const {
    currentNovel,
    volumes,
    recycledChapters,
    selectedChapter,
    editorContent,
    sortAsc,
    lastSavedAt,
    selectChapter,
    toggleVolume,
    toggleSort,
    addVolume,
    addChapter,
    renameChapter,
    deleteChapter,
    restoreChapter,
    permanentDeleteChapter,
    saveContent,
  } = useWorkbenchData();

  const handlePanelDragStart = (event: ReactMouseEvent) => {
    event.preventDefault();
    dragStartX.current = event.clientX;
    dragStartWidth.current = aiPanelWidth;
    setIsDraggingPanel(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    if (!isDraggingPanel) return;

    const handleMove = (event: MouseEvent) => {
      const deltaX = dragStartX.current - event.clientX;
      setAiPanelWidth(Math.max(220, Math.min(600, dragStartWidth.current + deltaX)));
    };
    const handleUp = () => {
      setIsDraggingPanel(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPanel]);

  useEffect(() => {
    localStorage.setItem('xinyuexia_ai_panel_width', String(aiPanelWidth));
  }, [aiPanelWidth]);

  useEffect(() => {
    localStorage.setItem('xinyuexia_workbench_notes', notes);
  }, [notes]);

  if (!currentNovel) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">未选择作品</h1>
          <p className="mt-2 text-sm text-gray-500">请先从作品列表选择一本小说或剧本。</p>
          <Link to="/novels" className="mt-5 inline-flex rounded-md bg-brand px-4 py-2 text-sm text-white transition-colors hover:bg-brand-dark">
            返回我的小说
          </Link>
        </div>
      </div>
    );
  }

  const backTo = currentNovel.type === 'script' ? '/scripts' : '/novels';
  const selectedChapterTitle = selectedChapter?.chapter.title ?? null;
  const selectedWordCount = selectedChapter?.chapter.wordCount ?? 0;
  const chapterCount = volumes.reduce((sum, volume) => sum + volume.chapters.length, 0);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <WorkbenchHeader
        title={currentNovel.title}
        backTo={backTo}
        onOpenWorkInfo={() => setActiveModal('workInfo')}
        onOpenExtract={() => setActiveModal('extract')}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenOutline={() => setActiveModal('outline')}
        onOpenNotes={() => setActiveModal('notes')}
      />
      <div className="flex flex-1 overflow-hidden">
        <ChapterSidebar
          volumes={volumes}
          sortAsc={sortAsc}
          recycledCount={recycledChapters.length}
          onToggleVolume={toggleVolume}
          onToggleSort={toggleSort}
          onSelectChapter={selectChapter}
          onAddChapter={addChapter}
          onAddVolume={addVolume}
          onDeleteChapter={deleteChapter}
          onOpenRecycle={() => setIsRecycleOpen(true)}
        />
        <ChapterEditor
          chapter={selectedChapter?.chapter ?? null}
          content={editorContent}
          lastSavedAt={lastSavedAt}
          onRenameChapter={renameChapter}
          onChangeContent={saveContent}
        />
        <div
          className="group z-10 flex w-[4px] shrink-0 cursor-ew-resize items-center justify-center bg-transparent transition-colors hover:bg-brand/30"
          onMouseDown={handlePanelDragStart}
          title="拖拽调整宽度"
        >
          <div className="h-8 w-[2px] rounded-full bg-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <aside className="shrink-0 border-l border-gray-200 bg-white" style={{ width: aiPanelWidth }}>
          <WorkbenchAIPanel selectedChapterTitle={selectedChapterTitle} selectedWordCount={selectedWordCount} />
        </aside>
      </div>

      <ChapterRecycleModal
        isOpen={isRecycleOpen}
        chapters={recycledChapters}
        onClose={() => setIsRecycleOpen(false)}
        onRestore={(chapterId) => {
          restoreChapter(chapterId);
          setIsRecycleOpen(false);
        }}
        onPermanentDelete={permanentDeleteChapter}
      />

      <WorkbenchModal title="作品信息" isOpen={activeModal === 'workInfo'} onClose={() => setActiveModal(null)}>
        <div className="flex-1 overflow-y-auto bg-white p-5">
          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-base font-bold text-gray-900">作品概览</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">作品名</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{currentNovel.title}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">章节数</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{chapterCount}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">总字数</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">{currentNovel.wordCount ?? 0}</p>
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 text-base font-bold text-gray-900">作品简介</h3>
              <textarea
                value="新项目暂未接入作品简介字段；这里保留旧版作品信息弹窗位置。"
                readOnly
                className="h-36 w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-500"
              />
            </section>
          </div>
        </div>
      </WorkbenchModal>

      <WorkbenchModal title="提炼剧情" isOpen={activeModal === 'extract'} onClose={() => setActiveModal(null)} widthClass="w-[820px]">
        <div className="flex flex-1 flex-col bg-white p-5">
          <div className="rounded-lg border border-brand/20 bg-brand-light/50 p-4">
            <h3 className="text-sm font-bold text-gray-900">当前章节提炼入口</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              旧版这里是工作台内嵌提炼弹窗。新项目目前已完成独立“提炼剧情”页面，可从左侧导航进入完整批量提炼流程；此弹窗先保留工作台入口位置。
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
            当前章节：{selectedChapterTitle ?? '未选择章节'}
          </div>
        </div>
      </WorkbenchModal>

      <WorkbenchModal title="设定库" isOpen={activeModal === 'settings'} onClose={() => setActiveModal(null)}>
        <WorkbenchLibraryPanel
          storageKey={`xinyuexia_workbench_settings_${currentNovel.id}`}
          tabs={['角色', '设定', '伏笔']}
          emptyText="暂无设定内容"
        />
      </WorkbenchModal>

      <WorkbenchModal title="概要库" isOpen={activeModal === 'outline'} onClose={() => setActiveModal(null)}>
        <WorkbenchLibraryPanel
          storageKey={`xinyuexia_workbench_outline_${currentNovel.id}`}
          tabs={['章节概要', '卷概要']}
          emptyText="暂无概要内容"
        />
      </WorkbenchModal>

      <WorkbenchModal title="备忘录" isOpen={activeModal === 'notes'} onClose={() => setActiveModal(null)}>
        <div className="flex min-h-0 flex-1 flex-col bg-white p-5">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="记录临时想法、伏笔、待修改内容..."
            className="editor-scrollbar flex-1 resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm leading-7 text-gray-700 outline-none focus:border-brand"
          />
        </div>
      </WorkbenchModal>
    </div>
  );
}
