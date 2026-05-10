import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { novels, volumes, chapters, materials, prompts, modelConfigs } from "@db/schema";

/**
 * 数据导出/导入路由
 * 将本地数据导出为 JSON 文件，或从 JSON 文件导入
 * 用于本地备份和恢复
 */

export const syncRouter = createRouter({
  // ─── 导出所有本地数据为 JSON ───
  export: publicQuery.query(async () => {
    const db = getDb();
    const [novelList, volumeList, chapterList, materialList, promptList, modelList] = await Promise.all([
      db.select().from(novels),
      db.select().from(volumes),
      db.select().from(chapters),
      db.select().from(materials),
      db.select().from(prompts),
      db.select().from(modelConfigs),
    ]);

    return {
      novels: novelList,
      volumes: volumeList,
      chapters: chapterList,
      materials: materialList,
      prompts: promptList,
      models: modelList,
      exportedAt: new Date().toISOString(),
    };
  }),

  // ─── 从 JSON 导入数据（覆盖本地）───
  import: publicQuery
    .input(z.object({
      novels: z.array(z.any()).default([]),
      volumes: z.array(z.any()).default([]),
      chapters: z.array(z.any()).default([]),
      materials: z.array(z.any()).default([]),
      prompts: z.array(z.any()).default([]),
      models: z.array(z.any()).default([]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // 清空现有数据
      await db.delete(chapters);
      await db.delete(volumes);
      await db.delete(materials);
      await db.delete(prompts);
      await db.delete(modelConfigs);
      await db.delete(novels);

      // 重新插入（不指定 id，让 PostgreSQL 自增）
      if (input.novels.length) {
        for (const n of input.novels) {
          await db.insert(novels).values({
            title: n.title,
            type: n.type || 'novel',
            category: n.category || '未分类',
            synopsis: n.synopsis,
            cover: n.cover,
            wordCount: n.wordCount || 0,
          });
        }
      }
      if (input.volumes.length) {
        for (const v of input.volumes) {
          await db.insert(volumes).values({
            novelId: v.novelId,
            name: v.name,
            sortOrder: v.sortOrder || 0,
            isExpanded: v.isExpanded ?? true,
          });
        }
      }
      if (input.chapters.length) {
        for (const c of input.chapters) {
          await db.insert(chapters).values({
            novelId: c.novelId,
            volumeId: c.volumeId,
            title: c.title || '',
            serialNumber: c.serialNumber,
            content: c.content || '',
            wordCount: c.wordCount || 0,
            status: c.status || 'draft',
          });
        }
      }
      if (input.materials.length) {
        for (const m of input.materials) {
          await db.insert(materials).values({
            novelId: m.novelId,
            novelTitle: m.novelTitle,
            type: m.type || 'novel',
            title: m.title,
            content: m.content || '',
            chapterName: m.chapterName,
            chapterSerial: m.chapterSerial,
          });
        }
      }
      if (input.prompts.length) {
        for (const p of input.prompts) {
          await db.insert(prompts).values({
            name: p.name,
            description: p.description || '',
            content: p.content,
            category: p.category || '正文',
            visibility: p.visibility || 'private',
            isFavorite: p.isFavorite ?? false,
            isLocked: p.isLocked ?? false,
          });
        }
      }
      if (input.models.length) {
        for (const m of input.models) {
          await db.insert(modelConfigs).values({
            name: m.name,
            modelId: m.modelId,
            baseUrl: m.baseUrl,
            apiKey: m.apiKey || '',
            enabled: m.enabled ?? false,
            description: m.description || '',
          });
        }
      }

      return { success: true, imported: {
        novels: input.novels.length,
        volumes: input.volumes.length,
        chapters: input.chapters.length,
        materials: input.materials.length,
        prompts: input.prompts.length,
        models: input.models.length,
      }};
    }),

  // ─── 获取数据统计 ───
  stats: publicQuery.query(async () => {
    const db = getDb();
    const [novelCount, chapterCount, materialCount, promptCount, modelCount] = await Promise.all([
      db.select({ count: novels.id }).from(novels).then(r => r.length),
      db.select({ count: chapters.id }).from(chapters).then(r => r.length),
      db.select({ count: materials.id }).from(materials).then(r => r.length),
      db.select({ count: prompts.id }).from(prompts).then(r => r.length),
      db.select({ count: modelConfigs.id }).from(modelConfigs).then(r => r.length),
    ]);

    return {
      novels: novelCount,
      chapters: chapterCount,
      materials: materialCount,
      prompts: promptCount,
      models: modelCount,
    };
  }),
});
