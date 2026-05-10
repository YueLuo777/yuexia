import { useState, useEffect } from 'react';
import { X, Cloud, Upload, Download, Loader2, CheckCircle, AlertCircle, Settings } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── MongoDB Atlas Data API 配置 ───
// 从 localStorage 读取配置
function getConfig() {
  return {
    appId: localStorage.getItem('mongo_data_api_app_id') || '',
    apiKey: localStorage.getItem('mongo_data_api_key') || '',
    dataSource: localStorage.getItem('mongo_data_source') || 'Cluster1',
    database: localStorage.getItem('mongo_database') || 'yuexia',
  };
}

function saveConfig(cfg: { appId: string; apiKey: string; dataSource: string; database: string }) {
  localStorage.setItem('mongo_data_api_app_id', cfg.appId);
  localStorage.setItem('mongo_data_api_key', cfg.apiKey);
  localStorage.setItem('mongo_data_source', cfg.dataSource);
  localStorage.setItem('mongo_database', cfg.database);
}

// ─── Data API 调用函数 ───
async function dataApiAction(action: string, collection: string, body: any = {}) {
  const cfg = getConfig();
  if (!cfg.appId || !cfg.apiKey) throw new Error('请先配置 Data API');

  const res = await fetch(`https://data.mongodb-api.com/app/${cfg.appId}/endpoint/data/v1/action/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': cfg.apiKey,
    },
    body: JSON.stringify({
      dataSource: cfg.dataSource,
      database: cfg.database,
      collection,
      ...body,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// 读取本地 SQLite 数据（通过 localStorage 中的数据）
function getLocalData() {
  const novels = JSON.parse(localStorage.getItem('novels_data_v1') || '[]');
  const volumesMap = JSON.parse(localStorage.getItem('volumes_map_v1') || '{}');
  const materials = JSON.parse(localStorage.getItem('materials_data_v1') || '[]');
  const prompts = JSON.parse(localStorage.getItem('prompt_personal') || '[]');
  const apiSettings = JSON.parse(localStorage.getItem('api_settings_v2') || '{}');

  // 从 volumesMap 中提取卷和章节
  const volumes: any[] = [];
  const chapters: any[] = [];
  Object.entries(volumesMap).forEach(([novelId, vols]: [string, any]) => {
    vols.forEach((v: any, vIdx: number) => {
      volumes.push({
        localId: v.id,
        novelId: parseInt(novelId),
        name: v.name,
        sortOrder: vIdx,
        isExpanded: v.isExpanded ?? true,
      });
      v.chapters.forEach((ch: any) => {
        chapters.push({
          localId: ch.id,
          novelId: parseInt(novelId),
          volumeId: v.id,
          title: ch.title || '',
          serialNumber: ch.serialNumber,
          content: ch.content || '',
          wordCount: ch.wordCount || 0,
          status: ch.status || 'draft',
        });
      });
    });
  });

  return { novels, volumes, chapters, materials, prompts, models: apiSettings.models || [] };
}

// 保存云端数据到本地
function saveToLocal(data: any) {
  if (data.novels?.length) localStorage.setItem('novels_data_v1', JSON.stringify(data.novels));
  if (data.materials?.length) localStorage.setItem('materials_data_v1', JSON.stringify(data.materials));
  if (data.prompts?.length) localStorage.setItem('prompt_personal', JSON.stringify(data.prompts));

  // 重建 volumesMap
  if (data.volumes?.length && data.chapters?.length) {
    const volumesMap: Record<string, any[]> = {};
    data.volumes.forEach((v: any) => {
      const novelId = String(v.novelId);
      if (!volumesMap[novelId]) volumesMap[novelId] = [];
      const volChapters = data.chapters
        .filter((ch: any) => ch.volumeId === v.localId)
        .map((ch: any) => ({
          id: ch.localId,
          title: ch.title,
          serialNumber: ch.serialNumber,
          content: ch.content,
          wordCount: ch.wordCount,
          status: ch.status,
        }));
      volumesMap[novelId].push({
        id: v.localId,
        name: v.name,
        isExpanded: v.isExpanded,
        chapters: volChapters,
      });
    });
    localStorage.setItem('volumes_map_v1', JSON.stringify(volumesMap));
  }

  if (data.models?.length) {
    localStorage.setItem('api_settings_v2', JSON.stringify({ models: data.models }));
  }
}

export default function CloudSyncModal({ isOpen, onClose }: CloudSyncModalProps) {
  const [config, setConfig] = useState(getConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pushing' | 'pulling' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>(null);

  const hasConfig = config.appId && config.apiKey;

  // 保存配置
  const handleSaveConfig = () => {
    saveConfig(config);
    setShowConfig(false);
    setStatus('success');
    setMessage('配置已保存');
  };

  // 测试连接
  const handleTest = async () => {
    setStatus('pushing');
    setMessage('正在测试连接...');
    try {
      await dataApiAction('find', 'novels', { filter: {}, limit: 1 });
      setStatus('success');
      setMessage('连接成功！');
    } catch (err: any) {
      setStatus('error');
      setMessage('连接失败: ' + err.message);
    }
  };

  // 上传到云端
  const handlePush = async () => {
    setStatus('pushing');
    setMessage('正在上传到 MongoDB Atlas...');
    setStats(null);

    try {
      const data = getLocalData();

      // 逐个集合：删除旧数据 → 插入新数据
      for (const [collection, docs] of Object.entries(data)) {
        if (!Array.isArray(docs)) continue;
        // 删除全部
        try {
          await dataApiAction('deleteMany', collection, { filter: {} });
        } catch {
          // 集合可能不存在，忽略
        }
        // 插入新数据
        if (docs.length > 0) {
          await dataApiAction('insertMany', collection, { documents: docs });
        }
      }

      const total = Object.values(data).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0);
      setStatus('success');
      setMessage(`上传成功！共 ${total} 条数据`);
      setStats({
        novels: data.novels.length,
        volumes: data.volumes.length,
        chapters: data.chapters.length,
        materials: data.materials.length,
        prompts: data.prompts.length,
        models: data.models.length,
      });
    } catch (err: any) {
      setStatus('error');
      setMessage('上传失败: ' + err.message);
    }
  };

  // 从云端下载
  const handlePull = async () => {
    if (!confirm('从云端恢复将覆盖本地所有数据，是否继续？')) return;

    setStatus('pulling');
    setMessage('正在从 MongoDB Atlas 下载...');
    setStats(null);

    try {
      const collections = ['novels', 'volumes', 'chapters', 'materials', 'prompts', 'models'];
      const data: any = {};

      for (const col of collections) {
        try {
          const res = await dataApiAction('find', col, { filter: {} });
          data[col] = res.documents || [];
        } catch {
          data[col] = []; // 集合可能不存在
        }
      }

      saveToLocal(data);

      const total = collections.reduce((sum, col) => sum + (data[col]?.length || 0), 0);
      setStatus('success');
      setMessage(`恢复成功！共 ${total} 条数据，页面即将刷新`);
      setStats({
        novels: data.novels.length,
        volumes: data.volumes.length,
        chapters: data.chapters.length,
        materials: data.materials.length,
        prompts: data.prompts.length,
        models: data.models.length,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setStatus('error');
      setMessage('恢复失败: ' + err.message);
    }
  };

  // 获取云端统计
  const fetchCloudStats = async () => {
    try {
      const collections = ['novels', 'volumes', 'chapters', 'materials', 'prompts', 'models'];
      const stats: any = {};
      for (const col of collections) {
        try {
          const res = await dataApiAction('aggregate', col, {
            pipeline: [{ $count: 'total' }],
          });
          stats[col] = res.documents?.[0]?.total || 0;
        } catch {
          stats[col] = 0;
        }
      }
      return stats;
    } catch {
      return null;
    }
  };

  // 加载时获取云端统计
  useEffect(() => {
    if (isOpen && hasConfig) {
      fetchCloudStats().then(setStats);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="w-[520px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">云同步</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="配置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 配置面板 */}
          {showConfig && (
            <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">MongoDB Atlas Data API 配置</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data App ID</label>
                  <input
                    type="text"
                    value={config.appId}
                    onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                    placeholder="data-abcdef"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="你的 API Key"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cluster 名称</label>
                    <input
                      type="text"
                      value={config.dataSource}
                      onChange={(e) => setConfig({ ...config, dataSource: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">数据库名</label>
                    <input
                      type="text"
                      value={config.database}
                      onChange={(e) => setConfig({ ...config, database: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveConfig}
                    className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    保存配置
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={!config.appId || !config.apiKey}
                    className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    测试连接
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 未配置提示 */}
          {!hasConfig && !showConfig && (
            <div className="mb-5 p-4 bg-amber-50 rounded-lg border border-amber-100 text-center">
              <p className="text-sm text-amber-700 mb-2">尚未配置 MongoDB Atlas Data API</p>
              <button
                onClick={() => setShowConfig(true)}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                点击配置
              </button>
            </div>
          )}

          {/* 数据统计 */}
          {stats && (
            <div className="mb-5 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">云端数据</p>
              <div className="grid grid-cols-6 gap-2 text-center">
                {[
                  { label: '作品', key: 'novels' },
                  { label: '卷', key: 'volumes' },
                  { label: '章节', key: 'chapters' },
                  { label: '资料', key: 'materials' },
                  { label: '提示词', key: 'prompts' },
                  { label: '模型', key: 'models' },
                ].map((item) => (
                  <div key={item.key} className="bg-white rounded-md py-2">
                    <div className="text-lg font-bold text-gray-900">{stats[item.key] ?? '-'}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handlePush}
              disabled={status === 'pushing' || !hasConfig}
              className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-40"
            >
              {status === 'pushing' ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-blue-500" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">上传到云端</p>
                <p className="text-xs text-gray-500 mt-1">本地数据 → MongoDB Atlas</p>
              </div>
            </button>

            <button
              onClick={handlePull}
              disabled={status === 'pulling' || !hasConfig}
              className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-40"
            >
              {status === 'pulling' ? (
                <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              ) : (
                <Download className="w-8 h-8 text-green-500" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">从云端恢复</p>
                <p className="text-xs text-gray-500 mt-1">MongoDB Atlas → 本地</p>
              </div>
            </button>
          </div>

          {/* 状态提示 */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mt-4 ${
              status === 'success' ? 'bg-green-50 text-green-700' :
              status === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {status === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> :
               status === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> :
               <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* 使用说明 */}
          <div className="mt-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <p className="font-medium text-gray-700 mb-1">配置步骤：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>打开 MongoDB Atlas 控制台 → Data API → Create New Data API</li>
              <li>选择你的 Cluster1，点击 Create</li>
              <li>创建 API Key，复制保存</li>
              <li>回到这里点击「配置」，填入 Data App ID 和 API Key</li>
              <li>点击「测试」验证连接，然后就可以上传/下载了</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
