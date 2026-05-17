/**
 * 项目配置导出/导入
 * 收集所有 localStorage 数据，支持完整备份和恢复
 */

/** 所有已知的 localStorage key（按功能分组） */
export const CONFIG_GROUPS = [
  {
    id: 'api',
    label: 'API 设置',
    keys: ['api_settings_v1', 'call_records_v1'],
  },
  {
    id: 'extract',
    label: '提炼模块配置',
    keys: [
      'extract_modules_v2',
      'extract_system_order_v2',
      'extract_output_order_v2',
      'extract_active_v2',
      'extract_schema_version',
      'extract_files_cache',
      'extract_config_v1',
      'extract_history_v1',
    ],
  },
  {
    id: 'materials',
    label: '资料库',
    keys: ['materials_v1', 'material_tags_v1', 'material_tag_assignments_v1'],
  },
  {
    id: 'prompts',
    label: '提示词管理',
    keys: ['prompts_v1', 'prompt_groups_v1'],
  },
  {
    id: 'webdav',
    label: '云端同步配置',
    keys: ['webdav_config_v1'],
  },
  {
    id: 'app',
    label: '应用状态',
    keys: ['app_sidebar_collapsed', 'app_theme'],
  },
];

/** 获取所有 localStorage key */
function getAllLocalStorageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

/** 导出完整配置 */
export function exportFullConfig(): {
  json: string;
  groups: { id: string; label: string; count: number }[];
  totalKeys: number;
} {
  const allKeys = getAllLocalStorageKeys();
  const data: Record<string, unknown> = {};
  const groups: { id: string; label: string; count: number }[] = [];

  // 按分组收集
  let usedKeys = new Set<string>();
  for (const group of CONFIG_GROUPS) {
    let count = 0;
    for (const key of group.keys) {
      if (allKeys.includes(key)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            data[key] = JSON.parse(raw);
            count++;
            usedKeys.add(key);
          }
        } catch {
          // 非 JSON 数据，直接保存字符串
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            data[key] = raw;
            count++;
            usedKeys.add(key);
          }
        }
      }
    }
    groups.push({ id: group.id, label: group.label, count });
  }

  // 收集未分组的 key
  const otherKeys = allKeys.filter(k => !usedKeys.has(k));
  let otherCount = 0;
  for (const key of otherKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        data[key] = JSON.parse(raw);
        otherCount++;
      }
    } catch {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        data[key] = raw;
        otherCount++;
      }
    }
  }
  if (otherCount > 0) {
    groups.push({ id: 'other', label: '其他数据', count: otherCount });
  }

  const exportData = {
    _exportVersion: 3,
    _exportAt: new Date().toISOString(),
    _appName: '月下写作-完整配置备份',
    _description: '包含 API 设置、提炼模块、资料库、提示词等所有配置',
    data,
  };

  return {
    json: JSON.stringify(exportData, null, 2),
    groups,
    totalKeys: allKeys.length,
  };
}

/** 导入完整配置 */
export function importFullConfig(jsonText: string): {
  success: boolean;
  message: string;
  restoredCount: number;
} {
  try {
    const parsed = JSON.parse(jsonText);
    const data = parsed.data || parsed;

    // 验证
    if (typeof data !== 'object' || data === null) {
      return { success: false, message: '配置文件格式不正确', restoredCount: 0 };
    }

    let restoredCount = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // 跳过元数据字段
      if (value === undefined || value === null) continue;
      try {
        if (typeof value === 'string') {
          localStorage.setItem(key, value);
        } else {
          localStorage.setItem(key, JSON.stringify(value));
        }
        restoredCount++;
      } catch {
        // 存储失败（可能是空间不足）
      }
    }

    return {
      success: true,
      message: `成功恢复 ${restoredCount} 项配置，刷新页面后生效`,
      restoredCount,
    };
  } catch {
    return { success: false, message: '配置文件解析失败，请检查文件格式', restoredCount: 0 };
  }
}

/** 清空所有 localStorage（危险操作） */
export function clearAllConfig(): { clearedCount: number } {
  const count = localStorage.length;
  localStorage.clear();
  return { clearedCount: count };
}
