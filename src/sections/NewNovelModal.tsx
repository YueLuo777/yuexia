import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { X, Upload, Image } from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';

interface NewNovelModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'novel' | 'script';
}

export default function NewNovelModal({ isOpen, onClose, defaultType = 'novel' }: NewNovelModalProps) {
  const { addNovel, categories, getDefaultTitle } = useNovelsContext();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('未分类');
  const [workType, setWorkType] = useState<'novel' | 'script'>(defaultType);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 弹窗打开时重置状态，不再显示作品类型，默认使用传入的类型
  useEffect(() => {
    if (isOpen) {
      setWorkType(defaultType);
      setTitle('');
      setCategory('未分类');
      setCoverPreview(null);
      setSelectedFile(null);
    }
  }, [isOpen, defaultType]);

  const isScript = workType === 'script';

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [isOpen]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('文件大小不能超过 5MB');
      return;
    }
    setSelectedFile(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = useCallback(() => {
    let finalTitle = title.trim();
    if (!finalTitle) {
      finalTitle = getDefaultTitle(workType);
    }
    addNovel({
      title: finalTitle,
      wordCount: 0,
      category,
      cover: coverPreview || '',
      type: workType,
    });
    setTitle('');
    setCategory('未分类');
    setWorkType('novel');
    setCoverPreview(null);
    setSelectedFile(null);
    onClose();
  }, [title, workType, category, coverPreview, addNovel, getDefaultTitle, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex flex-col w-[720px] max-w-[90vw] bg-white rounded-xl shadow-2xl overflow-hidden" style={{ maxHeight: '92vh' }}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">{isScript ? '新建剧本' : '新建作品'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 120px)' }}>
          {/* 作品名称 */}
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">{isScript ? '剧本名称' : '作品名称'} <span className="text-red-400">*</span></label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`不输入则自动命名为${isScript ? '默认剧本N' : '默认小说N'}`} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand" />
          </div>

          {/* 作品分类 */}
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">{isScript ? '剧本分类' : '作品分类'}</label>
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-md appearance-none bg-white focus:outline-none focus:border-brand">
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>

          {/* 封面设置 */}
          <div>
            <label className="text-sm text-gray-700 mb-1.5 block">封面（可选）</label>
            <div className="flex items-center gap-3 mb-2">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span>选择文件</span>
              </button>
              <span className="text-sm text-gray-400">{selectedFile || '未选择文件（PNG/JPG/WEBP，≤5MB）'}</span>
            </div>
            <div className="w-[140px] h-[190px] border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center bg-gray-50 overflow-hidden">
              {coverPreview ? (
                <img src={coverPreview} alt="封面预览" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Image className="w-7 h-7 text-gray-300 mb-1" />
                  <p className="text-xs text-gray-400">暂无封面</p>
                  <p className="text-xs text-gray-300 mt-0.5">建议 600x800</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
          <button onClick={handleCreate} className="px-5 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand transition-colors font-medium">{isScript ? '创建剧本' : '创建作品'}</button>
        </div>
      </div>
    </div>
  );
}
