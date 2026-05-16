/**
 * 通用 AI 模型调用工具
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

export function getEnabledModels(): { id: string; name: string }[] {
  try {
    const raw = localStorage.getItem('api_settings_v2');
    if (!raw) return [];
    const data = JSON.parse(raw);
    return (data.models || [])
      .filter((m: AIModelConfig) => m.enabled)
      .map((m: AIModelConfig) => ({ id: m.id, name: m.name }));
  } catch { return []; }
}

export function getDefaultModelId(): string {
  const models = getEnabledModels();
  return models[0]?.id || '';
}

export async function callModelAPI(content: string, modelId?: string, signal?: AbortSignal): Promise<string> {
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
      signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`,
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
    return result.choices?.[0]?.message?.content || '【错误】模型返回内容为空。';
  } catch (err: any) {
    return `【错误】请求异常: ${err.message || String(err)}`;
  }
}
