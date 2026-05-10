import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chapters } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export const chapterRouter = createRouter({
  // ─── 获取小说的所有章节 ───
  listByNovel: publicQuery
    .input(z.object({ novelId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(chapters).where(eq(chapters.novelId, input.novelId)).orderBy(asc(chapters.serialNumber));
    }),

  // ─── 获取卷的所有章节 ───
  listByVolume: publicQuery
    .input(z.object({ volumeId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(chapters).where(eq(chapters.volumeId, input.volumeId)).orderBy(asc(chapters.serialNumber));
    }),

  // ─── 获取单个章节 ───
  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(chapters).where(eq(chapters.id, input.id));
      return result[0] || null;
    }),

  // ─── 创建章节 ───
  create: publicQuery
    .input(z.object({
      novelId: z.number(),
      volumeId: z.number(),
      title: z.string().default(""),
      serialNumber: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(chapters).values({
        novelId: input.novelId,
        volumeId: input.volumeId,
        title: input.title,
        serialNumber: input.serialNumber,
        content: "",
        wordCount: 0,
      }).returning();
      return result[0];
    }),

  // ─── 更新章节（包括内容）───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      wordCount: z.number().optional(),
      status: z.enum(["draft", "published"]).optional(),
      serialNumber: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) {
        updateData.content = updates.content;
        updateData.wordCount = updates.content.replace(/\s/g, "").length;
      }
      if (updates.wordCount !== undefined) updateData.wordCount = updates.wordCount;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.serialNumber !== undefined) updateData.serialNumber = updates.serialNumber;

      const result = await db.update(chapters).set(updateData).where(eq(chapters.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除章节 ───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(chapters).where(eq(chapters.id, input.id));
      return { success: true };
    }),

  // ─── 批量导入章节 ───
  batchCreate: publicQuery
    .input(z.object({
      novelId: z.number(),
      volumeId: z.number(),
      items: z.array(z.object({
        title: z.string(),
        content: z.string(),
        serialNumber: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const inserted: any[] = [];
      for (const item of input.items) {
        const result = await db.insert(chapters).values({
          novelId: input.novelId,
          volumeId: input.volumeId,
          title: item.title,
          serialNumber: item.serialNumber,
          content: item.content,
          wordCount: item.content.replace(/\s/g, "").length,
        }).returning();
        inserted.push(result[0]);
      }
      return inserted;
    }),
});
