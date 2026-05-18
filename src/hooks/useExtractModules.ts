import { useState, useCallback } from 'react';
import { toPinyin } from '@/lib/pinyin';

export interface ModuleDefinition {
  key: string;
  label: string;
  instruction: string;
  output: boolean;
  builtIn?: boolean;
  requires?: string[];
}

const MODULES_KEY = 'extract_modules_v2';
const SYSTEM_ORDER_KEY = 'extract_system_order_v2';
const OUTPUT_ORDER_KEY = 'extract_output_order_v2';
const ACTIVE_KEY = 'extract_active_v2';
const DELETED_BUILTIN_KEY = 'extract_deleted_builtin_v1';

export const DEFAULT_MODULES: Record<string, ModuleDefinition> = {
  juqingshenfen: {
    key: 'juqingshenfen', label: '剧情身份定义',
    instruction: '你是一位专业的网文内容分析AI，擅长从小说章节中提取和拆解剧情要素。',
    builtIn: true, output: false
  },
  qiangzhiguize: {
    key: 'qiangzhiguize', label: '强制规则',
    instruction: '强制规则：\n1. 必须严格按JSON格式输出，不要任何解释说明。\n2. 如果当前章节不是【核心剧情点】（仅铺垫/日常/转场），所有字段填"跳过"。\n3. 【剧情因果逻辑】和【状态增量】中的"作用对象"必须是角色名，不能是"读者"或"观众"。\n4. 【评分】必须是0-100的整数，不能有小数。\n5. 禁止输出markdown代码块标记（如 ```json），直接输出纯JSON字符串。\n6. 所有文本必须使用中文。',
    builtIn: true, output: false
  },
  juqing: {
    key: 'juqing', label: '剧情',
    instruction: '提取本章的核心剧情点，用"谁在什么情境下做了什么，产生什么结果"的结构描述。要求包含：触发事件、关键动作、直接结果。如果本章有多个剧情点，请按时间顺序列出。',
    builtIn: true, output: true
  },
  yinguoluoji: {
    key: 'yinguoluoji', label: '剧情因果逻辑',
    instruction: '分析本章剧情的因果链条，按"因→决策→果"拆解。每个环节标明作用对象（哪个角色）和具体因果。如果有多条因果链，请分别列出。',
    builtIn: true, output: true
  },
  zhuangtaizengliang: {
    key: 'zhuangtaizengliang', label: '状态增量',
    instruction: '本章改变了什么：列出角色状态变化（实力/势力/关系/认知/资源）、环境变化、悬念变化。每个变化标明作用对象和变化方向。',
    builtIn: true, output: true
  },
  houxugousi: {
    key: 'houxugousi', label: '后续构思',
    instruction: '基于当前剧情和已有人物关系，预测3个可能的后续发展方向。每个方向说明：触发条件、可能的发展路径、潜在冲突点。',
    builtIn: true, output: true,
    requires: ['juqingleixing']
  },
  juqingleixing: {
    key: 'juqingleixing', label: '剧情点标签',
    instruction: '用带#的宏观套路标签概括本章类型，如：#扮猪吃虎、#绝境转机、#秘密交易、#微末崛起、#信息差。',
    builtIn: true, output: true
  },
  huangjinsanzhangpinggu: {
    key: 'huangjinsanzhangpinggu', label: '黄金三章评估',
    instruction: '如果本章属于开局前三章，必须写明：本章通过【XX元素】制造了【XX悬念/爽点】，核心钩子是【XX】。非前三章则填"无"。',
    builtIn: true, output: true
  },
  jiazhipinggu: {
    key: 'jiazhipinggu', label: '评分',
    instruction: '必须包含四个维度的0-100分评分：张力、新颖度、情绪冲击、综合评分。',
    builtIn: true, output: true
  },
};

const KEY_MIGRATION: Record<string, string> = {
  tuijiandapei: 'houxugousi',
  huangjinsanzhangbeizhu: 'huangjinsanzhangpinggu',
};

const MODULES_SCHEMA_VERSION = 3;
const SCHEMA_VERSION_KEY = 'extract_schema_version';

function loadJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch { /* */ }
  return fallback;
}
function saveJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
}

function migrateKeys(keys: string[]): string[] {
  return keys.map(k => KEY_MIGRATION[k] || k).filter((v, i, a) => a.indexOf(v) === i);
}

/* ═══════════════════════════════════════════
   以下加载函数保持为模块顶层函数（仅在初始化时调用）
   ═══════════════════════════════════════════ */

function loadModulesFromStorage(): Record<string, ModuleDefinition> {
  const savedVersion = loadJson<number>(SCHEMA_VERSION_KEY, 0);
  let saved = loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {});

  const migrated: Record<string, ModuleDefinition> = {};
  for (const [id, mod] of Object.entries(saved)) {
    const newId = KEY_MIGRATION[id] || id;
    migrated[newId] = { ...mod, key: KEY_MIGRATION[mod.key] || mod.key };
  }

  const deletedBuiltin = loadJson<string[]>(DELETED_BUILTIN_KEY, []);

  const result: Record<string, ModuleDefinition> = {};
  for (const [id, def] of Object.entries(DEFAULT_MODULES)) {
    // 跳过用户已删除的内置模块
    if (deletedBuiltin.includes(id)) continue;
    const savedMod = migrated[id];
    if (savedMod && savedVersion > 0) {
      const userChangedLabel = savedMod.label !== (DEFAULT_MODULES[id]?.label || def.label);
      const userChangedInstruction = savedMod.instruction !== (DEFAULT_MODULES[id]?.instruction || def.instruction);
      result[id] = {
        ...def,
        label: userChangedLabel ? savedMod.label : def.label,
        instruction: userChangedInstruction ? savedMod.instruction : def.instruction,
        output: savedMod.output !== undefined ? savedMod.output : def.output,
        key: savedMod.key || def.key,
        requires: savedMod.requires !== undefined ? savedMod.requires : def.requires,
      };
    } else {
      result[id] = { ...def };
    }
  }
  for (const [id, mod] of Object.entries(migrated)) {
    if (!DEFAULT_MODULES[id]) result[id] = mod;
  }

  if (savedVersion !== MODULES_SCHEMA_VERSION) {
    saveJson(SCHEMA_VERSION_KEY, MODULES_SCHEMA_VERSION);
    // 版本升级后自动保存合并结果
    saveModulesToStorage(result);
  }
  return result;
}

function loadSystemOrderFromStorage(): string[] {
  const saved = migrateKeys(loadJson<string[]>(SYSTEM_ORDER_KEY, []));
  const systemDefaults = Object.keys(DEFAULT_MODULES).filter(k => DEFAULT_MODULES[k].output === false);
  const all = new Set([...saved, ...systemDefaults]);
  return Array.from(all).filter(k => DEFAULT_MODULES[k] || loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {})[k]);
}

function loadOutputOrderFromStorage(): string[] {
  const saved = migrateKeys(loadJson<string[]>(OUTPUT_ORDER_KEY, []));
  const outputDefaults = Object.keys(DEFAULT_MODULES).filter(k => DEFAULT_MODULES[k].output === true);
  const all = new Set([...saved, ...outputDefaults]);
  return Array.from(all).filter(k => DEFAULT_MODULES[k] || loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {})[k]);
}

function loadActiveKeysFromStorage(): string[] {
  return migrateKeys(loadJson<string[]>(ACTIVE_KEY, Object.keys(DEFAULT_MODULES)))
    .filter(k => DEFAULT_MODULES[k] || loadJson<Record<string, ModuleDefinition>>(MODULES_KEY, {})[k]);
}

/* 模块顶层保存函数 — 供 loadModulesFromStorage 调用 */
function saveModulesToStorage(modules: Record<string, ModuleDefinition>) {
  const toSave: Record<string, ModuleDefinition> = {};
  for (const [id, mod] of Object.entries(modules)) {
    if (DEFAULT_MODULES[id]) {
      const def = DEFAULT_MODULES[id];
      const reqChanged = JSON.stringify(mod.requires) !== JSON.stringify(def.requires);
      if (mod.label !== def.label || mod.instruction !== def.instruction || mod.output !== def.output || mod.key !== def.key || reqChanged) {
        toSave[id] = mod;
      }
    } else {
      toSave[id] = mod;
    }
  }
  saveJson(MODULES_KEY, toSave);
}

export type { ModuleDefinition };

/* ═══════════════════════════════════════════
   配置导出/导入
   ═══════════════════════════════════════════ */

const CONFIG_EXPORT_KEYS = [
  MODULES_KEY,
  SYSTEM_ORDER_KEY,
  OUTPUT_ORDER_KEY,
  ACTIVE_KEY,
  SCHEMA_VERSION_KEY,
];

export function exportExtractConfig(): string {
  const config: Record<string, unknown> = {};
  for (const key of CONFIG_EXPORT_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) config[key] = JSON.parse(raw);
    } catch { /* 忽略 */ }
  }
  try {
    const filesRaw = localStorage.getItem('extract_files_cache');
    if (filesRaw) config['extract_files_cache'] = JSON.parse(filesRaw);
    const configRaw = localStorage.getItem('extract_config_v1');
    if (configRaw) config['extract_config_v1'] = JSON.parse(configRaw);
    const historyRaw = localStorage.getItem('extract_history_v1');
    if (historyRaw) config['extract_history_v1'] = JSON.parse(historyRaw);
  } catch { /* 忽略 */ }
  return JSON.stringify({
    _exportVersion: 1,
    _exportAt: new Date().toISOString(),
    _appName: '月下写作-提炼配置',
    data: config,
  }, null, 2);
}

export function importExtractConfig(jsonText: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonText);
    const data = parsed.data || parsed;
    if (!data[MODULES_KEY] && !data[SYSTEM_ORDER_KEY] && !data[OUTPUT_ORDER_KEY]) {
      return { success: false, message: '配置文件格式不正确，缺少必要的模块数据' };
    }
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
    localStorage.setItem(SCHEMA_VERSION_KEY, JSON.stringify(MODULES_SCHEMA_VERSION));
    return { success: true, message: '配置导入成功，刷新页面后生效' };
  } catch {
    return { success: false, message: '配置文件解析失败，请检查文件格式' };
  }
}

/* ═══════════════════════════════════════════
   Hook — 保存函数定义在 hook 内部防止 tree-shaking
   ═══════════════════════════════════════════ */

export function useExtractModules() {
  // 在 hook 内部定义保存函数，确保不被 tree-shaking 排除
  const saveModules = useCallback((modules: Record<string, ModuleDefinition>) => {
    const toSave: Record<string, ModuleDefinition> = {};
    for (const [id, mod] of Object.entries(modules)) {
      if (DEFAULT_MODULES[id]) {
        const def = DEFAULT_MODULES[id];
        const reqChanged = JSON.stringify(mod.requires) !== JSON.stringify(def.requires);
        if (mod.label !== def.label || mod.instruction !== def.instruction || mod.output !== def.output || mod.key !== def.key || reqChanged) {
          toSave[id] = mod;
        }
      } else {
        toSave[id] = mod;
      }
    }
    saveJson(MODULES_KEY, toSave);
  }, []);

  const saveSystemOrder = useCallback((order: string[]) => { saveJson(SYSTEM_ORDER_KEY, order); }, []);
  const saveOutputOrder = useCallback((order: string[]) => { saveJson(OUTPUT_ORDER_KEY, order); }, []);
  const saveActiveKeys = useCallback((keys: string[]) => { saveJson(ACTIVE_KEY, keys); }, []);

  const [allModules, setAllModules] = useState<Record<string, ModuleDefinition>>(loadModulesFromStorage);
  const [systemOrder, setSystemOrder] = useState<string[]>(loadSystemOrderFromStorage);
  const [outputOrder, setOutputOrder] = useState<string[]>(loadOutputOrderFromStorage);
  const [activeKeys, setActiveKeys] = useState<string[]>(loadActiveKeysFromStorage);

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
  }, [saveModules, saveSystemOrder, saveOutputOrder, saveActiveKeys]);

  // ─── 更新模块 ───
  const updateModule = useCallback((id: string, updates: Partial<ModuleDefinition>) => {
    setAllModules(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev, [id]: { ...prev[id], ...updates } };
      saveModules(next);
      return next;
    });
  }, [saveModules]);

  // ─── 删除模块 ───
  const deleteModule = useCallback((id: string) => {
    // 内置模块删除时记录到删除列表，防止刷新后自动恢复
    if (DEFAULT_MODULES[id]) {
      const deleted = loadJson<string[]>(DELETED_BUILTIN_KEY, []);
      if (!deleted.includes(id)) {
        deleted.push(id);
        saveJson(DELETED_BUILTIN_KEY, deleted);
      }
    }
    setAllModules(prev => {
      const next = { ...prev };
      delete next[id];
      saveModules(next);
      return next;
    });
    setSystemOrder(prev => { const next = prev.filter(k => k !== id); saveSystemOrder(next); return next; });
    setOutputOrder(prev => { const next = prev.filter(k => k !== id); saveOutputOrder(next); return next; });
    setActiveKeys(prev => { const next = prev.filter(k => k !== id); saveActiveKeys(next); return next; });
  }, [saveModules, saveSystemOrder, saveOutputOrder, saveActiveKeys]);

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
        const dependents = collectDependents(id);
        next = prev.filter(k => k !== id && !dependents.includes(k));
      } else {
        const prereqs = collectPrerequisites(id);
        next = [...new Set([...prev, id, ...prereqs])];
      }
      saveActiveKeys(next);
      return next;
    });
  }, [collectPrerequisites, collectDependents, saveActiveKeys]);

  // ─── 同区内拖拽排序 ───
  const reorderSystem = useCallback((dragId: string, targetId: string) => {
    setSystemOrder(prev => {
      const d = prev.indexOf(dragId), t = prev.indexOf(targetId);
      if (d === -1 || t === -1 || d === t) return prev;
      const next = [...prev]; next.splice(d, 1); next.splice(t, 0, dragId);
      saveSystemOrder(next); return next;
    });
  }, [saveSystemOrder]);

  const reorderOutput = useCallback((dragId: string, targetId: string) => {
    setOutputOrder(prev => {
      const d = prev.indexOf(dragId), t = prev.indexOf(targetId);
      if (d === -1 || t === -1 || d === t) return prev;
      const next = [...prev]; next.splice(d, 1); next.splice(t, 0, dragId);
      saveOutputOrder(next); return next;
    });
  }, [saveOutputOrder]);

  // ─── 跨区移动（系统指令 ↔ 输出模块） ───
  const moveToZone = useCallback((id: string, targetOutput: boolean) => {
    setSystemOrder(prev => { const next = prev.filter(k => k !== id); saveSystemOrder(next); return next; });
    setOutputOrder(prev => { const next = prev.filter(k => k !== id); saveOutputOrder(next); return next; });
    setAllModules(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev, [id]: { ...prev[id], output: targetOutput } };
      saveModules(next);
      return next;
    });
    if (targetOutput) {
      setOutputOrder(prev => { const next = [...prev, id]; saveOutputOrder(next); return next; });
    } else {
      setSystemOrder(prev => { const next = [...prev, id]; saveSystemOrder(next); return next; });
    }
  }, [saveModules, saveSystemOrder, saveOutputOrder]);

  // ─── 上移/下移（替代拖拽排序） ───
  const moveUp = useCallback((id: string) => {
    if (allModules[id]?.output) {
      setOutputOrder(prev => {
        const idx = prev.indexOf(id); if (idx <= 0) return prev;
        const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        saveOutputOrder(next); return next;
      });
    } else {
      setSystemOrder(prev => {
        const idx = prev.indexOf(id); if (idx <= 0) return prev;
        const next = [...prev]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        saveSystemOrder(next); return next;
      });
    }
  }, [allModules, saveSystemOrder, saveOutputOrder]);

  const moveDown = useCallback((id: string) => {
    if (allModules[id]?.output) {
      setOutputOrder(prev => {
        const idx = prev.indexOf(id); if (idx === -1 || idx >= prev.length - 1) return prev;
        const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        saveOutputOrder(next); return next;
      });
    } else {
      setSystemOrder(prev => {
        const idx = prev.indexOf(id); if (idx === -1 || idx >= prev.length - 1) return prev;
        const next = [...prev]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        saveSystemOrder(next); return next;
      });
    }
  }, [allModules, saveSystemOrder, saveOutputOrder]);

  // ─── 恢复内置模块默认设置 ───
  const resetToDefault = useCallback((id: string) => {
    if (!DEFAULT_MODULES[id]) return;
    // 清除该模块的删除记录，使其重新出现
    const deleted = loadJson<string[]>(DELETED_BUILTIN_KEY, []);
    const idx = deleted.indexOf(id);
    if (idx >= 0) {
      deleted.splice(idx, 1);
      saveJson(DELETED_BUILTIN_KEY, deleted);
    }
    setAllModules(prev => {
      const next = { ...prev, [id]: DEFAULT_MODULES[id] };
      saveModules(next);
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
  }, [systemOrder, saveModules, saveSystemOrder, saveOutputOrder]);

  // ─── 判断内置模块是否被修改过 ───
  const isModified = useCallback((id: string) => {
    if (!DEFAULT_MODULES[id]) return false;
    const current = allModules[id]; if (!current) return false;
    const def = DEFAULT_MODULES[id];
    return current.label !== def.label || current.instruction !== def.instruction || current.output !== def.output || current.key !== def.key;
  }, [allModules]);

  return {
    allModules, systemKeys, outputKeys, activeKeys,
    addModule, updateModule, deleteModule,
    toggleActive, reorderSystem, reorderOutput, moveToZone,
    resetToDefault, isModified,
    collectPrerequisites, collectDependents,
  };
}
