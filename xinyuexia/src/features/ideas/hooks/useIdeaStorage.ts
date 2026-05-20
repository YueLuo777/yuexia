import { useCallback, useState } from 'react';

import type { IdeaItem, NewIdeaInput } from '@/features/ideas/model/ideaTypes';

const STORAGE_KEY = 'xinyuexia_idea_library_v1';
const CONTINUE_KEY = 'xinyuexia_idea_continue_v1';
const OUTLINE_KEY = 'xinyuexia_idea_to_outline_v1';
export const IDEAS_UPDATED_EVENT = 'xinyuexia_ideas_updated';

function readIdeas(): IdeaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as IdeaItem[] : [];
  } catch {
    return [];
  }
}

function writeIdeas(ideas: IdeaItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
  window.dispatchEvent(new CustomEvent(IDEAS_UPDATED_EVENT));
}

function createId() {
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readIdeaSnapshot() {
  return readIdeas();
}

export function readIdeaContinueSnapshot() {
  try {
    const raw = localStorage.getItem(CONTINUE_KEY);
    return raw ? JSON.parse(raw) as Partial<NewIdeaInput> | null : null;
  } catch {
    return null;
  }
}

export function readIdeaOutlineSnapshot() {
  try {
    const raw = localStorage.getItem(OUTLINE_KEY);
    return raw ? JSON.parse(raw) as { title?: string; content?: string; genre?: string } | null : null;
  } catch {
    return null;
  }
}

export function writeIdeaContinueSnapshot(data: Partial<NewIdeaInput>) {
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(data));
}

export function writeIdeaOutlineSnapshot(data: { title?: string; content?: string; genre?: string }) {
  localStorage.setItem(OUTLINE_KEY, JSON.stringify(data));
}

export function useIdeaStorage() {
  const [ideas, setIdeas] = useState<IdeaItem[]>(readIdeas);

  const persist = useCallback((next: IdeaItem[]) => {
    setIdeas(next);
    writeIdeas(next);
  }, []);

  const addIdea = useCallback((input: NewIdeaInput) => {
    const now = new Date().toISOString();
    const item: IdeaItem = {
      id: createId(),
      title: input.title.trim(),
      content: input.content,
      promptId: input.promptId,
      promptName: input.promptName,
      genre: input.genre,
      tags: input.tags,
      modelId: input.modelId,
      modelName: input.modelName,
      createdAt: now,
      updatedAt: now,
      status: input.status ?? 'draft',
      outlineContent: input.outlineContent,
    };
    persist([item, ...ideas]);
    return item.id;
  }, [ideas, persist]);

  const updateIdea = useCallback((id: string, updates: Partial<IdeaItem>) => {
    persist(ideas.map((idea) => idea.id === id ? { ...idea, ...updates, updatedAt: new Date().toISOString() } : idea));
  }, [ideas, persist]);

  const deleteIdea = useCallback((id: string) => {
    persist(ideas.filter((idea) => idea.id !== id));
  }, [ideas, persist]);

  const importIdeaToGenerator = useCallback((id: string) => {
    const idea = ideas.find((item) => item.id === id);
    if (!idea) return null;
    return {
      title: idea.title,
      content: idea.content,
      genre: idea.genre,
      tags: idea.tags,
      promptId: idea.promptId,
      promptName: idea.promptName,
      sourceId: idea.id,
    };
  }, [ideas]);

  return {
    ideas,
    addIdea,
    updateIdea,
    deleteIdea,
    importIdeaToGenerator,
  };
}
