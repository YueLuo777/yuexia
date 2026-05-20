import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'danger',
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconClass =
    confirmVariant === 'primary'
      ? 'bg-brand/10 text-brand'
      : confirmVariant === 'warning'
        ? 'bg-amber-50 text-amber-500'
        : 'bg-red-50 text-red-500';

  const confirmClass =
    confirmVariant === 'primary'
      ? 'bg-brand text-white hover:bg-brand-dark'
      : confirmVariant === 'warning'
        ? 'bg-amber-500 text-white hover:bg-amber-600'
        : 'bg-red-500 text-white hover:bg-red-600';

  const Icon = confirmVariant === 'danger' ? Trash2 : AlertTriangle;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[460px] max-w-[92vw] rounded-[24px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-7 py-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[28px] font-bold leading-none text-slate-900">{title}</h3>
              <p className="mt-6 whitespace-pre-wrap text-[15px] leading-7 text-slate-600">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 px-7 pb-7">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-base text-slate-600 transition-colors hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-2xl px-6 py-3 text-base transition-colors ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
