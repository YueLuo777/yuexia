import type { Chapter } from '@/features/workbench/model/workbenchTypes';

interface ChapterEditorProps {
  chapter: Chapter | null;
  content: string;
  lastSavedAt: string | null;
  onRenameChapter: (chapterId: number, title: string) => void;
  onChangeContent: (content: string) => void;
}

export function ChapterEditor({ chapter, content, lastSavedAt, onRenameChapter, onChangeContent }: ChapterEditorProps) {
  if (!chapter) {
    return (
      <section className="flex flex-1 items-center justify-center bg-white">
        <p className="text-sm text-gray-400">请选择章节</p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col bg-white">
      <div className="flex h-[58px] shrink-0 items-center gap-3 border-b border-gray-100 px-6">
        <span className="text-sm font-semibold text-orange-500">第{chapter.serialNumber}章</span>
        <input
          value={chapter.title}
          onChange={(event) => onRenameChapter(chapter.id, event.target.value)}
          placeholder="请输入章节标题"
          className="min-w-0 flex-1 rounded-md border border-transparent bg-gray-50 px-3 py-2 text-base font-bold text-gray-900 transition-colors focus:border-brand focus:bg-white"
        />
        <span className="text-xs text-gray-400">{chapter.wordCount} 字</span>
        <span className="text-xs text-gray-300">{lastSavedAt ? `已保存 ${lastSavedAt}` : '自动保存'}</span>
      </div>

      <textarea
        value={content}
        onChange={(event) => onChangeContent(event.target.value)}
        className="editor-scrollbar flex-1 resize-none border-0 bg-white px-8 py-6 text-[16px] leading-8 text-gray-800"
        placeholder="从这里开始写..."
      />
    </section>
  );
}
