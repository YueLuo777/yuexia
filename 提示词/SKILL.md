---
name: novel-project-init
description: 根据白皮书自动创建完整的AI辅助小说创作项目，包含目录结构、工作流、设定模板
---

# 小说项目初始化 Skill

> **用途**：根据用户提供的小说白皮书，自动创建完整的AI辅助小说创作项目。

---

## 使用前提

1. 用户需要准备一份**小说白皮书**（格式见下方 [白皮书规范](#白皮书规范)）
2. 用户需要指定**项目目录**（即小说项目的根目录路径）

---

## 执行步骤

### 步骤1: 读取白皮书
读取用户提供的白皮书文件，提取以下关键信息：

| 字段 | 必填 | 说明 |
|------|------|------|
| 书名 | ✅ | 小说正式名称 |
| 主角姓名 | ✅ | 主角的名字 |
| 故事类型 | ✅ | 如都市、玄幻、历史、末世等 |
| 核心创意 | ✅ | 一句话梗概 |
| 主角人设 | ✅ | 核心性格特征 |
| 世界观 | ⭕ | 时代背景、力量体系等 |
| 主要势力 | ⭕ | 主要组织/国家/势力 |
| 重要配角 | ⭕ | 女主、反派等关键人物 |
| 核心矛盾 | ⭕ | 主线冲突 |
| 整书大纲 | ⭕ | 分卷大纲 |
| 核心设定红线 | ⭕ | 创作禁忌/必须遵守的设定 |

### 步骤2: 创建目录结构
// turbo
在指定的项目目录下创建以下目录结构：

```
[项目目录]/
├── .agent/
│   └── workflows/          # 工作流文件
├── 00_核心设定/            # 白皮书、风格指南、大纲
├── 01_人物列表库/          # 人物档案
├── 02_势力设定库/          # 势力档案
├── 03_地图库/              # 地点档案
├── 04_等级划分库/          # 等级体系（可选）
├── 05_重要物品库/          # 物品档案
├── 06_大纲细纲库/          # 章节细纲
├── 07_伏笔库/              # 伏笔管理
├── 08_更新记录/            # 变更日志
├── 09_剧情摘要库/          # 前文摘要系统
├── 正文/                   # 章节正文
│   └── 卷一_[卷名]/        # 按卷分目录
├── 正文_修改版/            # 修改后的章节副本
└── scripts/                # 全局辅助脚本
```

### 步骤3: 创建工作流文件与基础脚本
// turbo
从 `templates/scripts/` 复制内置脚本：
- `clean_punctuation.py` → 复制到 `scripts/clean_punctuation.py`

从 `templates/workflows/` 复制以下工作流文件到 `.agent/workflows/`：
- `一键AI续写章节_v4.0.md` - 章节续写（核心工作流）
- `一键生成细纲.md` - 细纲生成
- `一键毒点检测修改.md` - 毒点检测
- `一键章节发布.md` - 章节综合发布与状态摘要提取
- `一键字数统计.md` - 字数统计
- `一键去AI化.md` - 去AI化润色
- `一键导入已有小说.md` - 导入已有小说
- `一键初始化摘要系统.md` - 摘要系统初始化
- `全局创作规范.md` - 全局规范
- `humanize-text.md` - 文本人性化

**变量替换**：在复制过程中，将模板中的占位符替换为实际值：
- `{{书名}}` → 从白皮书提取的书名
- `{{主角名}}` → 从白皮书提取的主角姓名
- `{{核心人设}}` → 从白皮书提取的主角核心人设

### 步骤4: 填充核心设定
// turbo
在 `00_核心设定/` 目录下创建以下文件：

#### 4.1 创意白皮书.md
将用户提供的白皮书内容整理为标准格式保存。

#### 4.2 写作风格指南.md
根据白皮书的类型和风格描述生成风格指南。

#### 4.3 整书大纲.md
从白皮书中提取整书大纲，如无则创建空模板。

#### 4.4 时间线发展记录.md
根据白皮书提取最初的剧情启动年限与人物年龄基点，创建初始时间轴防崩盘文档。

#### 4.5 审核规则.md（动态生成）
根据白皮书中的**故事类型**字段，从 `templates/audit_rules_library.md` 中选取对应的审核规则，合并为项目专属的审核文件。

**生成流程**：
1. 读取白皮书，识别小说类型标签（如"官场+重生+年代"）
2. 从规则库中选取：**通用规则(T1-T8)** + **对应类型专属规则** + **跨类型补充规则（按需）**
3. 根据白皮书中的世界观/设定特殊性，**追加项目专属的自定义检查项**
4. 生成 `00_核心设定/审核规则.md`，供 `一键生成细纲` 和 `一键AI续写章节` 的自动审核步骤读取

**类型→规则映射参考**：
| 小说类型组合 | 选取规则 |
|-------------|----------|
| 官场+重生+年代 | T全 + GC1-5 + LS1-5 + CZ1-4 |
| 古代言情+宫斗 | T全 + GY1-6 + QG1-3 |
| 修仙+系统 | T全 + XX1-6 + XT1-4 + GUA1-3 |
| 都市+甜宠 | T全 + DS1-5 + XA1-6 + QG1-3 |
| 军事+谍战+历史 | T全 + JS1-5 + LS1-5 |
| 末日+系统 | T全 + MD1-3 + XT1-4 + GUA1-3 |
| 悬疑+推理 | T全 + XY1-4 |
| 女尊+女强 | T全 + NQ1-3 + QG1-3 |
| 穿越+古言 | T全 + CZ1-4 + GY1-6 + QG1-3 |

> [!IMPORTANT]
> 如白皮书中有**独特设定**（如特殊功法体系、架空历史规则、自创社会制度等），
> 应在审核规则文件末尾追加**项目专属检查项**，确保这些独特设定不会在创作中被遗忘或违反。

### 步骤5: 创建首批档案
// turbo
根据白皮书中的人物、势力、地点信息，创建初始档案：

#### 5.1 人物档案
- 在 `01_人物列表库/` 创建 `_人物索引.md`
- 为每个主要人物创建档案文件（如 `主角_XXX.md`、`女主_XXX.md`）

#### 5.2 势力档案
- 在 `02_势力设定库/` 为每个势力创建档案

#### 5.3 伏笔库初始化
- 在 `07_伏笔库/` 创建 `已埋伏笔.md`、`已收伏笔.md`、`伏笔总表.md`

#### 5.4 剧情摘要库初始化
- 在 `09_剧情摘要库/` 创建 `00_全书剧情主线.md`
- 为每卷创建目录 `卷X_卷名/`

### 步骤6: 全局环境防卡死机制初始化（必执行）
// turbo-all
**【核心保护步骤】** 必须执行以下 PowerShell 脚本，以在 Antigravity 全局环境中部署防卡死补丁。这将生成全局 Knowledge Item (KI)，确保当前项目和用户未来所有其他项目在写入大段中文时，自动采用 PowerShell 分段写入，彻底避免工具超时卡死问题。

```powershell
$kiDir = Join-Path $env:USERPROFILE ".gemini\antigravity\knowledge\file_write_anti_freeze"
New-Item -Path $kiDir -ItemType Directory -Force | Out-Null
New-Item -Path "$kiDir\artifacts" -ItemType Directory -Force | Out-Null

$meta = '{"summary":"文件写入防卡死规范：禁止内置工具写入大块中文文本，统一使用PowerShell分段写入","created":"2026-04-14T00:00:00Z","lastModified":"2026-04-14T00:00:00Z","references":[]}'
[System.IO.File]::WriteAllText("$kiDir\metadata.json", $meta, [System.Text.Encoding]::UTF8)

$rule = @"
# 文件写入防卡死全局规范

## 问题根因
Antigravity 内置的 write_to_file 和 replace_file_content 工具，
在处理超过500个中文字符的内容时，极易出现超时/卡死。

## 强制规则

### 新建大文件（大文本 > 300字）
分2-3段写入，每段不超过1500字：
- 第1段：[System.IO.File]::WriteAllText(`"绝对路径`", `$part1, [System.Text.Encoding]::UTF8)
- 后续段：[System.IO.File]::AppendAllText(`"绝对路径`", `$partN, [System.Text.Encoding]::UTF8)

### 修改已有大文件（大改动 > 300字）
用 ReadAllText + Replace + WriteAllText：
`$content = [System.IO.File]::ReadAllText(`"绝对路径`", [System.Text.Encoding]::UTF8)
`$content = `$content.Replace(`"旧内容`", `"新内容`")
[System.IO.File]::WriteAllText(`"绝对路径`", `$content, [System.Text.Encoding]::UTF8)

### 安全阈值
- write_to_file：仅用于 < 300字 的小文件
- replace_file_content：仅用于 < 300字 的小改动
- 超过300字：一律走 PowerShell run_command
"@
[System.IO.File]::WriteAllText("$kiDir\artifacts\file_write_rule.md", $rule, [System.Text.Encoding]::UTF8)
Write-Host "全局防卡死补丁已部署完成"
```

```

### 步骤7: 执行白皮书深度拓展补丁（核心洗底）
// turbo
**【红线与人设自动注入核心机制】** 当上述目录均建立完毕后，由于常规的字符替换容易遗漏或被 Token 限制截断大纲，**必须实时在项目根目录下生成并执行以下 Python 脚本予以查漏补缺和全覆盖**。此脚本会自动抓取白皮书中的复杂设定，并深度清空、替换 `.agent/workflows/` 下的占位符。

```python
import os, re, glob
def run():
    whitepapers = glob.glob("*白皮书*.md") + glob.glob("创意白皮书.md") + glob.glob("00_核心设定/*白皮书*.md")
    whitepapers = [wp for wp in whitepapers if "补丁" not in wp]
    if not whitepapers:
        print("未找到白皮书，无法打补丁！")
        return
    wp_path = whitepapers[0]
    with open(wp_path, 'r', encoding='utf-8') as f:
        text = f.read()

    def get_block(keywords):
        for kw in keywords:
            pattern = r'(##\s*[^#\n]*?' + kw + r'[^#\n]*\n.*?)(?=\n##\s|$)'
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if match:
                lines = match.group(1).strip().split('\n')
                return '\n'.join(lines[1:]).strip()
        return ""

    outline_content = get_block(["大纲", "整体大纲", "分卷", "核心主线大纲纲要"])
    if outline_content:
        os.makedirs("00_核心设定", exist_ok=True)
        with open(os.path.join("00_核心设定", "整书大纲.md"), "w", encoding="utf-8") as f:
            f.write("# 整书大纲\n\n> 本文件由深度拓展补丁自动从白皮书提取，包含全部剧情脉络。\n\n" + outline_content)

    char_chunk = get_block(["人物设定", "角色", "重要配角", "主角设定"])
    if char_chunk:
        os.makedirs("01_人物列表库", exist_ok=True)
        char_splits = re.split(r'\n#{3,4}\s+', '\n' + char_chunk)
        for c in char_splits[1:]:
            lines = c.strip().split('\n')
            if not lines: continue
            name_line = lines[0].strip()
            name = name_line.split('（')[0].split('(')[0].strip()
            target_path = os.path.join("01_人物列表库", f"{name}.md")
            if os.path.exists(target_path) and os.path.getsize(target_path) > 500:
                continue
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(f"# {name_line}\n\n" + "\n".join(lines[1:]).strip())

    world_chunk = get_block(["世界观设定", "主要势力", "核心设定", "世界观"])
    if world_chunk:
        os.makedirs("02_势力设定库", exist_ok=True)
        with open(os.path.join("02_势力设定库", "全量世界观与势力备份.md"), "w", encoding="utf-8") as f:
            f.write("# 世界观与势力设定\n\n" + world_chunk)

    redline_text = get_block(["红线", "核心设定红线"])
    redline_text = redline_text if redline_text else "依据白皮书最高指示严格执行。"
    taboo_text = get_block(["禁忌", "写作禁忌", "避坑指南"])
    taboo_text = taboo_text if taboo_text else "禁止降智，禁止绿帽，禁止憋屈太久。"

    redline_formatted = "\n".join("> " + line for line in redline_text.split("\n") if line.strip())
    taboo_lines = [line.strip() for line in taboo_text.split("\n") if line.strip()]
    taboo_formatted = "\n".join("> - ❌ " + (line[2:] if line.lower().startswith(('1.', '2.', '3.')) else line) for line in taboo_lines)
    
    workflow_dir = os.path.join(".agent", "workflows")
    if os.path.exists(workflow_dir):
        for md_file in glob.glob(os.path.join(workflow_dir, "*.md")):
            with open(md_file, "r", encoding="utf-8") as f:
                w_text = f.read()
            original_text = w_text
            w_text = re.sub(r'-\s*身份秘密.*?(\n|$)', '', w_text)
            w_text = re.sub(r'>\s*-\s*系统/金手指保密规则.*?(\n|$)', '', w_text)
            w_text = re.sub(r'>\s*-\s*人物关系限制.*?(\n|$)', '', w_text)
            w_text = re.sub(r'>\s*-\s*世界观硬性规则.*?(\n|$)', '', w_text)

            w_text = re.sub(r'>\s*\*\*请在此处填写本书的核心设定红线，例如：\*\*\n(>\s*>\s*)?', f'> 【已加载项目专属红线】\n{redline_formatted}\n', w_text)
            w_text = re.sub(r'>\s*\[请填写本书的核心设定红线，例如：\]', f'> 【已加载项目专属红线】\n{redline_formatted}', w_text)
            w_text = re.sub(r'>\s*-\s*❌\s*\[请填写本书的写作禁忌1\][^\n]*\n', '', w_text)
            w_text = re.sub(r'>\s*-\s*❌\s*\[请填写本书的写作禁忌2\][^\n]*\n', f'{taboo_formatted}\n', w_text)
            w_text = re.sub(r'\[请填写本书的写作禁忌\]', '【已加载项目专属禁忌】', w_text)
                
            if w_text != original_text:
                with open(md_file, "w", encoding="utf-8") as f:
                    f.write(w_text)
    print("项目深度拓展与模板占位符清洗完毕！")

if __name__ == "__main__":
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    run()
```
运行结束后，请删除该脚本文件 `patch_engine.py` 并前往下一步。

### 步骤8: 生成初始化报告
输出项目初始化完成报告：

```markdown
# 项目初始化报告

## 基本信息
- **书名**: [书名]
- **主角**: [主角名]
- **类型**: [类型]
- **项目路径**: [路径]
- **初始化时间**: [时间]

## 创建内容统计
- 目录: X个
- 工作流: X个
- 人物档案: X个
- 势力档案: X个

## 下一步建议
1. 补充完善 `00_核心设定/` 中的设定文件
2. 使用 `/一键生成细纲` 生成前5章细纲
3. 使用 `/一键AI续写章节` 开始创作
```

---

## 白皮书规范

用户提供的白皮书应包含以下内容（可自由格式，AI会智能提取）：

### 必填内容

```markdown
# 书名
[小说名称]

## 核心创意
[一句话梗概：本书最核心的卖点是什么]

## 主角设定
- 姓名: [主角名]
- 核心人设: [3-5个关键词]
- 金手指/优势: [特殊能力]
- 目标动机: [核心驱动力]
```

### 可选内容

```markdown
## 世界观
[时代背景、力量体系]

## 主要势力
[主要组织/势力列表]

## 重要配角
[女主、反派等关键人物]

## 整书大纲
[分卷大纲]

## 核心设定红线
[创作中必须遵守的设定，如身份秘密、禁忌行为等]

## 爽点类型
[本书主要的爽点模式]

## 参考作品
[类似风格的参考作品]
```

---

## 目录结构说明

| 目录 | 用途 | 典型文件 |
|------|------|----------|
| `00_核心设定/` | 核心设定文件 | 创意白皮书.md、写作风格指南.md、整书大纲.md |
| `01_人物列表库/` | 人物档案 | 主角_XXX.md、女主_XXX.md、配角_XXX.md |
| `02_势力设定库/` | 势力档案 | 势力名.md |
| `03_地图库/` | 地点档案 | 地点名.md |
| `04_等级划分库/` | 等级体系 | 修炼体系.md（如适用） |
| `05_重要物品库/` | 物品档案 | 物品名.md |
| `06_大纲细纲库/` | 细纲管理 | 第XXX章细纲.md |
| `07_伏笔库/` | 伏笔追踪 | 已埋伏笔.md、已收伏笔.md |
| `08_更新记录/` | 变更日志 | 更新记录_日期.md |
| `09_剧情摘要库/` | 前文摘要 | 00_全书剧情主线.md、卷摘要.md |
| `正文/` | 章节正文 | 00001第1章 章名.md |
| `正文_修改版/` | 修改副本 | 修改后的章节 |

---

## 通用创作规范

### 字数规范
| 类型 | 标准字数 | 弹性范围 |
|------|----------|----------|
| 标准章节 | 3000-3300字 | 2800-3500字 |
| 高潮章节 | 3200-3500字 | 3000-4000字 |
| 过渡章节 | 2800-3000字 | 2500-3300字 |

### 节奏规范
- 每500字：1个小转折或信息点
- 每1500字：1个爽点
- 每章：至少1个高光时刻 + 1个章末钩子

### 对话规范
- 对话占比：≥70%
- 每段对话独占一行
- 对话前后有空行

### 格式规范
- 标题：`第X章 章节名`（无#号）
- 段落：≤5行
- 文件名：`00XXX第X章 章节名_XXXX字.md`

### 去AI化要点
❌ 禁止：
- 括号吐槽（系统提示除外）
- 引号滥用
- "首先/其次/最后"式总结
- 形容词堆砌
- AI臭词（穿透时光、心中激荡、某种意义上等）

✅ 增加：
- 环境小动作
- 生理反应
- 语气词
- 网文化短句

---

## 工作流速查

| 工作流 | 用途 | 触发命令 |
|--------|------|----------|
| 一键AI续写章节 | 续写新章节 | `/一键AI续写章节` |
| 一键生成细纲 | 生成5章细纲 | `/一键生成细纲` |
| 一键毒点检测 | 检测修改毒点 | `/一键毒点检测修改` |
| 一键章节发布 | 综合发布收尾（集成了更新设定与提炼摘要） | `/一键章节发布` |
| 一键字数统计 | 统计字数 | `/一键字数统计` |
| 一键去AI化 | 润色文本 | `/一键去AI化` |
| 一键导入已有小说 | 导入现有章节 | `/一键导入已有小说` |
| 一键初始化摘要系统 | 初始化摘要 | `/一键初始化摘要系统` |

---

## 注意事项

1. **白皮书质量**：白皮书越详细，初始化结果越完整
2. **核心设定红线**：务必在白皮书中明确重要的设定红线
3. **分卷规划**：如有分卷计划，在白皮书中写明
4. **增量创建**：初始化后可随时手动添加新档案
5. **备份建议**：初始化前建议备份目标目录
