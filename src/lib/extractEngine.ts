// ═══════════════════════════════════════════════════════════════
// 模块化提炼引擎 v2 — 双区域：系统指令区 + 输出模块区
// ═══════════════════════════════════════════════════════════════

export interface ModuleDef {
  key: string;
  label: string;
  instruction: string;
  description?: string;
  builtIn?: boolean;
  /** false=系统指令区（告诉AI但不输出JSON）, true=输出模块区（告诉AI且输出JSON） */
  output: boolean;
}

export interface ExtractedPlotPoint {
  [key: string]: string | undefined;
  _raw?: string;
}

export interface PromptBuildResult {
  systemPrompt: string;
  userPrompt: string;
  /** 需要AI输出的模块key列表（输出模块区的模块） */
  outputKeys: string[];
}

export function buildPrompt(
  systemModuleKeys: string[],
  outputModuleKeys: string[],
  chapterContent: string,
  allModules: Record<string, ModuleDef>,
): PromptBuildResult {
  const systemMods = systemModuleKeys.map(k => allModules[k]).filter(Boolean);
  const outputMods = outputModuleKeys.map(k => allModules[k]).filter(Boolean);

  // System Prompt：包含所有模块的 instruction（系统指令区 + 输出模块区）
  const allInstructions = [...systemMods, ...outputMods].map(m => m.instruction).join('\n\n');

  // 只有输出模块区的模块才需要AI输出JSON字段
  const outputKeys = outputMods.map(m => m.key);
  const jsonKeys = outputMods.map(m => `"${m.key}": "..."`).join(',\n    ');

  const systemPrompt = `你是一位资深的小说剧情结构分析师，精通网文节奏拆解、克苏鲁/仙侠/都市等全题材套路逻辑。你的任务是将小说章节提炼为极致精简的"剧情点调用卡"。

铁律：
1. 变量占位原则：严禁出现章节中的具体名字。所有具体人名、地名、物品、功法、组织必须使用【】包裹并抽象化。
2. 输出格式：严格输出JSON数组，每个元素是一个对象。
3. 如果本章纯属日常过渡、设定说明或无意义注水，且无实质冲突或转折，输出空数组 []。
4. 语言：保持中文输出。

${allInstructions}`;

  const userPrompt = `请阅读以下网文章节，按上述规则提炼剧情点。请严格按以下JSON格式输出（每个剧情点是一个JSON对象，放在数组中）：

[\n  {\n    ${jsonKeys}\n  }\n]\n\n章节内容：\n\n${chapterContent}`;

  return { systemPrompt, userPrompt, outputKeys };
}

export function parseAiResponse(text: string): ExtractedPlotPoint[] | null {
  try {
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* */ }
  return null;
}
