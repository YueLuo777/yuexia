/**
 * 全题材男频核心逻辑全量标签库
 * 四大分类，预置为默认标签
 */

export interface DefaultTag {
  name: string;
  category: string;
}

// 分类颜色映射
export const TAG_CATEGORY_COLORS: Record<string, string> = {
  '主角设定与开局逻辑': '#EF4444',   // 红
  '剧情推进与爽点逻辑': '#F97316',    // 橙
  '社交交互与情感反馈': '#3B82F6',    // 蓝
  '场景、结构与氛围锚点': '#10B981',  // 绿
};

// 默认标签库
export const DEFAULT_TAGS: DefaultTag[] = [
  // ═══════════════════════════════════════
  // 一、主角设定与开局逻辑
  // ═══════════════════════════════════════
  { name: '#隐藏大佬', category: '主角设定与开局逻辑' },
  { name: '#凡人流基调', category: '主角设定与开局逻辑' },
  { name: '#受气蛰伏', category: '主角设定与开局逻辑' },
  { name: '#技术降维', category: '主角设定与开局逻辑' },
  { name: '#修仙百艺', category: '主角设定与开局逻辑' },
  { name: '#资源无限', category: '主角设定与开局逻辑' },
  { name: '#先知优势', category: '主角设定与开局逻辑' },
  { name: '#挂机无敌', category: '主角设定与开局逻辑' },
  { name: '#物资碾压', category: '主角设定与开局逻辑' },
  { name: '#规则掌控', category: '主角设定与开局逻辑' },
  { name: '#硬核设定推演', category: '主角设定与开局逻辑' },
  { name: '#养成经营', category: '主角设定与开局逻辑' },
  { name: '#形态切换', category: '主角设定与开局逻辑' },
  { name: '#幕后操盘', category: '主角设定与开局逻辑' },
  { name: '#反派视角', category: '主角设定与开局逻辑' },
  { name: '#苟道长存', category: '主角设定与开局逻辑' },
  { name: '#沙雕反套路', category: '主角设定与开局逻辑' },
  { name: '#猎奇缝合怪', category: '主角设定与开局逻辑' },

  // ═══════════════════════════════════════
  // 二、剧情推进与爽点逻辑 - 身份与地位爆发
  // ═══════════════════════════════════════
  { name: '#扮猪吃虎', category: '剧情推进与爽点逻辑' },
  { name: '#光速打脸', category: '剧情推进与爽点逻辑' },
  { name: '#马甲掉落', category: '剧情推进与爽点逻辑' },
  { name: '#身份摊牌', category: '剧情推进与爽点逻辑' },
  { name: '#被迫显圣', category: '剧情推进与爽点逻辑' },
  { name: '#大佬集结', category: '剧情推进与爽点逻辑' },
  { name: '#路人围观', category: '剧情推进与爽点逻辑' },

  // 暴力执行与因果报应
  { name: '#满级碾压', category: '剧情推进与爽点逻辑' },
  { name: '#杀伐果断', category: '剧情推进与爽点逻辑' },
  { name: '#断绝关系', category: '剧情推进与爽点逻辑' },
  { name: '#骨灰扬了', category: '剧情推进与爽点逻辑' },
  { name: '#视觉奇观', category: '剧情推进与爽点逻辑' },
  { name: '#杀人诛心', category: '剧情推进与爽点逻辑' },
  { name: '#暴力拆迁', category: '剧情推进与爽点逻辑' },
  { name: '#原地突破', category: '剧情推进与爽点逻辑' },
  { name: '#越级反杀', category: '剧情推进与爽点逻辑' },
  { name: '#大义灭亲', category: '剧情推进与爽点逻辑' },
  { name: '#时间静止', category: '剧情推进与爽点逻辑' },

  // 智斗与史诗格局
  { name: '#智斗破局', category: '剧情推进与爽点逻辑' },
  { name: '#伏笔千里', category: '剧情推进与爽点逻辑' },
  { name: '#势力博弈', category: '剧情推进与爽点逻辑' },
  { name: '#大道争锋', category: '剧情推进与爽点逻辑' },
  { name: '#逻辑闭环', category: '剧情推进与爽点逻辑' },
  { name: '#道心铸就', category: '剧情推进与爽点逻辑' },

  // 资源收割与先发制人
  { name: '#信息差套利', category: '剧情推进与爽点逻辑' },
  { name: '#截胡机缘', category: '剧情推进与爽点逻辑' },
  { name: '#气运掠夺', category: '剧情推进与爽点逻辑' },
  { name: '#因祸得福', category: '剧情推进与爽点逻辑' },
  { name: '#摸尸体发财', category: '剧情推进与爽点逻辑' },
  { name: '#反向金手指', category: '剧情推进与爽点逻辑' },

  // ═══════════════════════════════════════
  // 三、社交交互与情感反馈
  // ═══════════════════════════════════════
  { name: '#群像出彩', category: '社交交互与情感反馈' },
  { name: '#道友论道', category: '社交交互与情感反馈' },
  { name: '#美女震惊', category: '社交交互与情感反馈' },
  { name: '#倒贴主动', category: '社交交互与情感反馈' },
  { name: '#暧昧拉扯', category: '社交交互与情感反馈' },
  { name: '#英雄救美', category: '社交交互与情感反馈' },
  { name: '#前任后悔', category: '社交交互与情感反馈' },
  { name: '#修罗场', category: '社交交互与情感反馈' },
  { name: '#自我攻略', category: '社交交互与情感反馈' },
  { name: '#高冷女倒追', category: '社交交互与情感反馈' },
  { name: '#反派洗白', category: '社交交互与情感反馈' },
  { name: '#疯批美人', category: '社交交互与情感反馈' },
  { name: '#反向带孝子', category: '社交交互与情感反馈' },
  { name: '#偷听心声', category: '社交交互与情感反馈' },
  { name: '#全员迪化', category: '社交交互与情感反馈' },
  { name: '#狗粮暴击', category: '社交交互与情感反馈' },
  { name: '#道德绑架', category: '社交交互与情感反馈' },
  { name: '#无女主', category: '社交交互与情感反馈' },

  // ═══════════════════════════════════════
  // 四、场景、结构与氛围锚点 - 经典场景
  // ═══════════════════════════════════════
  { name: '#拍卖会风波', category: '场景、结构与氛围锚点' },
  { name: '#秘境夺宝', category: '场景、结构与氛围锚点' },
  { name: '#宗门/家族大比', category: '场景、结构与氛围锚点' },
  { name: '#论道大会/朝堂对峙', category: '场景、结构与氛围锚点' },
  { name: '#同学寿宴聚会', category: '场景、结构与氛围锚点' },

  // 剧情进度结构
  { name: '#危机铺垫', category: '场景、结构与氛围锚点' },
  { name: '#高潮爆发', category: '场景、结构与氛围锚点' },
  { name: '#过渡日常', category: '场景、结构与氛围锚点' },
  { name: '#悬念断章', category: '场景、结构与氛围锚点' },

  // 氛围与基调
  { name: '#宏大史诗', category: '场景、结构与氛围锚点' },
  { name: '#极度压抑', category: '场景、结构与氛围锚点' },
  { name: '#轻松沙雕', category: '场景、结构与氛围锚点' },
  { name: '#悲壮惨烈', category: '场景、结构与氛围锚点' },
  { name: '#悬疑惊悚', category: '场景、结构与氛围锚点' },
];

// 分类列表
export const TAG_CATEGORIES = [
  '主角设定与开局逻辑',
  '剧情推进与爽点逻辑',
  '社交交互与情感反馈',
  '场景、结构与氛围锚点',
];

// 获取分类颜色
export function getCategoryColor(category: string): string {
  return TAG_CATEGORY_COLORS[category] || '#6B7280';
}
