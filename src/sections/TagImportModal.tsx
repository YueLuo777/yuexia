import { useState, useRef } from 'react';
import { X, Upload, Sparkles, CheckCircle, FileText } from 'lucide-react';

interface TagImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => string[];
}

export default function TagImportModal({ isOpen, onClose, onImport }: TagImportModalProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!text.trim()) return;
    const imported = onImport(text);
    setResult(imported);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    setResult(null);
  };

  const handleClose = () => {
    setText('');
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div
        className="flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden w-[560px] max-w-[95vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h3 className="text-base font-bold text-gray-900">智能导入标签</h3>
          </div>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 文件选择 */}
          <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/30 transition-all"
          >
            <FileText className="w-5 h-5 text-gray-300" />
            <span className="text-sm text-gray-500">点击选择 .txt 或 .md 文件</span>
          </button>

          {/* 文本输入 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">或粘贴标签文本</label>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
              placeholder={`支持格式：
#标签名
**#标签名**
或完整的标签库文档（自动识别 # 开头的标签）`}
              rows={8}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300 resize-none"
            />
          </div>

          {/* 导入结果 */}
          {result !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">
                  成功导入 {result.length} 个标签
                </span>
              </div>
              {result.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {result.map(name => (
                    <span key={name} className="px-2 py-0.5 text-[11px] bg-white rounded border border-emerald-200 text-emerald-600">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
            关闭
          </button>
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm text-white bg-violet-500 rounded-md hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            开始识别
          </button>
        </div>
      </div>
    </div>
  );
}
