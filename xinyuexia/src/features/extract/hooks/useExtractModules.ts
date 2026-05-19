import { useCallback, useMemo, useState } from 'react';

import type { ExtractModule, ExtractZone } from '@/features/extract/model/extractTypes';

const MODULES_KEY = 'xinyuexia_extract_modules_v1';

const DEFAULT_MODULES: ExtractModule[] = [
  {
    id: 'identity',
    label: '剧情身份定义',
    zone: 'system',
    active: true,
    locked: true,
    instruction: '你是资深小说剧情结构分析师，负责从章节中提炼可复用的剧情调用卡。',
  },
  {
    id: 'rules',
    label: '强制规则',
    zone: 'system',
    active: true,
    locked: true,
    instruction: '输出必须简洁、中文、按模块分段；没有实质剧情时标记为“跳过”。',
  },
  {
    id: 'plot',
    label: '剧情',
    zone: 'output',
    active: true,
    instruction: '概括本章核心剧情：谁在什么情境下做了什么，产生什么结果。',
  },
  {
    id: 'logic',
    label: '剧情因果逻辑',
    zone: 'output',
    active: true,
    instruction: '拆解本章事件的原因、决策和结果，标明作用对象。',
  },
  {
    id: 'state',
    label: '状态增量',
    zone: 'output',
    active: true,
    instruction: '列出角色关系、资源、认知、局势和悬念的变化。',
  },
  {
    id: 'next',
    label: '后续构思',
    zone: 'output',
    active: true,
    instruction: '基于当前剧情，给出可能的后续推进方向。',
  },
  {
    id: 'tags',
    label: '剧情点标签',
    zone: 'output',
    active: true,
    instruction: '用短标签概括剧情类型，例如反转、铺垫、冲突升级、信息差。',
  },
  {
    id: 'score',
    label: '评分',
    zone: 'output',
    active: true,
    instruction: '从张力、新颖度、情绪冲击和综合价值四个维度给出 0-100 分。',
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
      module.id === id && !module.locked ? { ...module, active: !module.active } : module
    )));
  }, [persist]);

  const updateModule = useCallback((id: string, updates: Partial<Pick<ExtractModule, 'label' | 'instruction'>>) => {
    persist((prev) => prev.map((module) => (module.id === id ? { ...module, ...updates } : module)));
  }, [persist]);

  const moveModule = useCallback((activeId: string, overId: string | ExtractZone) => {
    persist((prev) => {
      const activeIndex = prev.findIndex((module) => module.id === activeId);
      if (activeIndex < 0) return prev;

      const activeModule = prev[activeIndex];
      const overModule = prev.find((module) => module.id === overId);
      const targetZone: ExtractZone = overModule?.zone ?? (overId === 'system' || overId === 'output' ? overId : activeModule.zone);
      const withoutActive = prev.filter((module) => module.id !== activeId);

      let insertIndex = withoutActive.length;
      if (overModule) {
        const overIndex = withoutActive.findIndex((module) => module.id === overModule.id);
        insertIndex = overIndex >= 0 ? overIndex : insertIndex;
      } else {
        const modulesInTargetZone = withoutActive
          .map((module, index) => ({ module, index }))
          .filter((item) => item.module.zone === targetZone);
        const lastInZone = modulesInTargetZone[modulesInTargetZone.length - 1];
        insertIndex = lastInZone ? lastInZone.index + 1 : withoutActive.findIndex((module) => module.zone !== targetZone);
        if (insertIndex < 0) insertIndex = withoutActive.length;
      }

      const next = [...withoutActive];
      next.splice(insertIndex, 0, { ...activeModule, zone: targetZone });
      return next;
    });
  }, [persist]);

  return {
    modules,
    systemModules,
    outputModules,
    activeModules,
    toggleActive,
    updateModule,
    moveModule,
  };
}
