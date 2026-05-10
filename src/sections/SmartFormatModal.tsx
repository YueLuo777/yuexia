import { useState, useEffect } from 'react';
import { X, Wand2, RotateCcw } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

export interface FormatOptions {
  indent: boolean;
  mergeParagraphs: boolean;
  smartBreak: boolean;
  sentencesPerLine: number;
}

interface SmartFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string, settings: FormatOptions) => void;
  currentText: string;
  settings?: FormatOptions;
}

export const defaultFormatOptions: FormatOptions = {
  indent: true,
  mergeParagraphs: true,
  smartBreak: false,
  sentencesPerLine: 3,
};

export function applyFormat(text: string, options: FormatOptions): string {
  if (!text.trim()) return '';

  let result = text;

  // 1. 删除中文字与文字中间的空格，以及数字间的空格
  result = result.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
  result = result.replace(/(\d)\s+(\d)/g, '$1$2');

  // 2. 合并空行并整理成连续正文段落
  if (options.mergeParagraphs) {
    // 将2个及以上连续换行合并为单个换行（彻底去掉空行段落）
    result = result.replace(/\n{2,}/g, '\n');
    // 去除行首行尾空格，并过滤掉空白行
    result = result
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .join('\n');
  }

  // 3. 首行缩进
  if (options.indent) {
    result = result
      .split('\n')
      .map((line) => {
        if (line.trim()) return '\u3000\u3000' + line.trim();
        return line;
      })
      .join('\n');
  }

  // 4. 智能断句
  if (options.smartBreak) {
    const sentences = result
      .replace(/([。！？.!?]+)/g, '$1\x00')
      .split('\x00')
      .filter((s) => s.trim());

    const grouped: string[] = [];
    for (let i = 0; i < sentences.length; i += options.sentencesPerLine) {
      grouped.push(sentences.slice(i, i + options.sentencesPerLine).join(''));
    }
    result = grouped.join('\n');
  }

  return result;
}

export default function SmartFormatModal({ isOpen, onClose, onApply, currentText, settings }: SmartFormatModalProps) {
  const [options, setOptions] = useState<FormatOptions>({ ...(settings || defaultFormatOptions) });
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (settings) setOptions({ ...settings });
  }, [settings]);
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  const handlePreview = () => {
    setPreview(applyFormat(currentText, options));
  };

  const handleApply = () => {
    const formatted = applyFormat(currentText, options);
    onApply(formatted, options);
    onClose();
  };

  const handleReset = () => {
    setOptions({ ...defaultFormatOptions });
    setPreview('');
  };

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-start justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="flex items-center justify-center px-2 py-1.5 text-xs transition-colors"
        title={checked ? '已启用，点击关闭' : '未启用，点击开启'}
      >
        <div className={`w-7 h-4 rounded-full relative transition-colors ${checked ? 'bg-brand' : 'bg-gray-300'}`}>
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </div>
      </button>
    </div>
  );

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[560px] max-w-[90vw] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand-dark" />
            <h2 className="text-base font-bold text-gray-900">智能排版</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          <Toggle
            label="首行缩进"
            desc="每段开头自动添加两个全角空格"
            checked={options.indent}
            onChange={(v) => setOptions((prev) => ({ ...prev, indent: v }))}
          />
          <div className="border-t border-gray-100" />
          <Toggle
            label="合并空段落"
            desc="合并空行并整理成连续正文段落"
            checked={options.mergeParagraphs}
            onChange={(v) => setOptions((prev) => ({ ...prev, mergeParagraphs: v }))}
          />
          <div className="border-t border-gray-100" />
          <Toggle
            label="智能断句"
            desc="按句子数量自动换行"
            checked={options.smartBreak}
            onChange={(v) => setOptions((prev) => ({ ...prev, smartBreak: v }))}
          />
          {options.smartBreak && (
            <div className="flex items-center gap-3 ml-4 mb-2">
              <span className="text-sm text-gray-500">每</span>
              <div className="flex items-center">
                <button
                  onClick={() => setOptions((prev) => ({ ...prev, sentencesPerLine: Math.max(1, prev.sentencesPerLine - 1) }))}
                  className="w-7 h-7 text-sm text-gray-500 border border-gray-200 rounded-l-md hover:bg-gray-50 flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-10 h-7 text-sm text-center border-t border-b border-gray-200 flex items-center justify-center bg-white">
                  {options.sentencesPerLine}
                </span>
                <button
                  onClick={() => setOptions((prev) => ({ ...prev, sentencesPerLine: prev.sentencesPerLine + 1 }))}
                  className="w-7 h-7 text-sm text-gray-500 border border-gray-200 rounded-r-md hover:bg-gray-50 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-gray-500">句为一行</span>
            </div>
          )}

          {/* 预览 */}
          {preview && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-400 mb-2">预览</p>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-[120px] overflow-y-auto">{preview}</pre>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 shrink-0">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <RotateCcw className="w-4 h-4" />
            <span>恢复默认</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handlePreview} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
              预览效果
            </button>
            <button onClick={handleApply} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-brand rounded-md hover:bg-brand transition-colors font-medium">
              <Wand2 className="w-4 h-4" />
              <span>立即智能排版</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
