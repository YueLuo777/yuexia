import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { volumes, chapters } from "@db/schema";
import { eq, asc } from "drizzle-orm";

export const volumeRouter = createRouter({
  // ─── 获取小说的所有卷 ───
  listByNovel: publicQuery
    .input(z.object({ novelId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(volumes).where(eq(volumes.novelId, input.novelId)).orderBy(asc(volumes.sortOrder));
    }),

  // ─── 创建卷 ───
  create: publicQuery
    .input(z.object({
      novelId: z.number(),
      name: z.string(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(volumes).values({
        novelId: input.novelId,
        name: input.name,
        sortOrder: input.sortOrder,
        isExpanded: true,
      }).returning();
      return result[0];
    }),

  // ─── 更新卷 ───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      isExpanded: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.isExpanded !== undefined) updateData.isExpanded = updates.isExpanded;
      if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

      const result = await db.update(volumes).set(updateData).where(eq(volumes.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除卷（级联删除章节）───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(chapters).where(eq(chapters.volumeId, input.id));
      await db.delete(volumes).where(eq(volumes.id, input.id));
      return { success: true };
    }),
});
