import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import PromptZone from './PromptZone';
import ModelManageModal from './ModelManageModal';
import { useNovelsContext } from '@/hooks/useNovels';

/* ─── 思考中省略号动画组件（1→2→3→1 循环） ─── */
function ThinkingDots({ className = '' }: { className?: string }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span>AI正在思考中</span>
      <span className="inline-flex ml-0.5 w-3">
        {dotCount >= 1 && <span className="w-0.5 h-0.5 rounded-full bg-current inline-block" />}
        {dotCount >= 2 && <span className="w-0.5 h-0.5 rounded-full bg-current inline-block ml-[2px]" />}
        {dotCount >= 3 && <span className="w-0.5 h-0.5 rounded-full bg-current inline-block ml-[2px]" />}
      </span>
    </span>
  );
}

interface Chat {
  id: number;
  messages: { role: 'user' | 'agent'; content: string }[];
}

/* ─── 调用已配置模型的 API ─── */
async function callModelAPI(content: string, modelId: string): Promise<string> {
  try {
    const raw = localStorage.getItem('api_settings_v2');
    if (!raw) return '【错误】未配置模型，请先在模型管理中配置。';
    const data = JSON.parse(raw);
    const model = data.models?.find((m: any) => m.id === modelId && m.enabled);
    if (!model) return '【错误】选中的模型未找到或未启用。';
    if (!model.baseUrl || !model.apiKey) return '【错误】模型配置不完整，缺少 Base URL 或 API Key。';

    const baseUrl = model.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [{ role: 'user', content }],
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return `【错误】模型请求失败 (${response.status}): ${err.slice(0, 200)}`;
    }

    const result = await response.json();
    return result.choices?.[0]?.message?.content || '【错误】模型返回内容为空。';
  } catch (err: any) {
    return `【错误】请求异常: ${err.message || String(err)}`;
  }
}
function getAssociatedContext(): { hasContext: boolean; contextText: string } {
  try {
    const rawIds = localStorage.getItem('associated_chapters');
    const rawNovelId = localStorage.getItem('associated_chapters_novelId');
    if (!rawIds || !rawNovelId) return { hasContext: false, contextText: '' };
    const ids: number[] = JSON.parse(rawIds);
    const novelId = parseInt(rawNovelId, 10);
    if (!ids.length) return { hasContext: false, contextText: '' };
    const chapters: string[] = [];
    for (const chId of ids) {
      const content = localStorage.getItem(`novel_${novelId}_chapter_${chId}`);
      if (content && content.trim()) chapters.push(content.trim());
    }
    if (!chapters.length) return { hasContext: false, contextText: '' };
    return {
      hasContext: true,
      contextText: `【关联章节内容】\n${chapters.join('\n\n---\n\n')}\n\n【用户请求】\n`,
    };
  } catch {
    return { hasContext: false, contextText: '' };
  }
}

export default function AIPanel({ width, className, selectedNovelChapterId }: { width?: number; className?: string; selectedNovelChapterId?: number | null }) {
  const { novels, currentNovelId, showToast } = useNovelsContext();
  const currentNovel = novels.find((n) => n.id === currentNovelId);
  const workType = currentNovel?.type || 'novel';
  const chapterUnit = workType === 'script' ? '集' : '章';

  const [isPromptManagerOpen, setIsPromptManagerOpen] = useState(false);
  const [isModelManageOpen, setIsModelManageOpen] = useState(false);
  const [assocWordCount, setAssocWordCount] = useState(0);

  // 对话状态
  const [chats, setChats] = useState<Chat[]>([{ id: 1, messages: [] }]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  // 监听关联章节变化，更新字数显示
  useEffect(() => {
    const updateCount = () => {
      try {
        const rawIds = localStorage.getItem('associated_chapters');
        const rawNovelId = localStorage.getItem('associated_chapters_novelId');
        if (!rawIds || !rawNovelId) { setAssocWordCount(0); return; }
        const ids: number[] = JSON.parse(rawIds);
        const novelId = parseInt(rawNovelId, 10);
        if (!ids.length) { setAssocWordCount(0); return; }
        let total = 0;
        for (const chId of ids) {
          const content = localStorage.getItem(`novel_${novelId}_chapter_${chId}`);
          if (content) total += content.replace(/\s/g, '').length;
        }
        setAssocWordCount(total);
      } catch { setAssocWordCount(0); }
    };
    updateCount();
    window.addEventListener('chapter_associate_updated', updateCount);
    return () => window.removeEventListener('chapter_associate_updated', updateCount);
  }, []);

  // 消息变化时自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat.messages]);

  // 选中模式：none（未选中） | episode（选中当前集） | novelChapter（选中当前章）
  const [selectedMode, setSelectedMode] = useState<'none' | 'episode' | 'novelChapter'>('none');

  // 选中当前集
  const handleSelectEpisode = () => {
    if (selectedMode === 'episode') {
      // 取消选中
      localStorage.removeItem('associated_chapters');
      localStorage.removeItem('associated_chapters_novelId');
      localStorage.removeItem('associated_chapters_mode');
      setSelectedMode('none');
      setAssocWordCount(0);
    } else {
      // 选中当前集（同时取消章的选中）
      const novelId = localStorage.getItem('current_novel_id');
      const chapterId = localStorage.getItem('current_chapter_id');
      if (!novelId || !chapterId) { showToast('提示', '请先选择一集'); return; }
      try {
        localStorage.setItem('associated_chapters', JSON.stringify([parseInt(chapterId, 10)]));
        localStorage.setItem('associated_chapters_novelId', novelId);
        localStorage.setItem('associated_chapters_mode', 'episode');
      } catch {}
      setSelectedMode('episode');
      // 计算关联字数
      const nId = parseInt(novelId, 10);
      const cId = parseInt(chapterId, 10);
      const content = localStorage.getItem(`novel_${nId}_chapter_${cId}`);
      setAssocWordCount(content ? content.replace(/\s/g, '').length : 0);
    }
    window.dispatchEvent(new CustomEvent('chapter_associate_updated'));
  };

  // 选中当前章（关联小说章节）
  const handleSelectNovelChapter = () => {
    if (selectedMode === 'novelChapter') {
      // 取消选中
      localStorage.removeItem('associated_chapters');
      localStorage.removeItem('associated_chapters_novelId');
      localStorage.removeItem('associated_chapters_mode');
      setSelectedMode('none');
      setAssocWordCount(0);
    } else {
      // 选中当前章（同时取消集的选中）
      if (!selectedNovelChapterId) { showToast('提示', '请先在小说预览区选择章节'); return; }
      const linkedId = localStorage.getItem('sev2_linked_novel');
      const novelId = linkedId ? parseInt(linkedId, 10) : (currentNovelId || 0);
      try {
        localStorage.setItem('associated_chapters', JSON.stringify([selectedNovelChapterId]));
        localStorage.setItem('associated_chapters_novelId', String(novelId));
        localStorage.setItem('associated_chapters_mode', 'novelChapter');
      } catch {}
      setSelectedMode('novelChapter');
      // 计算关联字数
      const content = localStorage.getItem(`novel_${novelId}_chapter_${selectedNovelChapterId}`);
      setAssocWordCount(content ? content.replace(/\s/g, '').length : 0);
    }
    window.dispatchEvent(new CustomEvent('chapter_associate_updated'));
  };

  // 监听关联变化，同步按钮状态
  useEffect(() => {
    const updateSelected = () => {
      try {
        const rawIds = localStorage.getItem('associated_chapters');
        const rawNovelId = localStorage.getItem('associated_chapters_novelId');
        const rawMode = localStorage.getItem('associated_chapters_mode') as 'episode' | 'novelChapter' | null;
        if (!rawIds || !rawNovelId || !rawMode) { setSelectedMode('none'); return; }
        // 检查关联是否属于当前作品
        if (parseInt(rawNovelId, 10) !== currentNovelId) { setSelectedMode('none'); return; }
        const ids: number[] = JSON.parse(rawIds);
        if (ids.length === 0) { setSelectedMode('none'); return; }

        if (rawMode === 'episode') {
          const chapterId = localStorage.getItem('current_chapter_id');
          setSelectedMode(chapterId !== null && ids.includes(parseInt(chapterId, 10)) ? 'episode' : 'none');
        } else if (rawMode === 'novelChapter') {
          setSelectedMode(ids.includes(selectedNovelChapterId || 0) ? 'novelChapter' : 'none');
        } else {
          setSelectedMode('none');
        }
      } catch { setSelectedMode('none'); }
    };
    updateSelected();
    window.addEventListener('chapter_associate_updated', updateSelected);
    return () => window.removeEventListener('chapter_associate_updated', updateSelected);
  }, [currentNovelId, selectedNovelChapterId]);

  // 退出页面时自动取消关联（仅浏览器关闭/刷新时）
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('associated_chapters');
      localStorage.removeItem('associated_chapters_novelId');
      localStorage.removeItem('associated_chapters_mode');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 模型
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState(() => {
    try { return localStorage.getItem('sev2_selected_model') || ''; } catch { return ''; }
  });

  // 加载已启用模型
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem('api_settings_v2');
        if (!raw) { setModels([]); setSelectedModel(''); return; }
        const data = JSON.parse(raw);
        const enabled: { id: string; name: string }[] = (data.models || [])
          .filter((m: { enabled: boolean }) => m.enabled)
          .map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }));
        setModels(enabled);
        if (enabled.length > 0 && !enabled.some((m) => m.id === selectedModel)) {
          setSelectedModel(enabled[0].id);
        }
        if (enabled.length === 0) setSelectedModel('');
      } catch { setModels([]); setSelectedModel(''); }
    };
    load();
    window.addEventListener('api_settings_updated', load);
    return () => window.removeEventListener('api_settings_updated', load);
  }, []);

  // 模型选择自动保存到 localStorage
  useEffect(() => {
    if (selectedModel) {
      try { localStorage.setItem('sev2_selected_model', selectedModel); } catch {}
    }
  }, [selectedModel]);

  // 新建对话
  const handleNewChat = () => {
    const newId = chats.length > 0 ? Math.max(...chats.map((c) => c.id)) + 1 : 1;
    setChats((prev) => [...prev, { id: newId, messages: [] }]);
    setActiveChatId(newId);
  };

  // 发送 — 调用真实模型 API
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    abortRef.current = false;

    const { hasContext, contextText } = getAssociatedContext();
    // 界面只显示用户输入的纯文本
    const displayText = input.trim();
    // API调用时携带隐藏的章节上下文
    const apiContent = hasContext ? `${contextText}${displayText}` : displayText;

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, { role: 'user' as const, content: displayText }] }
          : c
      )
    );
    setInput('');

    // 添加占位消息
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, { role: 'agent' as const, content: '__THINKING__' }] }
          : c
      )
    );

    // 调用真实 API（携带隐藏上下文）
    const reply = await callModelAPI(apiContent, selectedModel);
    if (abortRef.current) {
      setIsLoading(false);
      return;
    }

    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== activeChatId) return c;
        const msgs = [...c.messages];
        // 替换最后一条占位消息
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'agent') {
          msgs[msgs.length - 1] = { role: 'agent', content: reply };
        } else {
          msgs.push({ role: 'agent', content: reply });
        }
        return { ...c, messages: msgs };
      })
    );
    setIsLoading(false);
  }, [input, isLoading, activeChatId, selectedModel]);

  // 停止
  const handleStop = () => {
    abortRef.current = true;
    setIsLoading(false);
    // 添加已停止输出消息
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, { role: 'agent' as const, content: '已停止输出' }] }
          : c
      )
    );
  };

  // 清空 — 只清AI输出（agent消息）
  const handleClear = () => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: c.messages.filter((m) => m.role === 'user') }
          : c
      )
    );
  };

  return (
    <aside className={`flex flex-col h-full bg-white border-l border-gray-200 shrink-0 ${className || ''}`} style={{ width: width ?? 290 }}>
      {/* 设置面板 — 紧凑3行 */}
      <div className="shrink-0">
        {/* 模型选择行 */}
        <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-100">
          <span className="text-[10px] text-gray-500">模型</span>
          <div className="relative flex-1">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="appearance-none w-full pl-2 pr-5 py-0.5 text-[11px] text-gray-700 border border-gray-200 rounded bg-white hover:border-brand focus:outline-none cursor-pointer"
            >
              {models.length === 0 ? (
                <option value="">暂无可用模型</option>
              ) : (
                models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))
              )}
            </select>
            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => setIsModelManageOpen(true)}
            className="px-2 py-0.5 text-[10px] text-brand bg-brand-light rounded hover:bg-brand/10 transition-colors whitespace-nowrap"
          >
            模型管理
          </button>
        </div>

        {/* 对话选择行 */}
        <div className="flex items-center justify-between px-3 py-1 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={activeChatId}
                onChange={(e) => setActiveChatId(Number(e.target.value))}
                className="appearance-none pl-2 pr-5 py-0.5 text-[11px] text-gray-700 border border-gray-200 rounded bg-white hover:border-brand focus:outline-none cursor-pointer"
              >
                {chats.map((chat) => (
                  <option key={chat.id} value={chat.id}>对话{chat.id}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 pointer-events-none" />
            </div>
            <button onClick={handleNewChat} className="p-0.5 text-gray-500 hover:text-brand transition-colors" title="新建对话">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setIsPromptManagerOpen(true)}
            className="px-2 py-0.5 text-[11px] text-brand bg-brand-light rounded hover:bg-brand/10 transition-colors"
          >
            提示词管理
          </button>
        </div>


      </div>

      {/* === AI对话内容 === */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {activeChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              请在输入框里输入修改内容，<br />AI会根据提示词对章节正文进行修改。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeChat.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                  }`}
                >
                  {msg.content === '__THINKING__' ? (
                    <ThinkingDots />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部输入区 */}
      <div className="p-3 border-t border-gray-200 shrink-0">
        {/* 选中当前集 / 选中当前章 */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleSelectEpisode}
            className={`flex items-center justify-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors ${
              selectedMode === 'episode'
                ? 'text-white bg-brand border-brand'
                : 'text-brand bg-white border-brand hover:bg-brand-light'
            }`}
          >
            <span>{selectedMode === 'episode' ? `已选中${chapterUnit}` : `选中当前${chapterUnit}`}</span>
          </button>
          <button
            onClick={handleSelectNovelChapter}
            className={`flex items-center justify-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors ${
              selectedMode === 'novelChapter'
                ? 'text-white bg-brand border-brand'
                : 'text-brand bg-white border-brand hover:bg-brand-light'
            }`}
          >
            <span>{selectedMode === 'novelChapter' ? '已选中章' : '选中当前章'}</span>
          </button>
          <span className="text-xs text-gray-500 ml-auto">已关联 {assocWordCount.toLocaleString()} 字</span>
        </div>

        {/* 输入框 — 空时1行，根据内容自动扩 */}
        <AutoResizeTextarea
          value={input}
          onChange={(v) => setInput(v)}
          onSend={handleSend}
          placeholder="请输入内容..."
        />

        {/* 按钮行：发送 / 停止 / 清空 */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center gap-1 px-2 py-2 text-base font-bold text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
          <button
            onClick={handleStop}
            disabled={!isLoading}
            className="flex items-center justify-center gap-1 px-2 py-2 text-base font-bold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            停止
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1 px-2 py-2 text-base font-bold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {/* 提示词管理弹窗 */}
      {isPromptManagerOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center"
          onClick={() => setIsPromptManagerOpen(false)}
        >
          <div
            className="flex flex-col w-[1100px] max-w-[95vw] h-[85vh] max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">提示词管理</h2>
              <button
                onClick={() => setIsPromptManagerOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span>关闭</span>
                <span className="text-xs text-gray-400">(Esc)</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PromptZone embedded />
            </div>
          </div>
        </div>
      )}

      {/* 模型管理弹窗 */}
      {isModelManageOpen && (
        <ModelManageModal onClose={() => setIsModelManageOpen(false)} />
      )}
    </aside>
  );
}

/** 自动扩高文本域 — 空时1行，内容多时自动扩到2行3行 */
function AutoResizeTextarea({
  value,
  onChange,
  onSend,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const maxLines = 5;
    const maxHeight = lineHeight * maxLines;
    const scrollH = el.scrollHeight;
    el.style.height = Math.min(scrollH, maxHeight) + 'px';
    el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  return (
    <div className="relative mb-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-brand placeholder:text-gray-400 resize-none overflow-hidden"
        style={{ minHeight: '36px', maxHeight: '110px' }}
      />
    </div>
  );
}
