import { useState } from 'react';
import { X, Sparkles, ChevronDown } from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

interface TitleOptimizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChapterSerial: number;
}

export default function TitleOptimizeModal({ isOpen, onClose, currentChapterSerial }: TitleOptimizeModalProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'batch'>('current');
  const [platform, setPlatform] = useState('番茄');
  const [maxLength, setMaxLength] = useState(16);
  const [reference, setReference] = useState('');
  const [candidateCount, setCandidateCount] = useState(10);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  const handleGenerate = () => {
    setIsGenerating(true);
    // 模拟AI生成
    setTimeout(() => {
      const mockTitles = [
        '废灵根少年误吞灵火，宗门震惊',
        '灵火碎片入体，废柴逆袭开始',
        '都市宗门里的灵火少年',
        '误吞灵火后，我成了宗门天才',
        '废灵根？不，我是灵火之主',
        '灵火碎片觉醒，废柴少年崛起',
        '被宗门收留后，我觉醒了灵火',
        '灵火入体，都市修仙路开启',
        '废灵根少年的灵火逆袭',
        '一块灵火碎片改变了我的人生',
      ].slice(0, candidateCount);
      setGeneratedTitles(mockTitles);
      setIsGenerating(false);
    }, 1500);
  };

  const handleApplyTitle = (_title: string) => {
    // 应用标题到当前章节
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[520px] max-h-[640px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">AI 标题优化</h2>
            <p className="text-xs text-gray-400 mt-0.5">根据本章正文生成「爆款章节标题」：适配发布平台（番茄），吸睛统一、强反差但不剧透</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1 text-sm rounded transition-colors ${activeTab === 'current' ? 'text-brand font-medium' : 'text-gray-400 hover:text-gray-600'}`}
          >
            当前章节
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1 text-sm rounded transition-colors ${activeTab === 'batch' ? 'text-brand font-medium' : 'text-gray-400 hover:text-gray-600'}`}
          >
            批量生成
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-gray-500">模型选择</span>
            <button className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              <span>哈基米3.1 · 官方-标题优化</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 发布平台 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">发布平台</label>
            <div className="relative">
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand pr-8"
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 标题字数上限 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">标题字数上限</label>
            <input
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand"
              min={1}
              max={50}
            />
          </div>

          {/* 参考标题 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">参考标题/对标（可选）</label>
            <textarea
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="输入参考标题或对标作品标题"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand resize-none"
            />
          </div>

          {/* 当前章节信息 */}
          {activeTab === 'current' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">第{currentChapterSerial}章</span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">候选数</label>
                  <input
                    type="number"
                    value={candidateCount}
                    onChange={(e) => setCandidateCount(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md text-center"
                    min={1}
                    max={20}
                  />
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`flex items-center justify-center gap-2 w-full py-2.5 text-sm text-white rounded-md transition-colors ${
                  isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand hover:bg-brand-dark'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? '生成中...' : '生成标题'}</span>
              </button>
            </div>
          )}

          {/* 生成的标题列表 */}
          {generatedTitles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">生成结果</p>
              {generatedTitles.map((title, idx) => (
                <div
                  key={idx}
                  onClick={() => handleApplyTitle(title)}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-brand hover:bg-brand-light cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                    <span className="text-sm text-gray-700">{title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{title.length}字</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
