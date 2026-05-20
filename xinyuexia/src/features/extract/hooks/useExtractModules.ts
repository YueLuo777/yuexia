import { useCallback, useMemo, useState } from 'react';

import type { ExtractModule, ExtractZone } from '@/features/extract/model/extractTypes';

const MODULES_KEY = 'xinyuexia_extract_modules_v1';

const DEFAULT_MODULES: ExtractModule[] = [
  {
    id: 'identity',
    label: '剧情身份定义',
    zone: 'system',
    active: true,
    instruction: '你是资深小说剧情结构分析师，负责从章节中提炼可复用的剧情调用卡。',
  },
  {
    id: 'rules',
    label: '强制规则',
    zone: 'system',
    active: true,
    instruction: '输出必须简洁、中文、按模块分段；没有实质剧情时标记为“跳过”。',
  },
  {
    id: 'variables',
    label: '变量词典',
    zone: 'system',
    active: true,
    instruction: '对人物、势力、地点、道具等专有名词保持一致表达，避免同义混写。',
  },
  {
    id: 'format',
    label: '输出格式',
    zone: 'system',
    active: true,
    instruction: '按当前启用模块逐项输出，每个模块单独成段，不要输出无关解释。',
  },
  {
    id: 'score',
    label: '评分',
    zone: 'output',
    active: true,
    instruction: '从张力、新颖度、情绪冲击和综合价值四个维度给出 0-100 分。',
  },
  {
    id: 'summary',
    label: '剧情概概',
    zone: 'output',
    active: true,
    instruction: '概括本章重要剧情线、起因、冲突、结果和首次出现的信息变化。',
  },
  {
    id: 'followup',
    label: '后续构思',
    zone: 'output',
    active: true,
    instruction: '基于当前剧情，给出可能的后续推进方向。',
  },
  {
    id: 'state',
    label: '状态增量',
    zone: 'output',
    active: true,
    instruction: '列出角色关系、资源、认知、局势和悬念的变化。',
  },
  {
    id: 'logic',
    label: '因果逻辑',
    zone: 'output',
    active: true,
    instruction: '拆解事件的原因、决策和结果，标明作用对象。',
  },
  {
    id: 'tags',
    label: '主题标签',
    zone: 'output',
    active: true,
    instruction: '用短标签概括剧情类型，例如反转、铺垫、冲突升级、信息差。',
  },
];

function readModules() {
  try {
    const raw = localStorage.getItem(MODULES_KEY);
    return raw ? (JSON.parse(raw) as ExtractModule[]) : DEFAULT_MODULES;
  } catch {
    return DEFAULT_MODULES;
  }
}

function writeModules(modules: ExtractModule[]) {
  localStorage.setItem(MODULES_KEY, JSON.stringify(modules));
}

function normalizeModules(value: unknown): ExtractModule[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item) => (
    item &&
    typeof item === 'object' &&
    typeof (item as ExtractModule).id === 'string' &&
    typeof (item as ExtractModule).label === 'string' &&
    typeof (item as ExtractModule).instruction === 'string' &&
    ((item as ExtractModule).zone === 'system' || (item as ExtractModule).zone === 'output') &&
    typeof (item as ExtractModule).active === 'boolean'
  )) as ExtractModule[];
  return items.length > 0 ? items : null;
}

export function useExtractModules() {
  const [modules, setModules] = useState<ExtractModule[]>(readModules);

  const systemModules = useMemo(() => modules.filter((module) => module.zone === 'system'), [modules]);
  const outputModules = useMemo(() => modules.filter((module) => module.zone === 'output'), [modules]);
  const activeModules = useMemo(() => modules.filter((module) => module.active), [modules]);

  const persist = useCallback((updater: (prev: ExtractModule[]) => ExtractModule[]) => {
    setModules((prev) => {
      const next = updater(prev);
      writeModules(next);
      return next;
    });
  }, []);

  const toggleActive = useCallback((id: string) => {
    persist((prev) => prev.map((module) => (
      module.id === id ? { ...module, active: !module.active } : module
    )));
  }, [persist]);

  const updateModule = useCallback((id: string, updates: Partial<Pick<ExtractModule, 'label' | 'instruction' | 'zone'>>) => {
    persist((prev) => prev.map((module) => (module.id === id ? { ...module, ...updates } : module)));
  }, [persist]);

  const moveModule = useCallback((activeId: string, overId: string | ExtractZone) => {
    persist((prev) => {
      const activeIndex = prev.findIndex((module) => module.id === activeId);
      if (activeIndex < 0) return prev;

      const withoutActive = prev.filter((module) => module.id !== activeId);
      const overIndex = withoutActive.findIndex((module) => module.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : withoutActive.length;
      const next = [...withoutActive];
      next.splice(insertIndex, 0, prev[activeIndex]);
      return next;
    });
  }, [persist]);

  const exportExtractConfig = useCallback(() => JSON.stringify({
    modules,
    exportedAt: new Date().toISOString(),
  }, null, 2), [modules]);

  const importExtractConfig = useCallback((jsonText: string) => {
    try {
      const parsed: unknown = JSON.parse(jsonText);
      const imported = normalizeModules((parsed as { modules?: unknown }).modules ?? parsed);
      if (!imported) {
        return { success: false, message: '配置格式不正确' };
      }
      setModules(imported);
      writeModules(imported);
      window.dispatchEvent(new CustomEvent('xinyuexia_extract_modules_updated'));
      return { success: true, message: '模块配置已导入' };
    } catch {
      return { success: false, message: '无法解析配置文件' };
    }
  }, []);

  const resetExtractModules = useCallback(() => {
    setModules(DEFAULT_MODULES);
    writeModules(DEFAULT_MODULES);
    window.dispatchEvent(new CustomEvent('xinyuexia_extract_modules_updated'));
    return DEFAULT_MODULES;
  }, []);

  return {
    modules,
    systemModules,
    outputModules,
    activeModules,
    toggleActive,
    updateModule,
    moveModule,
    exportExtractConfig,
    importExtractConfig,
    resetExtractModules,
  };
}
