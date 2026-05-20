import { useEffect, useMemo, useState } from 'react';

import type { ModelItem, NewModelInput } from '@/features/models/model/modelTypes';

const MODELS_KEY = 'xinyuexia_api_settings_v1';
const MODELS_MIGRATED_KEY = 'xinyuexia_models_migrated_v1';
const ACTIVE_MODEL_KEY = 'xinyuexia_active_model_id';

function readModels() {
  try {
    const raw = localStorage.getItem(MODELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { models?: ModelItem[] };
    const models = parsed.models ?? [];
    const migrated = localStorage.getItem(MODELS_MIGRATED_KEY) === '1';
    if (!migrated) {
      const cleaned = models.filter((model) => !['deepseek-v4-flash', 'deepseek-v4-pro'].includes(model.id));
      localStorage.setItem(MODELS_MIGRATED_KEY, '1');
      if (cleaned.length !== models.length) {
        writeModels(cleaned);
        return cleaned;
      }
    }
    return models;
  } catch {
    return [];
  }
}

function writeModels(models: ModelItem[]) {
  localStorage.setItem(MODELS_KEY, JSON.stringify({ models }));
  window.dispatchEvent(new CustomEvent('xinyuexia_models_updated'));
}

export function readModelSnapshot() {
  return readModels();
}

export function useModels() {
  const [models, setModels] = useState<ModelItem[]>(readModels);
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_MODEL_KEY) || readModels()[0]?.id || null);

  const activeModel = useMemo(() => models.find((model) => model.id === activeId) ?? null, [activeId, models]);

  useEffect(() => {
    const syncModels = () => setModels(readModels());
    window.addEventListener('xinyuexia_models_updated', syncModels);
    return () => window.removeEventListener('xinyuexia_models_updated', syncModels);
  }, []);

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_MODEL_KEY, activeId);
    else localStorage.removeItem(ACTIVE_MODEL_KEY);
  }, [activeId]);

  const persist = (next: ModelItem[]) => {
    setModels(next);
    writeModels(next);
    if (next.length === 0) setActiveId(null);
    else if (!next.some((model) => model.id === activeId)) setActiveId(next[0].id);
  };

  const addModel = (input: NewModelInput) => {
    const id = input.id.trim();
    if (!id || models.some((model) => model.id === id)) return false;
    const model: ModelItem = {
      id,
      name: input.name.trim() || id,
      baseUrl: input.baseUrl.trim(),
      apiKey: input.apiKey.trim(),
      model: id,
      enabled: true,
      locked: false,
      connectionStatus: 'unknown',
    };
    persist([...models, model]);
    setActiveId(model.id);
    return true;
  };

  const updateModel = (id: string, updates: Partial<ModelItem>) => {
    persist(models.map((model) => (model.id === id ? { ...model, ...updates } : model)));
  };

  const deleteModel = (id: string) => {
    persist(models.filter((model) => model.id !== id));
  };

  const reorderModels = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= models.length || to >= models.length) return;
    const next = [...models];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
  };

  return {
    models,
    activeId,
    activeModel,
    setActiveId,
    addModel,
    updateModel,
    deleteModel,
    reorderModels,
  };
}
