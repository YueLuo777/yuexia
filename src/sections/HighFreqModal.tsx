import { useState } from 'react';
import { X } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

interface HighFreqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HighFreqModal({ isOpen, onClose }: HighFreqModalProps) {
  const [words, setWords] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('high_freq_words') || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!input.trim()) return;
    // 支持逗号或换行分隔
    const newWords = input.split(/[,，\n]+/).map((w) => w.trim()).filter((w) => w && !words.includes(w));
    if (newWords.length > 0) setWords((prev) => [...prev, ...newWords]);
    setInput('');
  };

  const handleRemove = (idx: number) => {
    setWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[480px] max-w-[90vw] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">高频词设置</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {/* 添加需要高亮的高频词 */}
          <div>
            <p className="text-sm text-gray-700 mb-2">添加需要高亮的高频词</p>
            {/* 已添加的词 */}
            <div className="min-h-[60px] p-3 border border-gray-200 rounded-md bg-white mb-3">
              {words.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">暂无高频词，请在下方添加</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {words.map((word, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {word}
                      <button onClick={() => handleRemove(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 输入框 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="请输入高频词"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand"
              />
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm text-white bg-gray-800 rounded-md hover:bg-gray-900 transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {/* 内置规则说明 */}
          <p className="text-xs text-gray-400">用逗号或换行分隔多个词。</p>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">取消</button>
            <button onClick={() => { localStorage.setItem('high_freq_words', JSON.stringify(words)); onClose(); }} className="px-4 py-2 text-sm text-white bg-gray-800 rounded-md hover:bg-gray-900 transition-colors">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
