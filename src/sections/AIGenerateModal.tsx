import { useState } from 'react';
import {
  X,
  ChevronDown,
  Sparkles,
  Diamond,
  BookOpen,
  AtSign,
  ChevronUp,
  Copy,
  Plus,
  Loader2
} from 'lucide-react';
import { useEscToClose } from '@/hooks/useEscToClose';
import { useBackdropClick } from '@/hooks/useBackdropClick';

export type GenerateMode = 'opening' | 'continue';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: GenerateMode;
}

interface GeneratedCard {
  id: number;
  status: 'thinking' | 'done';
  wordCount: number;
}

const modeConfig: Record<GenerateMode, {
  title: string;
  titleTag: string;
  taskName: string;
  taskTarget: string;
  promptTitle: string;
  promptAuthor: string;
  promptDesc: string;
  showPromptParams: boolean;
  showChapterCount: boolean;
}> = {
  opening: {
    title: '黄金开篇 审批',
    titleTag: '1-3',
    taskName: '黄金开篇',
    taskTarget: '第1-3章 正文',
    promptTitle: '官方-黄金三章 3.7 节奏优化版',
    promptAuthor: '炼字官方出品',
    promptDesc: '更新于20260425 节奏优化 强力去AI味 增强字数 专注增强版 增加镜头感',
    showPromptParams: false,
    showChapterCount: true,
  },
  continue: {
    title: '章节续写 审批',
    titleTag: '1-3',
    taskName: '黄金开篇',
    taskTarget: '第1-3章 正文',
    promptTitle: '官方-章节续写 5.82 钩子优化版',
    promptAuthor: '炼字官方出品',
    promptDesc: '更新于20260427 钩子优化 推演优化 去AI词强化 优化金句 优化逻辑校验 优化逻辑和数值运算 优化AI句式 黑箱原则 防泄密 高温 专注增强 强力去AI味 强化字数 剧情逻辑加强 智商推理增强 小伏笔回收 去AI常用词 毒点自检',
    showPromptParams: true,
    showChapterCount: true,
  },
};

export default function AIGenerateModal({ isOpen, onClose, mode }: AIGenerateModalProps) {
  const config = modeConfig[mode];
  const [promptTab, setPromptTab] = useState<'提示词库' | '自定义提示词'>('提示词库');
  const [chapterCount, setChapterCount] = useState('3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [emojiSwitch, setEmojiSwitch] = useState('关闭');

  const handleGenerate = () => {
    setIsGenerating(true);
    const cards: GeneratedCard[] = [
      { id: 1, status: 'thinking', wordCount: 0 },
      { id: 2, status: 'thinking', wordCount: 0 },
      { id: 3, status: 'thinking', wordCount: 0 },
    ];
    setGeneratedCards(cards);
  };

  const backdropRef = useBackdropClick(onClose, isOpen);
  useEscToClose(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-[960px] max-w-[92vw] h-[680px] max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">{config.title}</h2>
            <span className="px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">{config.titleTag}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 bg-gray-50 rounded-md">
              <Diamond className="w-3.5 h-3.5 text-brand-dark" />
              <span>预估 2364 灵石</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区 - 左右分栏 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左栏 */}
          <div className="flex-1 flex flex-col overflow-y-auto p-5">
            {/* 任务目标 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">任务目标</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{config.taskName}</span>
                <span className="text-sm font-bold text-brand-dark">{config.taskTarget}</span>
              </div>
            </div>

            {/* 本次生成 */}
            {config.showChapterCount && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">本次生成</p>
                  <span className="text-xs text-gray-500">预计范围：第1-3章</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-gray-500 shrink-0">一次生成</span>
                  <div className="relative flex-1">
                    <select
                      value={chapterCount}
                      onChange={(e) => setChapterCount(e.target.value)}
                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-md appearance-none bg-white focus:outline-none focus:border-brand"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">章</span>
                </div>
                <p className="text-xs text-gray-400">上限 5 章；若章纲不足，会自动下调实际生成章数。</p>
              </div>
            )}

            {/* 使用的提示词 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">使用的提示词</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPromptTab('提示词库')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      promptTab === '提示词库'
                        ? 'text-white bg-brand'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    提示词库
                  </button>
                  <button
                    onClick={() => setPromptTab('自定义提示词')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      promptTab === '自定义提示词'
                        ? 'text-white bg-brand'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    自定义提示词
                  </button>
                </div>
              </div>

              {/* 提示词卡片 */}
              <div className="flex gap-3 p-3 bg-white border border-gray-100 rounded-lg">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-amber-700 to-amber-900 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-amber-200 font-bold">炼</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs text-brand-dark bg-brand-light rounded">提示词库</span>
                    <span className="px-2 py-0.5 text-xs text-amber-600 bg-amber-50 rounded">关联信息已调整</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">{config.promptTitle}</h4>
                  <p className="text-xs text-gray-400 mb-1">作者：{config.promptAuthor}</p>
                  <p className="text-xs text-gray-400">{config.promptDesc}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button 
                      onClick={() => setShowDetail(!showDetail)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <span>详情</span>
                      {showDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-brand rounded-md hover:bg-brand transition-colors">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>更换提示词</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 补充信息 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">补充信息</p>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                    填入预设
                  </button>
                  <button className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md transition-colors">
                    <BookOpen className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md transition-colors">
                    <AtSign className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                placeholder="可选：限制字数、强调某条设定、改人称、加冲突/反转..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand resize-none bg-white"
              />
              <p className="mt-2 text-xs text-gray-400">提示：该内容会在生成/重新生成/追问时一并发送，用于约束本次输出。</p>
            </div>

            {/* 提示词参数 - 仅续写模式显示 */}
            {config.showPromptParams && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">提示词参数</p>
                  <span className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">共 1 个</span>
                </div>
                <div className="mb-2">
                  <label className="block text-sm text-gray-600 mb-1.5">
                    表情包和颜文字开关 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={emojiSwitch}
                      onChange={(e) => setEmojiSwitch(e.target.value)}
                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-md appearance-none bg-white focus:outline-none focus:border-brand"
                    >
                      <option value="关闭">关闭</option>
                      <option value="开启">开启</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* 预估成本 */}
            <div className="mb-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">预估成本:</span>
                <span className="text-sm font-bold text-gray-900">2364 灵石</span>
                <span className="text-xs text-gray-400">（{chapterCount} 章）</span>
              </div>
            </div>

            {/* 审批状态 */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-brand-light flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                </span>
                <span className="text-gray-500">提示词审批:</span>
                <span className="text-gray-900">待审批</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-brand-light flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                </span>
                <span className="text-gray-500">内容审批:</span>
                <span className="text-gray-900">待审批</span>
              </div>
            </div>
          </div>

          {/* 右栏 - 生成内容预览 */}
          <div className="w-[340px] border-l border-gray-100 flex flex-col">
            {!isGenerating && generatedCards.length === 0 ? (
              /* 空状态 */
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-gray-400 text-center">
                  尚未生成内容，请先完成提示词审批并开始生成。
                </p>
              </div>
            ) : (
              /* 生成中/已生成状态 */
              <>
                {/* 顶部工具栏 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500">工具生成内容</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">字号</span>
                    <button className="text-xs text-gray-500 hover:text-gray-700 px-1">A-</button>
                    <span className="text-xs text-gray-700">16px</span>
                    <button className="text-xs text-gray-500 hover:text-gray-700 px-1">A+</button>
                  </div>
                  <span className="text-xs text-gray-400">当前 0 字</span>
                </div>

                {/* 生成卡片列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {generatedCards.map((card) => (
                    <div key={card.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Loader2 className="w-4 h-4 text-brand-dark animate-spin" />
                        <span className="text-sm text-gray-600">思考中...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">字数: {card.wordCount} 字</span>
                        <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                          <Copy className="w-3 h-3" />
                          <span>复制</span>
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand transition-colors">
                          <Plus className="w-3 h-3" />
                          <span>采纳</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 底部栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">模型</span>
            <div className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-md">
              <span>啥基米3.1</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-5 py-2 text-sm rounded-md transition-colors font-medium ${
              isGenerating
                ? 'text-gray-500 bg-gray-100 cursor-not-allowed'
                : 'text-white bg-brand hover:bg-brand'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>AI生成</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
