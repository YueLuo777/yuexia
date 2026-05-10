import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { materials } from "@db/schema";
import { eq, desc, like } from "drizzle-orm";

export const materialRouter = createRouter({
  // ─── 获取所有资料 ───
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(materials)
      .orderBy(desc(materials.updatedAt));
  }),

  // ─── 按小说筛选 ───
  listByNovel: publicQuery
    .input(z.object({ novelId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(materials).where(eq(materials.novelId, input.novelId)).orderBy(desc(materials.updatedAt));
    }),

  // ─── 搜索资料 ───
  search: publicQuery
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(materials)
        .where(like(materials.title, `%${input.query}%`))
        .orderBy(desc(materials.updatedAt));
    }),

  // ─── 创建资料 ───
  create: publicQuery
    .input(z.object({
      novelId: z.number(),
      novelTitle: z.string(),
      type: z.enum(["novel", "script"]).default("novel"),
      title: z.string().min(1),
      content: z.string().default(""),
      chapterName: z.string().optional(),
      chapterSerial: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(materials).values({
        novelId: input.novelId,
        novelTitle: input.novelTitle,
        type: input.type,
        title: input.title,
        content: input.content,
        chapterName: input.chapterName || null,
        chapterSerial: input.chapterSerial || null,
      }).returning();
      return result[0];
    }),

  // ─── 更新资料 ───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;

      const result = await db.update(materials).set(updateData).where(eq(materials.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除资料 ───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(materials).where(eq(materials.id, input.id));
      return { success: true };
    }),
});
