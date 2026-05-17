/**
 * 通用 AI 模型调用工具 - 前端直接调用模型 API
 * 从 api_settings_v2 读取用户配置的模型，发送请求
 */

export interface AIModelConfig {
  id: string;
  name: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export function getEnabledModels(): { id: string; name: string; provider: string }[] {
  try {
    const raw = localStorage.getItem('api_settings_v2');
    if (!raw) return [];
    const data = JSON.parse(raw);
    return (data.models || [])
      .filter((m: AIModelConfig) => m.enabled)
      .map((m: AIModelConfig) => ({ id: m.id, name: m.name, provider: m.provider || '' }));
  } catch { return []; }
}

export function getDefaultModelId(): string {
  const models = getEnabledModels();
  return models[0]?.id || '';
}

/**
 * 非流式调用
 */
export async function callModelAPI(content: string, modelId?: string): Promise<string> {
  try {
    const raw = localStorage.getItem('api_settings_v2');
    if (!raw) return '【错误】未配置模型，请先在模型管理中配置。';

    const data = JSON.parse(raw);
    const targetId = modelId || getDefaultModelId();
    const model: AIModelConfig | undefined = (data.models || []).find(
      (m: AIModelConfig) => m.id === targetId && m.enabled
    );

    if (!model) return '【错误】选中的模型未找到或未启用。';
    if (!model.baseUrl || !model.apiKey) return '【错误】模型配置不完整，缺少 Base URL 或 API Key。';

    const baseUrl = model.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId || model.id,
        messages: [{ role: 'user', content }],
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return `【错误】模型请求失败 (${response.status}): ${err.slice(0, 200)}`;
    }

    const result = await response.json();
    const rawText = result.choices?.[0]?.message?.content || '';
    if (!rawText) return '【错误】模型返回内容为空。';
    // 清理文本格式
    return cleanStreamText(rawText);
  } catch (err: any) {
    return `【错误】请求异常: ${err.message || String(err)}`;
  }
}

/**
 * 流式调用 - 前端直接调用模型 API
 * 流式内容通过 DOM 元素 ID 直接显示
 */
export async function callModelAPIStream(
  content: string,
  modelId?: string,
  signal?: AbortSignal,
  onChunk?: (text: string, isDone: boolean) => void
): Promise<string> {
  try {
    const raw = localStorage.getItem('api_settings_v2');
    if (!raw) return '【错误】未配置模型，请先在模型管理中配置。';

    const data = JSON.parse(raw);
    const targetId = modelId || getDefaultModelId();
    const model: AIModelConfig | undefined = (data.models || []).find(
      (m: AIModelConfig) => m.id === targetId && m.enabled
    );

    if (!model) return '【错误】选中的模型未找到或未启用。';
    if (!model.baseUrl || !model.apiKey) return '【错误】模型配置不完整，缺少 Base URL 或 API Key。';

    const baseUrl = model.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.modelId || model.id,
        messages: [{ role: 'user', content }],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      return `【错误】模型请求失败 (${response.status}): ${err.slice(0, 200)}`;
    }

    return await readStreamChunks(response, onChunk);
  } catch (err: any) {
    if (err.name === 'AbortError') return '【已终止】';
    return `【错误】请求异常: ${err.message || String(err)}`;
  }
}

/**
 * 流式读取响应内容
 * 将数据写入 DOM 元素 #extract-stream-output（如果存在）
 * 返回前进行文本清理（去除 ## # 等叠加标题）
 */
async function readStreamChunks(
  response: Response,
  onChunk?: (text: string, isDone: boolean) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content
            || parsed.choices?.[0]?.text
            || parsed.choices?.[0]?.message?.content
            || '';

          if (content) {
            fullText += content;
            // 写入 DOM（显示原始文本，流式效果更自然）
            const el = document.getElementById('extract-stream-output');
            if (el) el.textContent = fullText;
            // 回调
            if (onChunk) onChunk(fullText, false);
          }
        } catch { /* ignore parse errors */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 返回前清理文本格式
  const cleaned = cleanStreamText(fullText);
  if (onChunk) onChunk(cleaned, true);
  return cleaned;
}

/** 清理流式文本中的格式问题 */
function cleanStreamText(text: string): string {
  if (!text) return '';
  return text
    // 将 ## #、### # 等叠加标题替换为标准 #
    .replace(/^#+\s*#/gm, '#')
    // 清理连续4个以上的空行
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}
