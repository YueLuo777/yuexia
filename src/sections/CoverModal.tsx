import { useState, useRef } from 'react';
import {
  X,
  Image,
  Upload,
  Trash2,
} from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

interface CoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  novelTitle?: string;
  onCoverSelected?: (dataUrl: string) => void;
  onResetCover?: () => void;
}

export default function CoverModal({ isOpen, onClose, novelTitle = '我的作品', onCoverSelected, onResetCover }: CoverModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useBackdropClick(onClose, isOpen);

  useEscToClose(onClose, isOpen);
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('仅支持 PNG、JPG、WEBP 格式');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    if (onResetCover) {
      onResetCover();
      setPreviewUrl(null);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleUpload = () => {
    if (previewUrl && onCoverSelected) {
      onCoverSelected(previewUrl);
      onClose();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[480px] max-w-[92vw] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-gray-700" />
            <h2 className="text-base font-bold text-gray-900">上传封面</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            为「<span className="font-medium text-gray-900">{novelTitle}</span>」选择封面图片
          </p>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 预览区域 */}
          <div className="flex flex-col items-center gap-4">
            {previewUrl ? (
              <div className="w-48 h-64 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                <img src={previewUrl} alt="封面预览" className="w-full h-full object-cover" />
              </div>
            ) : (
              <button
                onClick={triggerFileInput}
                className="w-48 h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-brand hover:bg-brand-light/30 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-300" />
                <span className="text-sm text-gray-400">点击选择图片</span>
              </button>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex items-center gap-3 w-full justify-center">
              {previewUrl ? (
                <>
                  <button
                    onClick={triggerFileInput}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    <span>确认上传</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={triggerFileInput}
                  className="px-4 py-2 text-sm text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
                >
                  选择图片
                </button>
              )}
            </div>
          </div>

          {/* 恢复默认 */}
          {onResetCover && (
            <div className="flex justify-center pt-2 border-t border-gray-100">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>恢复默认封面</span>
              </button>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400">支持 PNG、JPG、WEBP 格式，建议 2:3 竖版比例，大小不超过 5MB。</p>
          </div>
        </div>
      </div>
    </div>
  );
}