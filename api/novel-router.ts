import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { novels, volumes, chapters } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const novelRouter = createRouter({
  // ─── 获取所有作品 ───
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(novels)
      .orderBy(desc(novels.updatedAt));
  }),

  // ─── 获取单个作品 ───
  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(novels)
        .where(eq(novels.id, input.id));
      return result[0] || null;
    }),

  // ─── 创建作品 ───
  create: publicQuery
    .input(z.object({
      title: z.string().min(1),
      type: z.enum(["novel", "script"]).default("novel"),
      category: z.string().default("未分类"),
      synopsis: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(novels).values({
        title: input.title,
        type: input.type,
        category: input.category,
        synopsis: input.synopsis || null,
      }).returning();
      const novel = result[0];

      // 创建默认第一卷
      await db.insert(volumes).values({
        novelId: novel.id,
        name: input.type === "script" ? "第一卡" : "第一卷",
        sortOrder: 0,
        isExpanded: true,
      });

      // 创建一个默认章节
      const volResult = await db.select().from(volumes).where(eq(volumes.novelId, novel.id));
      const volume = volResult[0];
      await db.insert(chapters).values({
        novelId: novel.id,
        volumeId: volume.id,
        title: "",
        serialNumber: 1,
        content: "",
        wordCount: 0,
      });

      return novel;
    }),

  // ─── 更新作品 ───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      category: z.string().optional(),
      synopsis: z.string().optional(),
      cover: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.synopsis !== undefined) updateData.synopsis = updates.synopsis;
      if (updates.cover !== undefined) updateData.cover = updates.cover;

      const result = await db.update(novels).set(updateData).where(eq(novels.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除作品（级联删除卷和章节）───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // 删除章节
      await db.delete(chapters).where(eq(chapters.novelId, input.id));
      // 删除卷
      await db.delete(volumes).where(eq(volumes.novelId, input.id));
      // 删除作品
      await db.delete(novels).where(eq(novels.id, input.id));
      return { success: true };
    }),

  // ─── 更新字数 ───
  updateWordCount: publicQuery
    .input(z.object({ id: z.number(), wordCount: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(novels).set({ wordCount: input.wordCount, updatedAt: new Date() }).where(eq(novels.id, input.id));
      return { success: true };
    }),
});
