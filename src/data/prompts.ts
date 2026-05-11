/**
 * 提示词数据模块
 * 将 提示词 文件夹中的内容整理为结构化数据
 */

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'creative' | 'archive' | 'writing' | 'system';
  description: string;
  icon: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: PromptVariable[];
}

export interface PromptVariable {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
}

export const PROMPT_CATEGORIES = [
  { id: 'creative', name: '创意策划', description: '用于生成创意、大纲、设定等' },
  { id: 'archive', name: '档案设定', description: '用于人物、势力、地点等档案设定' },
  { id: 'writing', name: '创作辅助', description: '用于续写、润色、检测等' },
  { id: 'system', name: '系统规范', description: '创作规范、防漏机制等' },
] as const;

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'creative_whitepaper',
    name: '创意白皮书',
    category: 'creative',
    description: '生成完整的小说创意白皮书，包含核心设定、主角、世界观、主线剧情、爽点设计',
    icon: 'FileText',
    systemPrompt: `你是一位资深网文编辑和创意策划大师，擅长从零构建完整的小说世界观和故事架构。
你的任务是根据用户提供的信息，生成一份专业级的小说创意白皮书。
白皮书必须包含：故事类型、核心创意、一句话梗概、主角设定（基本信息、核心人设、金手指、目标动机）、
世界观（时代背景、力量体系、政治格局）、主要势力、核心人物关系、主线剧情规划、爽点设计、核心设定红线。
输出格式使用Markdown，结构清晰，内容详实有创意。`,
    userPromptTemplate: `请根据以下信息生成一份完整的小说创意白皮书：

【故事类型】{{genre}}
【核心创意要求】{{requirement}}
【偏好标签】{{tags}}
【额外补充】{{extra}}`,
    variables: [
      { key: 'genre', label: '故事类型', placeholder: '如：玄幻、都市、修仙、末世、历史、科幻等', required: true, type: 'select', options: ['玄幻', '都市', '修仙', '末世', '历史', '科幻', '言情', '悬疑', '武侠', '游戏', '军事', '穿越', '重生'] },
      { key: 'requirement', label: '核心创意要求', placeholder: '描述你想要的创意方向，比如：主角是一个能看到别人寿命的普通人...', required: true, type: 'textarea' },
      { key: 'tags', label: '偏好标签', placeholder: '如：系统流、迪化流、无敌流、甜宠、烧脑、轻松搞笑', required: false, type: 'text' },
      { key: 'extra', label: '额外补充', placeholder: '其他补充要求，如：要有甜宠感情线、不要绿帽情节、主角性格要苟...', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'outline_full',
    name: '整书大纲',
    category: 'creative',
    description: '根据创意生成完整的分卷大纲，包含每卷核心事件、章节规划、高潮设计',
    icon: 'ListTree',
    systemPrompt: `你是一位资深网络小说大纲策划师，擅长根据创意构思构建完整的小说大纲。
你的任务是生成一份详细的整书大纲，包含：总体规划（总字数、卷数）、每卷详细规划（卷名、核心事件、卷末高潮）、
每章的标题和核心剧情（100字以内）、爽点/钩子设计。
大纲要有整体节奏感：开局抓人→铺垫升级→小高潮→大高潮→结局。
角色要有成长弧光，世界观逐步展开。每卷至少埋1个伏笔，至少收1个伏笔。`,
    userPromptTemplate: `请根据以下创意生成完整的整书大纲：

【题材类型】{{genre}}
【核心创意】{{idea}}
【全书规模】{{volume}}卷，约{{chapters}}章，预计{{wordCount}}万字
【风格偏好】{{style}}

要求：
1. 每卷包含：卷名、核心事件、卷末高潮
2. 每章包含：章节标题、核心剧情（100字以内）、爽点/钩子
3. 大纲要有整体节奏感
4. 每卷至少埋1个伏笔，收1个伏笔`,
    variables: [
      { key: 'genre', label: '题材类型', placeholder: '如：玄幻、都市、修仙等', required: true, type: 'select', options: ['玄幻', '都市', '修仙', '末世', '历史', '科幻', '言情', '悬疑', '武侠', '游戏', '军事'] },
      { key: 'idea', label: '核心创意', placeholder: '描述你的小说核心创意', required: true, type: 'textarea' },
      { key: 'volume', label: '卷数', placeholder: '3', required: true, type: 'text' },
      { key: 'chapters', label: '总章数', placeholder: '100', required: false, type: 'text' },
      { key: 'wordCount', label: '预计万字', placeholder: '200', required: false, type: 'text' },
      { key: 'style', label: '风格偏好', placeholder: '如：轻松幽默、热血激昂、暗黑深沉', required: false, type: 'text' },
    ],
  },
  {
    id: 'outline_detail',
    name: '细纲生成',
    category: 'creative',
    description: '根据大纲生成连续5章的详细细纲，包含剧情概括、爽点设计、伏笔、章末钩子',
    icon: 'FileText',
    systemPrompt: `你是一位资深网文细纲策划师，擅长将大纲转化为可指导正文创作的详细细纲。
你的任务是根据提供的大纲和前文信息，生成连续5章的详细细纲。
每章细纲必须包含：章节名（吸睛标题）、场景、核心人物、剧情概括（一段话）、核心事件点（3个）、
爽点设计（类型、描述、效果）、涉及的伏笔（埋/收）、章末钩子（类型、内容）、预估字数、本章节奏类型。
注意节奏控制：每5章必须有至少2章是支线/日常/伏笔/过渡章，避免全程高潮。
核心事件至少需要20-30章来展开，每5章只应推进该事件的某个阶段。`,
    userPromptTemplate: `请根据以下信息生成5章详细细纲：

【前文概要】{{context}}
【当前进度】{{progress}}
【大纲参考】{{outline}}
【用户要求】{{requirement}}`,
    variables: [
      { key: 'context', label: '前文概要', placeholder: '描述之前发生的剧情，帮助AI衔接', required: false, type: 'textarea' },
      { key: 'progress', label: '当前进度', placeholder: '如：第一卷第15章，已建立主角身份', required: false, type: 'text' },
      { key: 'outline', label: '大纲参考', placeholder: '提供当前卷的大纲作为参考', required: false, type: 'textarea' },
      { key: 'requirement', label: '用户要求', placeholder: '额外要求，如：要引入新反派、感情线要有进展', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'character_design',
    name: '人物设计',
    category: 'archive',
    description: '设计完整的人物档案，包含基本信息、人设核心、性格、能力、外貌、关系',
    icon: 'Users',
    systemPrompt: `你是一位资深的人物设定师，擅长创造立体饱满的小说人物。
你的任务是根据用户提供的信息，生成一份完整的人物档案。
档案包含：基本信息（姓名、年龄、身份）、人设核心（表象vs真相）、性格特征（3-5个）、
能力设定（主要能力、武力等级、特殊技能）、外貌描写、口头禅/标志性表现、人物关系表、情感弧光（初期→中期→后期→结局）。
人物要有层次感，避免脸谱化，每个人物都应该有内在矛盾和成长空间。`,
    userPromptTemplate: `请设计以下人物：

【人物定位】{{role}}
【故事背景】{{storyContext}}
【基本要求】{{requirement}}
【风格偏好】{{style}}`,
    variables: [
      { key: 'role', label: '人物定位', placeholder: '如：主角、女主、反派、配角等', required: true, type: 'select', options: ['主角', '女主', '反派', '师父/导师', '挚友', '宿敌', '神秘人', '配角'] },
      { key: 'storyContext', label: '故事背景', placeholder: '描述故事的世界观和背景设定', required: false, type: 'textarea' },
      { key: 'requirement', label: '基本要求', placeholder: '如：年龄20岁左右、性格腹黑但表面温和、有特殊能力...', required: true, type: 'textarea' },
      { key: 'style', label: '风格偏好', placeholder: '如：要反差萌、要有 tragic backstory', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'world_design',
    name: '世界观设计',
    category: 'archive',
    description: '设计完整的世界观，包含时代背景、力量体系、政治格局、势力分布、地理环境',
    icon: 'Globe',
    systemPrompt: `你是一位资深的世界观架构师，擅长构建宏大且自洽的幻想世界。
你的任务是根据用户提供的信息，生成一份完整的世界观设定。
包含：时代背景（历史时期、技术水平）、力量体系（修炼/魔法/科技等分级和规则）、
政治格局（国家/势力关系）、地理环境（主要区域和地点）、社会文化（风俗、信仰、阶级）。
世界观要有内在逻辑，各子系统之间要自洽。`,
    userPromptTemplate: `请设计以下世界观：

【世界类型】{{worldType}}
【故事题材】{{genre}}
【核心需求】{{requirement}}
【参考作品】{{reference}}`,
    variables: [
      { key: 'worldType', label: '世界类型', placeholder: '如：东方玄幻、西方魔幻、科幻星际、末日废土、古代历史', required: true, type: 'select', options: ['东方玄幻', '西方魔幻', '科幻星际', '末日废土', '古代历史', '现代都市', '赛博朋克', '修仙世界'] },
      { key: 'genre', label: '故事题材', placeholder: '如：升级流、系统流、迪化流', required: false, type: 'text' },
      { key: 'requirement', label: '核心需求', placeholder: '如：要有九重天的修炼体系、三界争霸格局...', required: true, type: 'textarea' },
      { key: 'reference', label: '参考作品', placeholder: '如：参考《斗破苍穹》的宗门体系', required: false, type: 'text' },
    ],
  },
  {
    id: 'power_system',
    name: '力量体系设计',
    category: 'archive',
    description: '设计修炼/魔法/超能力等力量体系，包含等级划分、晋升规则、能力表现',
    icon: 'Zap',
    systemPrompt: `你是一位资深的战力体系设计师，擅长设计富有层次感和想象力的力量体系。
你的任务是设计一套完整的等级/力量体系，包含：等级名称和划分（每个等级的特点）、
晋升条件和机制（如何升级）、能力表现（每个等级的战斗力和特殊能力）、
限制和代价（体系的核心约束）、与其他体系的互动。
体系要有成长性，每个等级之间的差距要明显但合理。`,
    userPromptTemplate: `请设计以下力量体系：

【体系类型】{{type}}
【世界背景】{{context}}
【设计要求】{{requirement}}
【等级数量】{{levels}}`,
    variables: [
      { key: 'type', label: '体系类型', placeholder: '如：修仙（炼气-筑基-金丹...）、魔法（学徒-法师-大法师...）、超能力等级', required: true, type: 'select', options: ['修仙境界', '魔法体系', '斗气体系', '超能力体系', '科技强化', '基因进化', '武道体系', '异能体系'] },
      { key: 'context', label: '世界背景', placeholder: '简述世界背景', required: false, type: 'textarea' },
      { key: 'requirement', label: '设计要求', placeholder: '如：每个大境界分初期、中期、后期、圆满', required: true, type: 'textarea' },
      { key: 'levels', label: '等级数量', placeholder: '如：9个大境界', required: false, type: 'text' },
    ],
  },
  {
    id: 'writing_continue',
    name: 'AI续写章节',
    category: 'writing',
    description: '根据前文和细纲自动续写新章节正文，保持风格一致',
    icon: 'PenTool',
    systemPrompt: `你是一位资深网络小说作家，擅长模仿指定风格进行章节续写。
你的任务是根据提供的前文和细纲，续写新章节正文。
写作要求：对话占比≥70%，每段对话独占一行，对话前后有空行。
每500字1个小转折，每1500字1个爽点，每章至少1个高光时刻+1个章末钩子。
禁止使用括号吐槽、引号滥用、"首先/其次/最后"式总结、形容词堆砌。
要增加环境小动作、生理反应、语气词、网文化短句。`,
    userPromptTemplate: `请根据以下信息续写章节：

【前文摘要】{{context}}
【本章细纲】{{outline}}
【人物状态】{{characters}}
【字数要求】{{wordCount}}字
【特殊要求】{{requirement}}`,
    variables: [
      { key: 'context', label: '前文摘要', placeholder: '提供前3-5章的剧情摘要', required: true, type: 'textarea' },
      { key: 'outline', label: '本章细纲', placeholder: '本章的详细细纲', required: true, type: 'textarea' },
      { key: 'characters', label: '人物状态', placeholder: '当前主要人物的状态和位置', required: false, type: 'textarea' },
      { key: 'wordCount', label: '字数要求', placeholder: '3000', required: false, type: 'text' },
      { key: 'requirement', label: '特殊要求', placeholder: '额外要求', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'writing_humanize',
    name: '去AI化润色',
    category: 'writing',
    description: '将AI生成的文本润色为自然流畅的人写风格',
    icon: 'Wand2',
    systemPrompt: `你是一位资深的网文编辑，专门负责将AI痕迹过重的文本润色为自然的人写风格。
你的任务是：
1. 删除所有AI臭词（"穿透时光"、"心中激荡"、"某种意义上"等）
2. 将"首先/其次/最后"式总结改为自然叙述
3. 减少形容词堆砌，增加环境小动作和生理反应
4. 增加语气词点缀（哎、嗯、切、啧）
5. 将长句改为网文化短句
6. 对话前后加空行，每段对话独占一行
7. 保持原文剧情不变，只改变表达方式`,
    userPromptTemplate: `请对以下文本进行去AI化润色：

【原文】
{{text}}

【额外要求】
{{requirement}}`,
    variables: [
      { key: 'text', label: '原文', placeholder: '粘贴需要润色的AI生成文本', required: true, type: 'textarea' },
      { key: 'requirement', label: '额外要求', placeholder: '如：风格要轻松幽默、要热血激昂', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'writing_polish',
    name: '毒点检测修改',
    category: 'writing',
    description: '检测并修改小说中的毒点，提升可读性',
    icon: 'ShieldAlert',
    systemPrompt: `你是一位资深网文编辑，专门负责检测和修复小说中的"毒点"。
常见毒点包括：降智行为、逻辑漏洞、人设崩塌、绿帽情节、过度憋屈、
战力崩坏、时间线混乱、称谓不一致、伏笔逻辑错误等。
你的任务是逐段扫描文本，标注所有发现的毒点（标注严重度：🔴严重/🟡中度/🟢轻度），
对🔴和🟡问题直接给出修改建议，对🟢问题标注但不做修改。`,
    userPromptTemplate: `请检测以下文本中的毒点：

【待检测文本】
{{text}}

【前文背景】
{{context}}

【核心设定红线】
{{redlines}}`,
    variables: [
      { key: 'text', label: '待检测文本', placeholder: '粘贴需要检测的章节正文', required: true, type: 'textarea' },
      { key: 'context', label: '前文背景', placeholder: '提供前文剧情摘要作为参考', required: false, type: 'textarea' },
      { key: 'redlines', label: '核心设定红线', placeholder: '如：主角的真实身份不能暴露、不能有绿帽情节', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'plot_twist',
    name: '反转/悬念设计',
    category: 'creative',
    description: '为剧情设计巧妙的反转和悬念，包含伏笔埋设和回收方案',
    icon: 'Shuffle',
    systemPrompt: `你是一位资深的情节设计师，擅长设计令人拍案叫绝的剧情反转和悬念。
你的任务是：
1. 根据当前剧情走向，设计3-5个可能的反转方向
2. 每个反转包含：反转类型（身份反转、真相反转、局势反转等）、
   反转触发条件、反转前铺垫方案、反转效果预测
3. 设计相应的伏笔埋设和回收方案
4. 确保反转符合已有设定，不崩人设和战力体系`,
    userPromptTemplate: `请为以下剧情设计反转/悬念：

【当前剧情】{{currentPlot}}
【已埋伏笔】{{foreshadowing}}
【核心设定】{{settings}}
【设计方向】{{direction}}`,
    variables: [
      { key: 'currentPlot', label: '当前剧情', placeholder: '描述当前的剧情进展', required: true, type: 'textarea' },
      { key: 'foreshadowing', label: '已埋伏笔', placeholder: '列出已经埋下的伏笔', required: false, type: 'textarea' },
      { key: 'settings', label: '核心设定', placeholder: '世界观和核心设定概要', required: false, type: 'textarea' },
      { key: 'direction', label: '设计方向', placeholder: '如：想要一个身份大反转、感情线要有波折', required: false, type: 'textarea' },
    ],
  },
];

/** 获取指定类别的提示词模板 */
export function getPromptsByCategory(categoryId: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((p) => p.category === categoryId);
}

/** 根据ID获取提示词模板 */
export function getPromptById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((p) => p.id === id);
}

/** 构建最终的prompt文本 */
export function buildPrompt(
  template: PromptTemplate,
  values: Record<string, string>
): { systemPrompt: string; userPrompt: string } {
  let userPrompt = template.userPromptTemplate;
  for (const [key, value] of Object.entries(values)) {
    userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value || '（未提供）');
  }
  // 清理未替换的变量
  userPrompt = userPrompt.replace(/{{[^}]+}}/g, '（未提供）');
  return {
    systemPrompt: template.systemPrompt,
    userPrompt,
  };
}
