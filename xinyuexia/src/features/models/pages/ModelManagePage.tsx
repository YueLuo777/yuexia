import { Bot, Eye, EyeOff, GripVertical, Plus, Server, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useModels } from '@/features/models/hooks/useModels';
import type { ModelItem } from '@/features/models/model/modelTypes';
import { callModel } from '@/features/models/services/callModel';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

type ModelDraft = {
  name: string;
  id: string;
  baseUrl: string;
  apiKey: string;
};

function ModelEditorModal({
  isOpen,
  title,
  initial,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  title: string;
  initial: ModelDraft;
  onClose: () => void;
  onSave: (draft: ModelDraft) => void;
}) {
  const [draft, setDraft] = useState<ModelDraft>(initial);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) setDraft(initial);
  }, [initial, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[620px] max-w-[92vw] rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-8 py-6">
          <h2 className="text-[18px] font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-8 py-7">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">模型名称</label>
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="DeepSeek V4 Flash"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">模型 ID</label>
            <input
              value={draft.id}
              onChange={(event) => setDraft((prev) => ({ ...prev, id: event.target.value }))}
              placeholder="deepseek-v4-flash"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">接口地址</label>
            <input
              value={draft.baseUrl}
              onChange={(event) => setDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
              placeholder="https://api.deepseek.com"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-600">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-brand"
              />
              <button
                onClick={() => setShowKey((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors hover:text-slate-500"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-slate-100 bg-slate-50/60 px-8 py-5">
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-6 py-3 text-base text-slate-600 hover:bg-white">
            取消
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!draft.name.trim() || !draft.id.trim()}
            className="rounded-2xl bg-brand px-7 py-3 text-base text-white transition-colors hover:bg-brand-dark disabled:bg-slate-300"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModelManagePage() {
  const { models, addModel, updateModel, deleteModel, reorderModels } = useModels();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ModelItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ModelItem | null>(null);
  const [toast, setToast] = useState('');
  const dragIndexRef = useRef<number | null>(null);

  const enabledCount = models.filter((model) => model.enabled).length;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const openAdd = () => {
    setEditing(null);
    setShowAdd(true);
  };

  const openEdit = (model: ModelItem) => {
    setEditing(model);
    setShowAdd(false);
  };

  const testModel = async (model: ModelItem) => {
    updateModel(model.id, { connectionStatus: 'testing' });
    try {
      await callModel({
        model,
        prompt: '你是一个测试助手。',
        userContent: '请只返回“连接成功”。',
        chapterContext: '',
      });
      updateModel(model.id, { connectionStatus: 'connected' });
      showToast('连接成功');
    } catch {
      updateModel(model.id, { connectionStatus: 'failed' });
      showToast('连接失败');
    }
  };

  const statusText = (model: ModelItem) => {
    if (!model.enabled) return '未启用';
    if (model.connectionStatus === 'connected') return '正常';
    if (model.connectionStatus === 'failed') return '失败';
    if (model.connectionStatus === 'testing') return '测试中';
    return '未测试';
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-7 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <Server className="h-5 w-5" />
          </div>
          <h1 className="text-[18px] font-bold text-slate-900">模型管理</h1>
          <span className="rounded-xl bg-orange-500 px-3 py-1 text-sm text-white">已启用 {enabledCount} 个模型</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mb-5 flex items-center gap-4">
          <button onClick={openAdd} className="flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-base text-white hover:bg-brand-dark">
            <Plus className="h-4 w-4" />
            新增模型
          </button>
          {models.length > 1 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <GripVertical className="h-4 w-4" />
              拖拽卡片可调整模型顺序
            </div>
          )}
        </div>

        {models.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-6">
            {models.map((model, index) => (
              <div
                key={model.id}
                draggable
                onDragStart={() => {
                  dragIndexRef.current = index;
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = dragIndexRef.current;
                  if (typeof from === 'number') reorderModels(from, index);
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                className={`rounded-[24px] border bg-white p-6 transition-colors ${dragOverIndex === index ? 'border-brand ring-1 ring-brand' : 'border-slate-200'}`}
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${model.enabled ? 'bg-brand-light text-brand' : 'bg-slate-100 text-slate-400'}`}>
                    <Bot className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[20px] font-bold text-slate-900">{model.name}</div>
                    <div className="mt-2 text-[15px] text-slate-500">模型ID: {model.model}</div>
                    <div className="mt-2 text-[15px] text-slate-500">状态: <span className={model.enabled ? 'text-emerald-600' : 'text-slate-400'}>{statusText(model)}</span></div>
                  </div>
                  <button
                    onClick={() => updateModel(model.id, { locked: !model.locked })}
                    className={`rounded-xl border px-4 py-2 text-base transition-colors ${
                      model.locked ? 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {model.locked ? '已锁定' : '锁定'}
                  </button>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(model)} className="flex-1 rounded-xl border border-brand/30 py-3 text-base text-brand hover:bg-brand-light">编辑模型</button>
                    <button onClick={() => void testModel(model)} className="flex-1 rounded-xl border border-sky-300 py-3 text-base text-sky-500 hover:bg-sky-50">API 测试</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateModel(model.id, { enabled: !model.enabled })}
                      className={`flex-1 rounded-xl border py-3 text-base transition-colors ${model.enabled ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-brand/30 text-brand hover:bg-brand-light'}`}
                    >
                      {model.enabled ? '取消启用' : '启用模型'}
                    </button>
                    <button
                      onClick={() => {
                        if (!model.locked) setDeleteTarget(model);
                      }}
                      disabled={model.locked}
                      className={`flex-1 rounded-xl border py-3 text-base transition-colors ${model.locked ? 'cursor-not-allowed border-slate-200 text-slate-300' : 'border-red-300 text-red-500 hover:bg-red-50'}`}
                    >
                      {model.locked ? '已锁定' : '删除'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showAdd && <div className="py-14 text-center text-base text-slate-400">暂无模型，请点击“新增模型”</div>
        )}
      </div>

      <ModelEditorModal
        isOpen={showAdd || !!editing}
        title={editing ? '编辑模型' : '新增模型'}
        initial={editing ? { name: editing.name, id: editing.id, baseUrl: editing.baseUrl, apiKey: editing.apiKey } : { name: '', id: '', baseUrl: '', apiKey: '' }}
        onClose={() => {
          setEditing(null);
          setShowAdd(false);
        }}
        onSave={(draft) => {
          if (editing) {
            updateModel(editing.id, { name: draft.name, id: draft.id, baseUrl: draft.baseUrl, apiKey: draft.apiKey, model: draft.id });
            setEditing(null);
            showToast('保存成功');
            return;
          }
          const created = addModel(draft);
          if (!created) {
            showToast('模型 ID 已存在');
            return;
          }
          setShowAdd(false);
          showToast('模型已添加');
        }}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="确认删除"
        description={`确定要删除模型「${deleteTarget?.name ?? ''}」吗？\n删除后将无法恢复。`}
        confirmText="确认删除"
        confirmVariant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteModel(deleteTarget.id);
          setDeleteTarget(null);
          showToast('模型已删除');
        }}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[160] rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
