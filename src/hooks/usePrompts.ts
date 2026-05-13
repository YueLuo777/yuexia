import { useState, useCallback } from 'react';

export type PromptCategory = string;
export type PromptVisibility = 'private' | 'public';

export interface PromptItem {
  id: string;
  name: string;
  description: string;
  content: string;
  category: PromptCategory;
  visibility: PromptVisibility;
  price: number;
  usageCount: number;
  isFavorite: boolean;
  isLocked?: boolean;
  authorId?: string;
  createdAt: string;
  deletedAt?: string;
}

const PERSONAL_PROMPTS_KEY = 'prompt_personal';
const RECYCLE_BIN_KEY = 'prompt_recycle';
const FAVORITES_KEY = 'prompt_favorites';
const CATEGORIES_KEY = 'prompt_categories';

const DEFAULT_CATEGORIES = ['正文', '大纲', '细纲', '审核', '提炼', '更新', '未分类'];

function loadCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 如果已有分类，补充新增的系统分类
        const merged = [...parsed];
        for (const cat of DEFAULT_CATEGORIES) {
          if (!merged.includes(cat)) merged.push(cat);
        }
        return merged;
      }
    }
  } catch { /* ignore */ }
  return [...DEFAULT_CATEGORIES];
}

function saveCategories(list: string[]) {
  try { localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function loadPersonal(): PromptItem[] {
  try {
    const raw = localStorage.getItem(PERSONAL_PROMPTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
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

export function usePrompts() {
  const [personalPrompts, setPersonalPrompts] = useState<PromptItem[]>(loadPersonal);
  const [recycleBin, setRecycleBin] = useState<PromptItem[]>(loadRecycle);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(loadFavorites);
  const [categories, setCategories] = useState<string[]>(loadCategories);

  // ── 分类管理 ──
  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (categories.includes(trimmed)) return false;
    const next = [...categories, trimmed];
    setCategories(next);
    saveCategories(next);
    return true;
  }, [categories]);

  const removeCategory = useCallback((name: string) => {
    if (name === '未分类') return; // 未分类不能删除
    const next = categories.filter((c) => c !== name);
    setCategories(next);
    saveCategories(next);
    // 将该分类下的所有提示词移到"未分类"
    setPersonalPrompts((prev) => {
      const updated = prev.map((p) =>
        p.category === name ? { ...p, category: '未分类' } : p
      );
      savePersonal(updated);
      return updated;
    });
  }, [categories]);

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
    return newItem.id;
  }, []);

  const updatePrompt = useCallback((id: string, updates: Partial<PromptItem>) => {
    setPersonalPrompts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      savePersonal(next);
      return next;
    });
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setPersonalPrompts((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) {
        const next = prev.filter((p) => p.id !== id);
        savePersonal(next);
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
  }, []);

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
  }, []);

  // ── 锁定 ──
  const toggleLockPrompt = useCallback((id: string) => {
    setPersonalPrompts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, isLocked: !p.isLocked } : p));
      savePersonal(next);
      return next;
    });
  }, []);

  // ── 收藏 ──
  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  // ── 使用提示词 ──
  const usePrompt = useCallback((id: string) => {
    setPersonalPrompts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p));
      savePersonal(next);
      return next;
    });
  }, []);

  // ── 分类筛选 ──
  const getFilteredByCategory = useCallback(
    (category?: string) => {
      if (!category) return personalPrompts;
      return personalPrompts.filter((p) => p.category === category);
    },
    [personalPrompts]
  );

  return {
    personalPrompts,
    recycleBin,
    favoriteIds,
    categories,
    // 分类管理
    addCategory,
    removeCategory,
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
    getFilteredByCategory,
  };
}
