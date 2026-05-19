import { ArrowLeft, BookMarked, Database, FileText, Sparkles, StickyNote } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorkbenchHeaderProps {
  title: string;
  backTo: string;
}

export function WorkbenchHeader({ title, backTo }: WorkbenchHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <Link to={backTo} className="flex items-center gap-1 text-sm text-gray-600 transition-colors hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          <span>退出</span>
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="rounded-md border border-dashed border-gray-300 bg-gray-50/50 px-2 py-0.5 text-base font-bold text-gray-900">
            {title}
          </h1>
          <button className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            <FileText className="h-4 w-4" />
            <span>作品信息</span>
          </button>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {[
          ['提炼剧情', Sparkles],
          ['设定库', Database],
          ['概要库', BookMarked],
          ['备忘录', StickyNote],
        ].map(([label, Icon]) => (
          <button key={String(label)} className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark">
            <Icon className="h-4 w-4" />
            <span>{String(label)}</span>
          </button>
        ))}
      </nav>

      <div className="w-[172px]" />
    </header>
  );
}
