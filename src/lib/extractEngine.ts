// ═══════════════════════════════════════════════════════════════
// 模块化提炼引擎 v3 — Markdown文本输出模式
// ═══════════════════════════════════════════════════════════════

export interface ModuleDef {
  key: string;
  label: string;
  instruction: string;
  description?: string;
  builtIn?: boolean;
  /** false=系统指令区, true=输出模块区 */
  output: boolean;
}

/** 提炼结果：纯文本/Markdown 格式 */
export interface ExtractResult {
  /** 该批次对应的章节标题 */
  chapterTitle: string;
  /** AI返回的纯文本/Markdown内容 */
  content: string;
}

export interface PromptBuildResult {
  systemPrompt: string;
  userPrompt: string;
  /** 输出模块区的模块key列表 */
  outputKeys: string[];
}

/**
 * 构建提示词 — 要求AI输出Markdown文本格式
 */
export function buildPrompt(
  systemModuleKeys: string[],
  outputModuleKeys: string[],
  chapterContent: string,
  allModules: Record<string, ModuleDef>,
): PromptBuildResult {
  const systemMods = systemModuleKeys.map(k => allModules[k]).filter(Boolean);
  const outputMods = outputModuleKeys.map(k => allModules[k]).filter(Boolean);

  // System Prompt：包含所有模块的 instruction
  const allInstructions = [...systemMods, ...outputMods].map(m => m.instruction).join('\n\n');

  // 输出模块区的模块key
  const outputKeys = outputMods.map(m => m.key);

  // 生成模块标签对照表
  const labelList = outputMods.map(m => `- **#${m.label}**：${m.instruction.slice(0, 60)}...`).join('\n');

  const systemPrompt = `你是一位资深的小说剧情结构分析师，精通网文节奏拆解、克苏鲁/仙侠/都市等全题材套路逻辑。你的任务是将小说章节提炼为极致精简的"剧情点调用卡"。

铁律：
1. 变量占位原则：严禁出现章节中的具体名字。所有具体人名、地名、物品、功法、组织必须使用【】包裹并抽象化。
2. 输出格式：使用 Markdown 纯文本格式输出，每个剧情点用清晰的分隔线隔开。
3. 标题使用标准的 Markdown 语法：用 # 表示一级标题，## 表示二级标题，以此类推。严禁使用 ## # 这种重复叠加的标题符号。
4. 如果本章纯属日常过渡、设定说明或无意义注水，且无实质冲突或转折，输出"无实质剧情点"。
5. 语言：保持中文输出。

${allInstructions}`;

  const userPrompt = `请阅读以下网文章节，按上述规则提炼剧情点。

输出模块清单（每个模块对应一个 #标题，全部属于同一个剧情点）：
${labelList}

输出要求：
- 使用 Markdown 格式
- 一个章节默认只提炼一个剧情点，该剧情点包含上面所有模块的内容
- 同一个剧情点内的不同模块之间**不需要任何分隔符**，连续输出即可
- 只有当章节内存在多个独立事件/转折时，才用 --- 分隔为多个剧情点
- 标题用 # 开头（如：# 评分）
- 严禁输出 JSON 格式
- 严禁使用 ## # 这种叠加标题

章节内容：

${chapterContent}`;

  return { systemPrompt, userPrompt, outputKeys };
}

/**
 * 清理AI返回文本中的格式问题
 * 1. 将 ## #、### # 等叠加标题替换为标准 #
 * 2. 清理多余空行
 */
export function cleanAiResponse(text: string): string {
  if (!text) return '';
  return text
    // 将 ## #、### #、#### # 等叠加标题替换为标准 #
    .replace(/^#+\s*#/gm, '#')
    // 清理连续3个以上的空行
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/**
 * 将AI返回的文本按 --- 分隔线拆分为单个剧情点
 * 返回文本数组，每个元素是一个剧情点的Markdown内容
 */
export function splitResults(text: string): string[] {
  if (!text || text.trim() === '' || text.trim() === '无实质剧情点') return [];
  const parts = text.split(/\n?---+\n?/).map(s => s.trim()).filter(s => s.length > 0);
  return parts.length > 0 ? parts : [text.trim()];
}
