import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ChapterEditor } from '@/features/workbench/components/ChapterEditor';
import { ChapterRecycleModal } from '@/features/workbench/components/ChapterRecycleModal';
import { ChapterSidebar } from '@/features/workbench/components/ChapterSidebar';
import { WorkbenchHeader } from '@/features/workbench/components/WorkbenchHeader';
import { useWorkbenchData } from '@/features/workbench/hooks/useWorkbenchData';

export function WorkbenchPage() {
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);
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

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <WorkbenchHeader title={currentNovel.title} backTo={backTo} />
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
        <aside className="w-[290px] shrink-0 border-l border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">AI 助手</h2>
            <p className="mt-1 text-xs text-gray-400">后续迁移提炼、续写和资料调用。</p>
          </div>
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
    </div>
  );
}
