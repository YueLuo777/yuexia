import { useState, useCallback } from 'react';
import { toPinyin } from '@/lib/pinyin';

// ─── v2 存储 ───
const MODULES_KEY = 'extract_modules_v2';
const SYSTEM_ORDER_KEY = 'extract_system_order_v2';
const OUTPUT_ORDER_KEY = 'extract_output_order_v2';
const ACTIVE_KEY = 'extract_active_v2';

export interface ModuleDefinition {
  key: string;
  label: string;
  instruction: string;
  builtIn?: boolean;
  /** false=系统指令区（告诉AI但不输出）, true=输出模块区（告诉AI且输出JSON） */
  output: boolean;
  /** 前置依赖模块ID列表：勾选本模块时，会自动递归勾选这些前置模块 */
  requires?: string[];
}

// ─── 默认内置模块 ───
export const DEFAULT_MODULES: Record<string, ModuleDefinition> = {
  // ─── 系统指令区（output: false）─ 告诉AI但不输出 ───
  juqingshenfen: {
    key: 'juqingshenfen', label: '身份定义',
    instruction: '你是一位资深的小说剧情结构分析师，精通网文节奏拆解、克苏鲁/仙侠/都市等全题材套路逻辑。你的任务是将小说章节提炼为极致精简的"剧情点调用卡"，供 AI 后续检索与创作。',
    builtIn: true, output: false
  },
  qiangzhiguize: {
    key: 'qiangzhiguize', label: '强制规则',
    instruction: `1. 变量占位原则（核心）：严禁出现章节中的具体名字。所有具体人名、地名、物品、功法、组织，必须使用【】包裹并抽象化。
- 首次出现需标注说明，如：【主角（核心人物）】、【反派（冲突对象，上级/恶霸）】、【核心道具（功能，丹药/信物）】。
- 后续重复出现直接使用【主角】、【反派】即可。
2. 因果逻辑链：严格使用"因为...导致...从而..."句式。所有名词和动作必须抽象，用于前置条件校验。
3. 状态增量：仅记录本章结束时，【主角】在实力、关系、财富或隐秘情报上的净值变化。
4. 黄金三章特殊规则：如果本章属于开局前三章，必须在提炼时额外分析其"核心噱头/悬念钩子"，指出其留住读者的关键点。
5. 熔断机制：若本章纯属日常过渡、设定说明或无意义注水，且无实质冲突或转折，必须仅输出"无可提炼剧情点"五个字，严禁输出任何格式。`,
    builtIn: true, output: false
  },

  // ─── 输出模块区（output: true）─ 告诉AI且输出JSON ───
  juqing: {
    key: 'juqing', label: '剧情',
    instruction: '一段连贯叙述，包含起因、核心冲突、结果。所有具体人名、地名、物品、功法、组织必须使用【】包裹并抽象化，如【主角（核心人物）】、【反派（冲突对象）】。后续重复出现直接使用【主角】、【反派】即可。',
    builtIn: true, output: true
  },
  yinguoluoji: {
    key: 'yinguoluoji', label: '因果逻辑',
    instruction: '严格使用"因为【原因】，导致【过程/冲突】，从而【结果/转折】"句式。所有名词和动作必须抽象化，用于前置条件校验。',
    builtIn: true, output: true
  },
  zhuangtaizengliang: {
    key: 'zhuangtaizengliang', label: '状态增量',
    instruction: '仅记录本章结束时，【主角】在实力、关系、财富或隐秘情报上的净值变化。用一句话概括净收益或净亏损。',
    builtIn: true, output: true
  },
  houxugousi: {
    key: 'houxugousi', label: '后续构思',
    instruction: '基于当前剧情类型，推荐2-3个最适合衔接的后续剧情类型。格式：#当前剧情类型 → #推荐衔接类型A / #推荐衔接类型B',
    builtIn: true, output: true,
    requires: ['juqingleixing']
  },
  juqingleixing: {
    key: 'juqingleixing', label: '剧情类型',
    instruction: '用带#的宏观套路标签概括本章类型，如：#扮猪吃虎、#绝境转机、#秘密交易、#微末崛起。',
    builtIn: true, output: true
  },
  biaoqian: {
    key: 'biaoqian', label: '标签',
    instruction: '用带#的微观特征标签标注，如：#暴力救场 #身份疑云 #信息差立威。空格分隔，最多5个。',
    builtIn: true, output: true
  },
  huangjinsanzhangpinggu: {
    key: 'huangjinsanzhangpinggu', label: '黄金三章评估',
    instruction: '如果本章属于开局前三章，必须写明：本章通过【XX元素】制造了【XX悬念/爽点】，核心钩子是【XX】。非前三章则填"无"。',
    builtIn: true, output: true
  },
  jiazhipinggu: {
    key: 'jiazhipinggu', label: '价值评估',
    instruction: '必须包含四个维度的0-100分评分：张力、新颖度、情绪冲击、综合评分。',
    builtIn: true, output: true
  },
};

// ─── 旧 key → 新 key 迁移映射 ───
const KEY_MIGRATION: Record<string, string> = {
  tuijiandapei: 'houxugousi',
  huangjinsanzhangbeizhu: 'huangjinsanzhangpinggu',
};

// ─── localStorage 工具 ───
function loadJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch { /* */ }
  return fallback;
}
function saveJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
}

// ─── 加载/保存 ───
function loadModules(): Record<string, ModuleDefinition> {
  let saved = loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {});
  // 迁移旧 key
  const migrated: Record<string, ModuleDefinition> = {};
  for (const [id, mod] of Object.entries(saved)) {
    const newId = KEY_MIGRATION[id] || id;
    migrated[newId] = { ...mod, key: KEY_MIGRATION[mod.key] || mod.key };
  }
  // 默认模块作为基础，保存的覆盖默认
  return { ...DEFAULT_MODULES, ...migrated };
}

function saveModules(modules: Record<string, ModuleDefinition>) {
  // 保存与默认模块不同的所有模块（内置修改 + 自定义模块）
  const toSave: Record<string, ModuleDefinition> = {};
  for (const [id, mod] of Object.entries(modules)) {
    if (DEFAULT_MODULES[id]) {
      // 内置模块：只保存与默认不同的
      const def = DEFAULT_MODULES[id];
      if (mod.label !== def.label || mod.instruction !== def.instruction || mod.output !== def.output || mod.key !== def.key) {
        toSave[id] = mod;
      }
    } else {
      // 自定义模块：全部保存
      toSave[id] = mod;
    }
  }
  saveJson(MODULES_KEY, toSave);
}

function migrateKeys(keys: string[]): string[] {
  return keys.map(k => KEY_MIGRATION[k] || k).filter((v, i, a) => a.indexOf(v) === i);
}

function loadSystemOrder(): string[] {
  const saved = migrateKeys(loadJson<string[]>(SYSTEM_ORDER_KEY, []));
  const systemDefaults = Object.keys(DEFAULT_MODULES).filter(k => DEFAULT_MODULES[k].output === false);
  const all = new Set([...saved, ...systemDefaults]);
  return Array.from(all).filter(k => DEFAULT_MODULES[k] || loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {})[k]);
}
function saveSystemOrder(order: string[]) { saveJson(SYSTEM_ORDER_KEY, order); }

function loadOutputOrder(): string[] {
  const saved = migrateKeys(loadJson<string[]>(OUTPUT_ORDER_KEY, []));
  const outputDefaults = Object.keys(DEFAULT_MODULES).filter(k => DEFAULT_MODULES[k].output === true);
  const all = new Set([...saved, ...outputDefaults]);
  return Array.from(all).filter(k => DEFAULT_MODULES[k] || loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {})[k]);
}
function saveOutputOrder(order: string[]) { saveJson(OUTPUT_ORDER_KEY, order); }

function loadActiveKeys(): string[] {
  return migrateKeys(loadJson<string[]>(ACTIVE_KEY, Object.keys(DEFAULT_MODULES)));
}
function saveActiveKeys(keys: string[]) { saveJson(ACTIVE_KEY, keys); }

export type { ModuleDefinition };

export function useExtractModules() {
  const [allModules, setAllModules] = useState<Record<string, ModuleDefinition>>(loadModules);
  const [systemOrder, setSystemOrder] = useState<string[]>(loadSystemOrder);
  const [outputOrder, setOutputOrder] = useState<string[]>(loadOutputOrder);
  const [activeKeys, setActiveKeys] = useState<string[]>(loadActiveKeys);

  // 过滤出当前有效的模块key
  const systemKeys = systemOrder.filter(id => allModules[id]);
  const outputKeys = outputOrder.filter(id => allModules[id]);

  // ─── 新建模块 ───
  const addModule = useCallback((mod: Omit<ModuleDefinition, 'builtIn' | 'key'>) => {
    const id = 'custom_' + Date.now().toString(36);
    const key = toPinyin(mod.label.trim());
    const newMod: ModuleDefinition = { ...mod, key, builtIn: false };
    setAllModules(prev => {
      const next = { ...prev, [id]: newMod };
      saveModules(next);
      return next;
    });
    if (newMod.output) {
      setOutputOrder(prev => { const next = [...prev, id]; saveOutputOrder(next); return next; });
    } else {
      setSystemOrder(prev => { const next = [...prev, id]; saveSystemOrder(next); return next; });
    }
    setActiveKeys(prev => { const next = [...prev, id]; saveActiveKeys(next); return next; });
    return id;
  }, []);

  // ─── 更新模块 ───
  const updateModule = useCallback((id: string, updates: Partial<ModuleDefinition>) => {
    setAllModules(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev, [id]: { ...prev[id], ...updates } };
      saveModules(next);
      return next;
    });
  }, []);

  // ─── 删除模块 ───
  const deleteModule = useCallback((id: string) => {
    if (DEFAULT_MODULES[id]) return; // 内置模块不可删
    setAllModules(prev => {
      const next = { ...prev };
      delete next[id];
      saveModules(next);
      return next;
    });
    setSystemOrder(prev => { const next = prev.filter(k => k !== id); saveSystemOrder(next); return next; });
    setOutputOrder(prev => { const next = prev.filter(k => k !== id); saveOutputOrder(next); return next; });
    setActiveKeys(prev => { const next = prev.filter(k => k !== id); saveActiveKeys(next); return next; });
  }, []);

  // ─── 收集某个模块的所有前置依赖（递归） ───
  const collectPrerequisites = useCallback((id: string, visited = new Set<string>()): string[] => {
    if (visited.has(id)) return [];
    visited.add(id);
    const mod = allModules[id];
    if (!mod || !mod.requires) return [];
    const result: string[] = [];
    for (const req of mod.requires) {
      if (!result.includes(req)) {
        result.push(req);
        const nested = collectPrerequisites(req, visited);
        for (const n of nested) {
          if (!result.includes(n)) result.push(n);
        }
      }
    }
    return result;
  }, [allModules]);

  // ─── 收集所有依赖于指定模块的模块（反向依赖） ───
  const collectDependents = useCallback((id: string): string[] => {
    const result: string[] = [];
    for (const [mid, mod] of Object.entries(allModules)) {
      if (mod.requires?.includes(id) && !result.includes(mid)) {
        result.push(mid);
        for (const nested of collectDependents(mid)) {
          if (!result.includes(nested)) result.push(nested);
        }
      }
    }
    return result;
  }, [allModules]);

  // ─── 切换激活（自动处理依赖绑定） ───
  const toggleActive = useCallback((id: string) => {
    setActiveKeys(prev => {
      let next: string[];
      if (prev.includes(id)) {
        // 取消勾选：同时取消所有依赖它的模块
        const dependents = collectDependents(id);
        next = prev.filter(k => k !== id && !dependents.includes(k));
      } else {
        // 勾选：同时递归勾选所有前置依赖
        const prereqs = collectPrerequisites(id);
        next = [...new Set([...prev, id, ...prereqs])];
      }
      saveActiveKeys(next);
      return next;
    });
  }, [collectPrerequisites, collectDependents]);

  // ─── 同区内拖拽排序 ───
  const reorderSystem = useCallback((dragId: string, targetId: string) => {
    setSystemOrder(prev => {
      const d = prev.indexOf(dragId), t = prev.indexOf(targetId);
      if (d === -1 || t === -1 || d === t) return prev;
      const next = [...prev]; next.splice(d, 1); next.splice(t, 0, dragId);
      saveSystemOrder(next); return next;
    });
  }, []);

  const reorderOutput = useCallback((dragId: string, targetId: string) => {
    setOutputOrder(prev => {
      const d = prev.indexOf(dragId), t = prev.indexOf(targetId);
      if (d === -1 || t === -1 || d === t) return prev;
      const next = [...prev]; next.splice(d, 1); next.splice(t, 0, dragId);
      saveOutputOrder(next); return next;
    });
  }, []);

  // ─── 跨区移动（系统指令 ↔ 输出模块） ───
  const moveToZone = useCallback((id: string, targetOutput: boolean) => {
    // 1. 从原区移除
    setSystemOrder(prev => { const next = prev.filter(k => k !== id); saveSystemOrder(next); return next; });
    setOutputOrder(prev => { const next = prev.filter(k => k !== id); saveOutputOrder(next); return next; });
    // 2. 更新模块 output 字段
    setAllModules(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev, [id]: { ...prev[id], output: targetOutput } };
      saveModules(next);
      return next;
    });
    // 3. 加入新区（末尾）
    if (targetOutput) {
      setOutputOrder(prev => { const next = [...prev, id]; saveOutputOrder(next); return next; });
    } else {
      setSystemOrder(prev => { const next = [...prev, id]; saveSystemOrder(next); return next; });
    }
  }, []);

  // ─── 恢复内置模块默认设置 ───
  const resetToDefault = useCallback((id: string) => {
    if (!DEFAULT_MODULES[id]) return;
    setAllModules(prev => {
      const next = { ...prev, [id]: DEFAULT_MODULES[id] };
      saveModules(next);
      // 如果 output 字段变了，需要同步切换区域
      const defaultOutput = DEFAULT_MODULES[id].output;
      const currentInSystem = systemOrder.includes(id);
      const shouldBeInSystem = defaultOutput === false;
      if (currentInSystem !== shouldBeInSystem) {
        if (shouldBeInSystem) {
          setSystemOrder(s => { const ns = [...s.filter(k => k !== id), id]; saveSystemOrder(ns); return ns; });
          setOutputOrder(s => { const ns = s.filter(k => k !== id); saveOutputOrder(ns); return ns; });
        } else {
          setOutputOrder(s => { const ns = [...s.filter(k => k !== id), id]; saveOutputOrder(ns); return ns; });
          setSystemOrder(s => { const ns = s.filter(k => k !== id); saveSystemOrder(ns); return ns; });
        }
      }
      return next;
    });
  }, [systemOrder]);

  // ─── 判断内置模块是否被修改过 ───
  const isModified = useCallback((id: string) => {
    if (!DEFAULT_MODULES[id]) return false;
    const current = allModules[id]; if (!current) return false;
    const def = DEFAULT_MODULES[id];
    return current.label !== def.label || current.instruction !== def.instruction || current.output !== def.output || current.key !== def.key;
  }, [allModules]);

  return {
    allModules, systemKeys, outputKeys, activeKeys,
    addModule, updateModule, deleteModule, toggleActive,
    reorderSystem, reorderOutput, moveToZone,
    resetToDefault, isModified,
  };
}
