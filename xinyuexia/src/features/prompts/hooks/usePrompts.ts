import { useMemo, useState } from 'react';

import type { NewPromptInput, PromptItem } from '@/features/prompts/model/promptTypes';

const PROMPTS_KEY = 'xinyuexia_prompts_v1';
const PROMPT_CATEGORIES_KEY = 'xinyuexia_prompt_categories_v1';
const DEFAULT_CATEGORIES = ['未分类', '润色', '续写', '提炼', '设定', '分析'];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nowText() {
  return new Date().toLocaleString('zh-CN');
}

function createId() {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readPromptSnapshot() {
  return {
    prompts: readJson<PromptItem[]>(PROMPTS_KEY, []),
    categories: readJson<string[]>(PROMPT_CATEGORIES_KEY, DEFAULT_CATEGORIES),
  };
}

export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptItem[]>(() => readJson(PROMPTS_KEY, []));
  const [categories, setCategories] = useState<string[]>(() => readJson(PROMPT_CATEGORIES_KEY, DEFAULT_CATEGORIES));

  const categoryStats = useMemo(() => categories.map((category) => ({
    category,
    count: prompts.filter((prompt) => prompt.category === category).length,
  })), [categories, prompts]);

  const persistPrompts = (next: PromptItem[]) => {
    setPrompts(next);
    writeJson(PROMPTS_KEY, next);
    window.dispatchEvent(new CustomEvent('xinyuexia_prompts_updated'));
  };

  const addPrompt = (input: NewPromptInput) => {
    const item: PromptItem = {
      id: createId(),
      name: input.name.trim(),
      description: input.description.trim(),
      content: input.content.trim(),
      category: input.category,
      isFavorite: false,
      isLocked: false,
      createdAt: nowText(),
      updatedAt: nowText(),
    };
    persistPrompts([item, ...prompts]);
  };

  const updatePrompt = (id: string, updates: Partial<NewPromptInput>) => {
    persistPrompts(prompts.map((prompt) => prompt.id === id
      ? { ...prompt, ...updates, updatedAt: nowText() }
      : prompt));
  };

  const deletePrompt = (id: string) => {
    persistPrompts(prompts.filter((prompt) => prompt.id !== id));
  };

  const toggleFavorite = (id: string) => {
    persistPrompts(prompts.map((prompt) => prompt.id === id ? { ...prompt, isFavorite: !prompt.isFavorite } : prompt));
  };

  const toggleLock = (id: string) => {
    persistPrompts(prompts.map((prompt) => prompt.id === id ? { ...prompt, isLocked: !prompt.isLocked } : prompt));
  };

  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const next = [...categories, trimmed];
    setCategories(next);
    writeJson(PROMPT_CATEGORIES_KEY, next);
  };

  return {
    prompts,
    categories,
    categoryStats,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleFavorite,
    toggleLock,
    addCategory,
  };
}
