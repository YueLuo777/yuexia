import { useState, useCallback } from 'react';
import { trpc } from '@/providers/trpc';

export type PromptCategory = '正文' | '大纲' | '细纲' | '脑洞' | '提炼';
export type PromptVisibility = 'private' | 'public';

export interface PromptItem {
  id: string;
  name: string;
  description: string;
  content: string;
  category: PromptCategory;
  visibility: PromptVisibility;
  price: number;       // 笔力定价
  usageCount: number;  // 被使用次数
  isFavorite: boolean; // 是否收藏
  isLocked?: boolean;  // 是否锁定（锁定后不可删除）
  authorId?: string;   // 创建者标识（本地用户为 'local'）
  createdAt: string;
  deletedAt?: string;  // 软删除时间戳
}

const PERSONAL_PROMPTS_KEY = 'prompt_personal';
const RECYCLE_BIN_KEY = 'prompt_recycle';
const FAVORITES_KEY = 'prompt_favorites';

const defaultCategories: PromptCategory[] = ['正文', '大纲', '细纲', '脑洞', '提炼'];

function loadPersonal(): PromptItem[] {
  try {
    const raw = localStorage.getItem(PERSONAL_PROMPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // 默认示例数据
  return [
    {
      id: 'demo-1', name: '章节润色', description: '对章节正文进行润色优化，提升文笔流畅度',
      content: '请对以下章节正文进行润色，保持原有情节不变，提升文笔流畅度和可读性：\n\n{{content}}',
      category: '正文', visibility: 'public', price: 10, usageCount: 128, isFavorite: false,
      authorId: 'local', createdAt: '2026-04-28',
    },
    {
      id: 'demo-2', name: '大纲生成', description: '根据故事梗概生成详细的小说大纲结构',
      content: '请根据以下故事梗概，生成一份详细的小说大纲，包含主要情节线、人物弧光、关键转折点：\n\n{{outline}}',
      category: '大纲', visibility: 'public', price: 20, usageCount: 86, isFavorite: false,
      authorId: 'local', createdAt: '2026-04-27',
    },
    {
      id: 'demo-3', name: '细纲扩展', description: '将大纲节点扩展为详细的细纲内容',
      content: '请将以下大纲节点扩展为详细的细纲，包含场景描写、对话要点、情绪节奏：\n\n{{node}}',
      category: '细纲', visibility: 'private', price: 0, usageCount: 32, isFavorite: false,
      authorId: 'local', createdAt: '2026-04-26',
    },
  ];
}

function loadRecycle(): PromptItem[] {
  try {
    const raw = localStorage.getItem(RECYCLE_BIN_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function savePersonal(list: PromptItem[]) {
  try { localStorage.setItem(PERSONAL_PROMPTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function saveRecycle(list: PromptItem[]) {
  try { localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function saveFavorites(ids: string[]) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

// ── 模拟其他用户的公共提示词 ──
function getMockPublicPrompts(): PromptItem[] {
  return [
    {
      id: 'pub-1', name: '金手指设计', description: '为小说主角设计独特的金手指能力，包含能力描述、限制条件、成长路线',
      content: '[此提示词内容仅购买后可见]', category: '脑洞', visibility: 'public',
      price: 50, usageCount: 342, isFavorite: false, authorId: 'user-001', createdAt: '2026-04-20',
    },
    {
      id: 'pub-2', name: '人物小传', description: '根据人物设定生成详细的人物小传，包含成长经历、性格形成、关键事件',
      content: '[此提示词内容仅购买后可见]', category: '正文', visibility: 'public',
      price: 30, usageCount: 289, isFavorite: false, authorId: 'user-002', createdAt: '2026-04-22',
    },
    {
      id: 'pub-3', name: '场景描写', description: '生成各种类型的场景描写模板，包括战斗、日常、感情等场景',
      content: '[此提示词内容仅购买后可见]', category: '正文', visibility: 'public',
      price: 15, usageCount: 256, isFavorite: false, authorId: 'user-003', createdAt: '2026-04-23',
    },
    {
      id: 'pub-4', name: '伏笔埋设', description: '在已有情节中巧妙埋设伏笔，为后续剧情转折做铺垫',
      content: '[此提示词内容仅购买后可见]', category: '大纲', visibility: 'public',
      price: 40, usageCount: 198, isFavorite: false, authorId: 'user-001', createdAt: '2026-04-24',
    },
    {
      id: 'pub-5', name: '对话润色', description: '优化人物对话，使其更自然、更符合人物性格',
      content: '[此提示词内容仅购买后可见]', category: '正文', visibility: 'public',
      price: 10, usageCount: 176, isFavorite: false, authorId: 'user-004', createdAt: '2026-04-25',
    },
    {
      id: 'pub-6', name: '世界观构建', description: '从零构建完整的世界观体系，包含地理、历史、文化、势力',
      content: '[此提示词内容仅购买后可见]', category: '脑洞', visibility: 'public',
      price: 60, usageCount: 165, isFavorite: false, authorId: 'user-005', createdAt: '2026-04-21',
    },
    {
      id: 'pub-7', name: '章节节奏', description: '分析和调整章节节奏，确保张弛有度、高潮迭起',
      content: '[此提示词内容仅购买后可见]', category: '细纲', visibility: 'public',
      price: 25, usageCount: 134, isFavorite: false, authorId: 'user-002', createdAt: '2026-04-26',
    },
    {
      id: 'pub-8', name: '冲突设计', description: '设计多层次的人物冲突和矛盾，推动情节发展',
      content: '[此提示词内容仅购买后可见]', category: '大纲', visibility: 'public',
      price: 35, usageCount: 112, isFavorite: false, authorId: 'user-003', createdAt: '2026-04-27',
    },
  ];
}

export function usePrompts() {
  const [personalPrompts, setPersonalPrompts] = useState<PromptItem[]>(loadPersonal);
  const [publicPrompts, setPublicPrompts] = useState<PromptItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('public_prompts') || '[]'); } catch { return getMockPublicPrompts(); }
  });
  const [recycleBin, setRecycleBin] = useState<PromptItem[]>(loadRecycle);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadFavorites);

  // tRPC mutations for cloud sync
  const promptCreate = trpc.prompt.create.useMutation();
  const promptUpdate = trpc.prompt.update.useMutation();
  const promptDelete = trpc.prompt.delete.useMutation();

  // ── 个人提示词 CRUD ──
  const addPrompt = useCallback((data: Omit<PromptItem, 'id' | 'usageCount' | 'isFavorite' | 'authorId' | 'createdAt'>) => {
    const newItem: PromptItem = {
      ...data,
      id: `p-${Date.now()}`,
      usageCount: 0,
      isFavorite: false,
      authorId: 'local',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setPersonalPrompts((prev) => {
      const next = [newItem, ...prev];
      savePersonal(next);
      return next;
    });
    // 同步到云端
    try {
      promptCreate.mutate({
        name: newItem.name,
        description: newItem.description,
        content: newItem.content,
        category: newItem.category,
      });
    } catch { /* 静默失败 */ }
    return newItem.id;
  }, [promptCreate]);

  const updatePrompt = useCallback((id: string, updates: Partial<PromptItem>) => {
    setPersonalPrompts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      savePersonal(next);
      return next;
    });
    // 同步到云端
    try {
      const { id: _unused, ...safeUpdates } = updates;
      promptUpdate.mutate({ id: Number(id), ...safeUpdates });
    } catch { /* 静默失败 */ }
  }, [promptUpdate]);

  const deletePrompt = useCallback((id: string) => {
    // 先尝试在个人提示词中删除
    setPersonalPrompts((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) {
        const next = prev.filter((p) => p.id !== id);
        savePersonal(next);
        // 移到回收站
        const recycled = { ...item, deletedAt: new Date().toISOString() };
        setRecycleBin((rb) => {
          const rbNext = [recycled, ...rb];
          saveRecycle(rbNext);
          return rbNext;
        });
        return next;
      }
      return prev;
    });
    // 再尝试在公共提示词中删除
    setPublicPrompts((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) {
        const next = prev.filter((p) => p.id !== id);
        try { localStorage.setItem('public_prompts', JSON.stringify(next)); } catch {}
        // 移到回收站
        const recycled = { ...item, deletedAt: new Date().toISOString() };
        setRecycleBin((rb) => {
          const rbNext = [recycled, ...rb];
          saveRecycle(rbNext);
          return rbNext;
        });
        return next;
      }
      return prev;
    });
    // 同步到云端
    try {
      promptDelete.mutate({ id: Number(id) });
    } catch { /* 静默失败 */ }
  }, [promptDelete]);

  const restorePrompt = useCallback((id: string) => {
    setRecycleBin((prev) => {
      const item = prev.find((p) => p.id === id);
      if (!item) return prev;
      const next = prev.filter((p) => p.id !== id);
      saveRecycle(next);
      const restored = { ...item };
      delete restored.deletedAt;
      setPersonalPrompts((pp) => {
        const ppNext = [restored, ...pp];
        savePersonal(ppNext);
        return ppNext;
      });
      return next;
    });
  }, []);

  const permanentDelete = useCallback((id: string) => {
    setRecycleBin((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveRecycle(next);
      return next;
    });
    // 同步到云端
    try {
      promptDelete.mutate({ id: Number(id) });
    } catch { /* 静默失败 */ }
  }, [promptDelete]);

  // ── 锁定 ──
  const toggleLockPrompt = useCallback((id: string) => {
    setPersonalPrompts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, isLocked: !p.isLocked } : p));
      savePersonal(next);
      return next;
    });
    // 同步到云端
    try {
      const item = personalPrompts.find((p) => p.id === id);
      if (item) {
        promptUpdate.mutate({ id: Number(id), isLocked: !item.isLocked });
      }
    } catch { /* 静默失败 */ }
  }, [personalPrompts, promptUpdate]);

  // ── 收藏 ──
  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  // ── 使用提示词（增加使用次数）──
  const usePrompt = useCallback((id: string) => {
    setPersonalPrompts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p));
      savePersonal(next);
      return next;
    });
  }, []);

  // ── 分类筛选 ──
  const categories = defaultCategories;

  const getFilteredPersonal = useCallback(
    (category?: PromptCategory) => {
      if (!category) return personalPrompts;
      return personalPrompts.filter((p) => p.category === category);
    },
    [personalPrompts]
  );

  const getFilteredPublic = useCallback(
    (category?: PromptCategory) => {
      const allPublic = [...publicPrompts];
      // 将收藏状态附加到公共提示词上
      const withFav = allPublic.map((p) => ({ ...p, isFavorite: favoriteIds.includes(p.id) }));
      if (!category) return withFav.sort((a, b) => b.usageCount - a.usageCount);
      return withFav.filter((p) => p.category === category).sort((a, b) => b.usageCount - a.usageCount);
    },
    [publicPrompts, favoriteIds]
  );

  return {
    // 数据
    personalPrompts,
    recycleBin,
    publicPrompts,
    favoriteIds,
    categories,
    // CRUD
    addPrompt,
    updatePrompt,
    deletePrompt,
    restorePrompt,
    permanentDelete,
    // 收藏
    toggleFavorite,
    isFavorite,
    // 锁定
    toggleLockPrompt,
    // 使用
    usePrompt,
    // 筛选
    getFilteredPersonal,
    getFilteredPublic,
  };
}
