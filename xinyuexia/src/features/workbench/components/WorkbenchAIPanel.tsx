import { ChevronDown, Plus, Send, Settings, WandSparkles } from 'lucide-react';
import { useState } from 'react';

interface WorkbenchAIPanelProps {
  selectedChapterTitle: string | null;
  selectedWordCount: number;
}

export function WorkbenchAIPanel({ selectedChapterTitle, selectedWordCount }: WorkbenchAIPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string }[]>([]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'agent', content: '新项目 AI 接口尚未接线；这里先保留旧版对话面板的布局和交互入口。' },
    ]);
    setInput('');
  };

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-gray-100 px-3">
        <div className="flex items-center gap-2">
          <WandSparkles className="h-4 w-4 text-brand" />
          <span className="text-sm font-bold text-gray-900">AI 助手</span>
        </div>
        <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="模型设置">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-gray-100 px-3 py-2">
        <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-600">
          <span>{selectedChapterTitle ? `当前章节：${selectedChapterTitle}` : '未选择章节'}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
          <span>关联字数：{selectedWordCount}</span>
          <button className="flex items-center gap-1 text-brand">
            <Plus className="h-3 w-3" />
            新对话
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <WandSparkles className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">输入需求后开始对话</p>
            <p className="mt-1 text-xs leading-5 text-gray-300">后续会迁移旧版模型管理、提示词和章节关联能力。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-xl px-3 py-2 text-xs leading-6 ${
                  message.role === 'user'
                    ? 'ml-8 bg-brand text-white'
                    : 'mr-8 border border-gray-100 bg-gray-50 text-gray-600'
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="输入要让 AI 处理的内容..."
          className="h-24 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
        />
        <div className="mt-2 flex justify-end">
          <button onClick={sendMessage} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs text-white hover:bg-brand-dark">
            <Send className="h-3.5 w-3.5" />
            发送
          </button>
        </div>
      </div>
    </aside>
  );
}
