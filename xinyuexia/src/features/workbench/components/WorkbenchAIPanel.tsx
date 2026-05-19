import { ChevronDown, Plus, Send, Settings, WandSparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { readModelSnapshot } from '@/features/models/hooks/useModels';
import { callModel } from '@/features/models/services/callModel';
import type { ModelItem } from '@/features/models/model/modelTypes';
import { readPromptSnapshot } from '@/features/prompts/hooks/usePrompts';
import type { PromptItem } from '@/features/prompts/model/promptTypes';

interface WorkbenchAIPanelProps {
  selectedChapterTitle: string | null;
  selectedWordCount: number;
  selectedChapterContent: string;
  onApplyResult: (action: 'replace' | 'append' | 'setting' | 'outline' | 'plot', content: string) => void;
}

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

function readConfig() {
  const models = readModelSnapshot();
  const prompts = readPromptSnapshot().prompts;
  return { models, prompts };
}

export function WorkbenchAIPanel({
  selectedChapterTitle,
  selectedWordCount,
  selectedChapterContent,
  onApplyResult,
}: WorkbenchAIPanelProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<ModelItem[]>(() => readConfig().models);
  const [prompts, setPrompts] = useState<PromptItem[]>(() => readConfig().prompts);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const enabledModels = useMemo(() => models.filter((model) => model.enabled), [models]);
  const selectedModel = enabledModels.find((model) => model.id === selectedModelId) ?? enabledModels[0] ?? null;
  const selectedPrompt = prompts.find((prompt) => prompt.id === selectedPromptId) ?? null;

  useEffect(() => {
    const updateConfig = () => {
      const next = readConfig();
      setModels(next.models);
      setPrompts(next.prompts);
    };
    window.addEventListener('xinyuexia_models_updated', updateConfig);
    window.addEventListener('xinyuexia_prompts_updated', updateConfig);
    return () => {
      window.removeEventListener('xinyuexia_models_updated', updateConfig);
      window.removeEventListener('xinyuexia_prompts_updated', updateConfig);
    };
  }, []);

  useEffect(() => {
    if (!selectedModelId && enabledModels[0]) {
      setSelectedModelId(enabledModels[0].id);
    }
  }, [enabledModels, selectedModelId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');

    if (!selectedModel) {
      setMessages((prev) => [...prev, { role: 'agent', content: '尚未配置启用模型。请先到“模型管理”新增并启用模型。' }]);
      return;
    }

    setIsLoading(true);
    try {
      const content = await callModel({
        model: selectedModel,
        prompt: selectedPrompt?.content ?? '',
        userContent: text,
        chapterContext: selectedChapterContent.trim(),
      });
      setMessages((prev) => [...prev, { role: 'agent', content }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'agent',
        content: error instanceof Error ? `【错误】${error.message}` : '【错误】模型请求失败',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyResult = (action: 'replace' | 'append' | 'setting' | 'outline' | 'plot', content: string) => {
    onApplyResult(action, content);
    const labels = {
      replace: '已覆盖正文',
      append: '已追加到正文',
      setting: '已保存到设定库',
      outline: '已保存到概要库',
      plot: '已保存到剧情库',
    };
    setActionMessage(labels[action]);
    window.setTimeout(() => setActionMessage(''), 1800);
  };

  const canApplyMessage = (message: ChatMessage) => (
    message.role === 'agent'
    && !message.content.startsWith('【错误】')
    && !message.content.includes('尚未配置启用模型')
  );

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-gray-100 px-3">
        <div className="flex items-center gap-2">
          <WandSparkles className="h-4 w-4 text-brand" />
          <span className="text-sm font-bold text-gray-900">AI 助手</span>
        </div>
        <button
          onClick={() => navigate('/model-manage')}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="模型设置"
        >
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
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-brand"
          >
            <Plus className="h-3 w-3" />
            新对话
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <select
            value={selectedModel?.id ?? ''}
            onChange={(event) => setSelectedModelId(event.target.value)}
            onDoubleClick={() => navigate('/model-manage')}
            className="min-w-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-500 outline-none focus:border-brand"
          >
            {enabledModels.length === 0 ? (
              <option value="">无启用模型</option>
            ) : enabledModels.map((model) => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
          <select
            value={selectedPrompt?.id ?? ''}
            onChange={(event) => setSelectedPromptId(event.target.value)}
            onDoubleClick={() => navigate('/prompts')}
            className="min-w-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-500 outline-none focus:border-brand"
          >
            <option value="">默认提示词</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>{prompt.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <WandSparkles className="mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">输入需求后开始对话</p>
            <p className="mt-1 text-xs leading-5 text-gray-300">会自动携带当前章节正文，并使用选中的模型和提示词。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-8' : 'mr-8'}>
                <div
                  className={`whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-6 ${
                    message.role === 'user'
                      ? 'bg-brand text-white'
                      : 'border border-gray-100 bg-gray-50 text-gray-600'
                  }`}
                >
                  {message.content}
                </div>
                {canApplyMessage(message) && (
                  <div className="mt-1 flex flex-wrap gap-1.5 pl-1">
                    <button onClick={() => applyResult('replace', message.content)} className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:border-brand hover:text-brand">覆盖正文</button>
                    <button onClick={() => applyResult('append', message.content)} className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:border-brand hover:text-brand">追加正文</button>
                    <button onClick={() => applyResult('setting', message.content)} className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:border-brand hover:text-brand">存设定</button>
                    <button onClick={() => applyResult('outline', message.content)} className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:border-brand hover:text-brand">存概要</button>
                    <button onClick={() => applyResult('plot', message.content)} className="rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:border-brand hover:text-brand">存剧情库</button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="mr-8 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-400">
                AI 正在生成...
              </div>
            )}
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
              void sendMessage();
            }
          }}
          placeholder="输入要让 AI 处理的内容..."
          className="h-24 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
        />
        <div className="mt-2 flex justify-end">
          {actionMessage && (
            <span className="mr-auto self-center text-[11px] text-brand">{actionMessage}</span>
          )}
          <button
            onClick={() => void sendMessage()}
            disabled={isLoading || !input.trim()}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs text-white hover:bg-brand-dark disabled:bg-gray-300"
          >
            <Send className="h-3.5 w-3.5" />
            {isLoading ? '生成中' : '发送'}
          </button>
        </div>
      </div>
    </aside>
  );
}
