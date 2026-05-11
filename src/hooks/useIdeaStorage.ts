/**
 * 脑洞存储 Hook
 * 使用 localStorage 存储用户生成的脑洞
 */

import { useState, useCallback } from 'react';

export interface SavedIdea {
  id: string;
  title: string;
  content: string;
  promptType: string;
  promptName: string;
  genre: string;
  tags: string[];
  modelId: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'outlined' | 'completed';
  outlineContent?: string;
}

const STORAGE_KEY = 'yuexia_idea_library';

function loadIdeas(): SavedIdea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveToStorage(ideas: SavedIdea[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
  } catch { /* ignore */ }
}

export function useIdeaStorage() {
  const [ideas, setIdeas] = useState<SavedIdea[]>(loadIdeas);

  const addIdea = useCallback((idea: Omit<SavedIdea, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newIdea: SavedIdea = {
      ...idea,
      id: `idea_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };
    setIdeas((prev) => {
      const next = [newIdea, ...prev];
      saveToStorage(next);
      return next;
    });
    return newIdea.id;
  }, []);

  const updateIdea = useCallback((id: string, updates: Partial<SavedIdea>) => {
    setIdeas((prev) => {
      const next = prev.map((idea) =>
        idea.id === id
          ? { ...idea, ...updates, updatedAt: new Date().toISOString() }
          : idea
      );
      saveToStorage(next);
      return next;
    });
  }, []);

  const deleteIdea = useCallback((id: string) => {
    setIdeas((prev) => {
      const next = prev.filter((idea) => idea.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const getIdeaById = useCallback(
    (id: string) => ideas.find((idea) => idea.id === id),
    [ideas]
  );

  const importIdeaToGenerator = useCallback((id: string) => {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) return null;
    return {
      title: idea.title,
      content: idea.content,
      genre: idea.genre,
      tags: idea.tags,
      promptType: idea.promptType,
      promptName: idea.promptName,
      sourceId: idea.id,
    };
  }, [ideas]);

  return {
    ideas,
    addIdea,
    updateIdea,
    deleteIdea,
    getIdeaById,
    importIdeaToGenerator,
  };
}
