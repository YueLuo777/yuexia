import { useState } from 'react';
import { X, Sparkles, ChevronDown, Check } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

interface AIEraseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIEraseModal({ isOpen, onClose }: AIEraseModalProps) {
  const [writeTarget, setWriteTarget] = useState('写入正文');
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState('第1章');
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const [promptType, setPromptType] = useState<'template' | 'custom'>('template');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    // 模拟AI生成
    setTimeout(() => {
      setGeneratedContent('消痕后的文本将显示在这里。短句为王，去虚词，去翻译腔，去机器味。让文字回归自然的写作风格。');
      setIsGenerating(false);
    }, 1500);
  };

  const handleWrite = () => {
    // 将生成的内容写入正文
    if (generatedContent) {
      window.dispatchEvent(new CustomEvent('ai_erase_write', { detail: { content: generatedContent } }));
    }
    onClose();
  };

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[720px] max-w-[95vw] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">消除AI痕迹</h2>
            <span className="px-2 py-0.5 text-[10px] font-medium text-white bg-red-500 rounded-md">订阅不限次</span>
            <span className="text-xs text-gray-400">今日可用：5次</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 副标题 */}
        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
          <p className="text-xs text-gray-500">通用沉浸改写：短句为王，去虚词、去翻译腔、去机器味。</p>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* 左侧配置区 */}
            <div className="flex-1 p-5 space-y-4 border-r border-gray-100">
              {/* 写入目标 + 选中章节 */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5">写入目标</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowTargetDropdown(!showTargetDropdown)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <span>{writeTarget}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {showTargetDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        {['写入正文', '写入草稿'].map((item) => (
                          <button
                            key={item}
                            onClick={() => { setWriteTarget(item); setShowTargetDropdown(false); }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 ${writeTarget === item ? 'text-brand' : 'text-gray-700'}`}
                          >
                            <span>{item}</span>
                            {writeTarget === item && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5">选中章节</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowChapterDropdown(!showChapterDropdown)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <span>{selectedChapter}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {showChapterDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        {['第1章', '第2章', '第3章'].map((item) => (
                          <button
                            key={item}
                            onClick={() => { setSelectedChapter(item); setShowChapterDropdown(false); }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-gray-50 ${selectedChapter === item ? 'text-brand' : 'text-gray-700'}`}
                          >
                            <span>{item}</span>
                            {selectedChapter === item && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 提示词类型 */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">提示词类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPromptType('template')}
                    className={`px-4 py-1.5 text-xs rounded-full transition-colors ${promptType === 'template' ? 'text-white bg-brand' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                  >
                    模板提示词
                  </button>
                  <button
                    onClick={() => setPromptType('custom')}
                    className={`px-4 py-1.5 text-xs rounded-full transition-colors ${promptType === 'custom' ? 'text-white bg-brand' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
                  >
                    自定义提示词
                  </button>
                </div>
              </div>

              {/* 模板提示词 / 自定义提示词内容 */}
              {promptType === 'template' ? (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 text-[10px] text-brand bg-brand/10 rounded">使用的提示词库</span>
                    <span className="px-2 py-0.5 text-[10px] text-amber-600 bg-amber-50 rounded">关联信息已调整</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">官方-AI消痕 2.36</p>
                      <p className="text-xs text-gray-400">作者：炼字官方出品</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">更新于20260316 增强版 强力去AI 一键过朱雀</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-white transition-colors">
                      详情 <ChevronDown className="w-3 h-3 inline" />
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
                      <Sparkles className="w-3 h-3" />
                      从提示词市场选择
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">自定义提示词</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="输入自定义消痕提示词..."
                    className="w-full h-24 px-3 py-2 text-xs border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-brand"
                  />
                </div>
              )}

              {/* 批量AI消痕 */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">批量AI消痕</span>
                  <span className="text-xs text-gray-400">将替换正文内容</span>
                </div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">起始章节</label>
                    <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">第1章</div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-400 mb-1">结束章节</label>
                    <div className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">第1章</div>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                  批量AI消痕（1章）
                </button>
                <p className="mt-2 text-[10px] text-gray-400">提示：单次最多处理 20 章，超过会自动分批处理。</p>
              </div>

              {/* 免责声明 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  使用本功能即视为您已阅读并同意：您仅在法律法规允许的范围内使用本提示词/模板，不得用于任何违法违规行为；因您使用本提示词/模板所引发的一切责任与后果均由您自行承担，与平台无关。
                </p>
              </div>
            </div>

            {/* 右侧生成内容区 */}
            <div className="w-[280px] p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">工具生成内容</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">字号</span>
                  <button onClick={() => setFontSize(Math.max(12, fontSize - 1))} className="w-6 h-6 text-xs text-gray-500 hover:bg-gray-100 rounded">A-</button>
                  <span className="text-xs text-gray-600 w-8 text-center">{fontSize}px</span>
                  <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="w-6 h-6 text-xs text-gray-500 hover:bg-gray-100 rounded">A+</button>
                </div>
              </div>
              <div className="flex-1 border border-gray-100 rounded-lg p-3 bg-gray-50/30 overflow-y-auto">
                {isGenerating ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      AI生成中...
                    </div>
                  </div>
                ) : generatedContent ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap" style={{ fontSize: `${fontSize}px` }}>{generatedContent}</p>
                ) : (
                  <p className="text-sm text-gray-400 text-center mt-20">暂无输出，点击下方「AI生成」开始。</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">模型</span>
            <div className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-md">哈基米3.1</div>
            <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50">
              <Sparkles className="w-3.5 h-3.5" />
              AI生成
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-white transition-colors">取消</button>
            <button
              onClick={handleWrite}
              disabled={!generatedContent}
              className="flex items-center gap-1 px-4 py-2 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              写入正文
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
