import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

interface WorkbenchModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}

export function WorkbenchModal({ title, isOpen, onClose, children, widthClass = 'w-[720px]' }: WorkbenchModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`flex h-[78vh] max-h-[86vh] ${widthClass} max-w-[96vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600" title="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
