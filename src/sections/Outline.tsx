import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Send,
  Square,
  Bot,
  User,
  X,
} from 'lucide-react';
import { useNovelsContext } from '@/hooks/useNovels';
import ModelManageModal from './ModelManageModal';

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

interface OutlineVolume {
  id: number;
  name: string;
  isExpanded: boolean;
  summary: string;
  chapters: { id: number; serialNumber: number; title: string; content: string }[];
}

interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; isStreaming?: boolean;
}
interface TabChatState {
  messages: ChatMessage[];
  selectedPrompt: string;
  inputText: string; isGenerating: boolean;
}

const STORAGE_KEY = 'outline_data_v1';

function loadOutlineData(): OutlineVolume[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}
function saveOutlineData(data: OutlineVolume[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createDefaultChatState(): TabChatState {
  return {
    messages: [], selectedPrompt: '', inputText: '', isGenerating: false,
  };
}

export default function Outline({ activeTab = '章节概要' }: { activeTab?: '章节概要' | '卷概要' }) {
  const { volumes: sourceVolumes, currentNovelId } = useNovelsContext();

  const [outlineData, setOutlineData] = useState<OutlineVolume[]>(loadOutlineData);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedVolumeId, setSelectedVolumeId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // AI对话状态
  const [chatState, setChatState] = useState<TabChatState>(createDefaultChatState);

  // 模型选择
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [isModelManageOpen, setIsModelManageOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadModels = () => {
      try {
        const raw = localStorage.getItem('api_settings_v2');
        if (raw) {
          const data = JSON.parse(raw);
          const list = (data.models || []).filter((m: { enabled?: boolean }) => m.enabled !== false)
            .map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }));
          setModels(list);
          if (list.length > 0 && !selectedModel) setSelectedModel(list[0].id);
        }
      } catch { /* ignore */ }
    };
    loadModels();
    window.addEventListener('api_settings_updated', loadModels);
    return () => window.removeEventListener('api_settings_updated', loadModels);
  }, []);

  // 同步未发布/已发布的章节到章节概要
  useEffect(() => {
    setOutlineData((prev) => {
      // 用 sourceVolumes 的卷结构创建基础数据
      const synced: OutlineVolume[] = sourceVolumes.map((vol) => {
        const existingVol = prev.find((p) => p.id === vol.id);
        return {
          id: vol.id,
          name: vol.name,
          isExpanded: existingVol ? existingVol.isExpanded : vol.isExpanded,
          summary: existingVol?.summary ?? '',
          // 同步章节（只保留序号、标题和内容框）
          chapters: vol.chapters.map((ch) => {
            const existingCh = existingVol?.chapters.find((c) => c.id === ch.id);
            return {
              id: ch.id,
              serialNumber: ch.serialNumber,
              title: ch.title || '',
              content: existingCh ? existingCh.content : '', // 保留已编辑的内容
            };
          }).sort((a, b) => a.serialNumber - b.serialNumber),
        };
      });
      return synced;
    });
  }, [sourceVolumes]);

  // 实时保存
  useEffect(() => { saveOutlineData(outlineData); }, [outlineData]);

  const toggleVolume = (volId: number) => {
    setOutlineData((prev) => prev.map((v) => v.id === volId ? { ...v, isExpanded: !v.isExpanded } : v));
  };

  const handleSelectChapter = (volId: number, chId: number) => {
    setSelectedVolumeId(volId);
    setSelectedChapterId(chId);
    const vol = outlineData.find((v) => v.id === volId);
    const ch = vol?.chapters.find((c) => c.id === chId);
    if (ch) setEditContent(ch.content);
    // 切换章节时清空对话内容
    setChatState((s) => ({ ...s, messages: [] }));
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    if (selectedVolumeId && selectedChapterId) {
      setOutlineData((prev) =>
        prev.map((v) =>
          v.id === selectedVolumeId
            ? { ...v, chapters: v.chapters.map((c) => c.id === selectedChapterId ? { ...c, content: value } : c) }
            : v
        )
      );
    }
  };

  const handleVolumeSummaryChange = (volId: number, value: string) => {
    setOutlineData((prev) => prev.map((v) => v.id === volId ? { ...v, summary: value } : v));
  };

  const saveToMemo = (content: string, title: string) => {
    const STORAGE_KEY = 'memo_data_v1';
    const novelKey = `novel_${currentNovelId}`;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      const memos = data[novelKey] || [];
      memos.push({
        id: Date.now().toString(),
        title: `概要：${title}`,
        content,
        type: 'temporary',
      });
      data[novelKey] = memos;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // 触发自定义事件通知备忘录刷新
      window.dispatchEvent(new CustomEvent('memo_data_updated'));
    } catch { /* ignore */ }
  };

  const currentVol = outlineData.find((v) => v.id === selectedVolumeId);
  const currentCh = currentVol?.chapters.find((c) => c.id === selectedChapterId);

  // AI 操作
  const promptOptions = ['剧情生成', '细纲生成', '角色大纲', '我的大纲提示1', '我的大纲提示2', '我的大纲提示3'];

  // 调用真实模型 API
  const callModelAPI = async (content: string, modelId: string): Promise<string> => {
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
  };

  const handleSend = async () => {
    if (!chatState.inputText.trim()) return;
    const userContent = chatState.inputText.trim();
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: userContent };
    const asstMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: '__THINKING__', isStreaming: true };
    setChatState((s) => ({
      ...s,
      messages: [...s.messages, userMsg, asstMsg],
      inputText: '', isGenerating: true,
    }));

    // 只发送当前消息，不带历史上下文
    const reply = await callModelAPI(userContent, selectedModel);

    setChatState((s) => ({
      ...s,
      messages: s.messages.map((m) => m.id === asstMsg.id ? { ...m, content: reply, isStreaming: false } : m),
      isGenerating: false,
    }));
  };
  const handleStop = () => setChatState((s) => ({ ...s, isGenerating: false }));
  const handleDelMsg = (msgId: string) => setChatState((s) => ({
    ...s, messages: s.messages.filter((m) => m.id !== msgId),
  }));

  // 消息变化时自动滚动到底部
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatState.messages]);

  return (
    <main className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* 第一栏 */}
        <div className="w-[200px] flex flex-col border-r border-gray-200 shrink-0">
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">{activeTab === '章节概要' ? '章节概要' : '卷概要'}</h3>
            {activeTab === '章节概要' && (
              <button className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-brand rounded hover:bg-brand-dark transition-colors">
                <Plus className="w-3 h-3" />
                <span className="text-[1.3em]">新增</span>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {outlineData.length === 0 && <p className="px-3 py-4 text-xs text-gray-400">暂无内容</p>}
            {activeTab === '章节概要' ? (
              // 章节概要视图
              outlineData.map((vol) => (
                <div key={vol.id} className="mb-1">
                  {/* 卷标题 */}
                  <div className="flex items-center gap-1 rounded-md bg-brand-light px-2 py-1.5 cursor-pointer" onClick={() => toggleVolume(vol.id)}>
                    {vol.isExpanded
                      ? <svg className="w-3.5 h-3.5 text-brand-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                      : <svg className="w-3.5 h-3.5 text-brand-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                    }
                    <span className="text-sm font-medium text-brand-dark">{vol.name}</span>
                    <span className="text-xs text-gray-400 ml-1">{vol.chapters.length}章</span>
                  </div>
                  {/* 章节列表 */}
                  {vol.isExpanded && (
                    <div className="mt-0.5 ml-1 space-y-0.5">
                      {vol.chapters.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => handleSelectChapter(vol.id, ch.id)}
                          className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-left text-sm transition-colors ${
                            selectedChapterId === ch.id
                              ? 'bg-orange-50 text-orange-600 font-medium'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {ch.content ? (
                            <span className="text-[10px] font-medium text-brand shrink-0">有</span>
                          ) : (
                            <span className="text-[10px] font-medium text-red-500 shrink-0">无</span>
                          )}
                          <span className="truncate">{ch.title ? `第${ch.serialNumber}章 ${ch.title}` : `第${ch.serialNumber}章`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // 卷概要视图
              outlineData.map((vol) => (
                <button
                  key={vol.id}
                  onClick={() => setSelectedVolumeId(vol.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-left text-sm transition-colors mb-0.5 ${
                    selectedVolumeId === vol.id
                      ? 'bg-orange-50 text-orange-600 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="truncate flex-1">{vol.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{vol.chapters.length}章</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 第二栏：编辑区 */}
        <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <h3 className="text-sm font-bold text-gray-900">{activeTab === '章节概要' ? '概要编辑' : '卷概要编辑'}</h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === '章节概要' ? (
              <div className="w-full h-full flex flex-col">
                {/* 章节信息提示条 — 始终显示 */}
                <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-brand-light rounded-md border border-brand/10 shrink-0">
                  <span className="text-xs font-medium text-brand-dark">当前编辑</span>
                  <span className="text-sm font-bold text-gray-900">
                    {currentCh ? `第${currentCh.serialNumber}章${currentCh.title ? ` · ${currentCh.title}` : ''}` : '未选择章节'}
                  </span>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={currentCh ? "在此编辑章节概要内容..." : "请先选择左侧章节，再编辑概要内容..."}
                  className="flex-1 min-h-[300px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand resize-none"
                />
                {/* 操作按钮行 — 始终显示 */}
                <div className="flex items-center gap-2 mt-3 shrink-0">
                  <button onClick={() => handleContentChange('AI生成的概要内容示例...')} className="px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">一键生成</button>
                  <button onClick={() => { if (editContent.trim()) saveToMemo(editContent, currentCh?.title || `第${currentCh?.serialNumber ?? 1}章`); }} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">移入临时备忘录</button>
                  <button onClick={() => handleContentChange('')} className="px-3 py-1.5 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">清空</button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                {/* 卷信息提示条 — 始终显示 */}
                <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-brand-light rounded-md border border-brand/10 shrink-0">
                  <span className="text-xs font-medium text-brand-dark">当前编辑</span>
                  <span className="text-sm font-bold text-gray-900">{currentVol ? currentVol.name : '未选择卷'}</span>
                </div>
                <textarea
                  value={currentVol?.summary ?? ''}
                  onChange={(e) => { if (currentVol) handleVolumeSummaryChange(currentVol.id, e.target.value); }}
                  placeholder={currentVol ? "在此编辑卷概要内容..." : "请先选择左侧卷，再编辑概要内容..."}
                  className="flex-1 min-h-[300px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-light focus:border-brand resize-none"
                />
                {/* 操作按钮行 — 始终显示 */}
                <div className="flex items-center gap-2 mt-3 shrink-0">
                  <button onClick={() => { if (currentVol) handleVolumeSummaryChange(currentVol.id, 'AI生成的卷概要内容示例...'); }} className="px-3 py-1.5 text-xs text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">一键生成</button>
                  <button onClick={() => { if (currentVol?.summary.trim()) saveToMemo(currentVol.summary, currentVol.name); }} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">移入临时备忘录</button>
                  <button onClick={() => { if (currentVol) handleVolumeSummaryChange(currentVol.id, ''); }} className="px-3 py-1.5 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">清空</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 第三栏：概要智能体 */}
        <div className="w-[270px] flex flex-col bg-gray-50 border-l border-gray-200 shrink-0 overflow-hidden">
          {/* 标题行 + 模型管理按钮 */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100 bg-white shrink-0">
            <h3 className="text-sm font-bold text-gray-900">模型配置</h3>
            <button onClick={() => setIsModelManageOpen(true)} className="px-2 py-1 text-[10px] text-brand border border-brand/30 rounded hover:bg-brand-light transition-colors shrink-0">模型管理</button>
          </div>
          {/* 模型选择行 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white shrink-0">
            <span className="text-xs text-gray-500 shrink-0">模型</span>
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:border-brand">
              {models.length === 0 && <option value="">暂无模型</option>}
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {/* 提示词选择行 */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-white shrink-0">
            <span className="text-xs text-gray-500 shrink-0">提示词</span>
            <select value={chatState.selectedPrompt} onChange={(e) => setChatState((s) => ({ ...s, selectedPrompt: e.target.value }))}
              className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md text-gray-700 focus:outline-none focus:border-brand">
              <option value="">选择提示词...</option>
              {promptOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {/* AI对话内容区 */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-white" ref={chatScrollRef}>
            {chatState.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Bot className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-xs">在下方输入框发送消息开始对话</p>
              </div>
            )}
            {chatState.messages.map((msg) => (
              <div key={msg.id} className={`group flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand' : 'bg-emerald-50'}`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <div className={`relative max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {msg.content === '__THINKING__' ? <ThinkingDots /> : msg.content}
                  {msg.isStreaming && msg.content !== '__THINKING__' && <span className="inline-block w-1.5 h-3 ml-0.5 bg-current animate-pulse" />}
                  <button onClick={() => handleDelMsg(msg.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* 底部输入区 */}
          <div className="px-3 py-2 border-t border-gray-200 bg-white shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatState.inputText}
                onChange={(e) => setChatState((s) => ({ ...s, inputText: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="输入消息..."
                className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-md text-gray-700 placeholder-gray-400 focus:outline-none focus:border-brand"
              />
              <button onClick={handleSend} className="p-2 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors" title="发送">
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={handleStop}
                disabled={!chatState.isGenerating}
                className={`p-2 rounded-md transition-colors ${chatState.isGenerating ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                title="停止"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {isModelManageOpen && <ModelManageModal onClose={() => setIsModelManageOpen(false)} />}
    </main>
  );
}
