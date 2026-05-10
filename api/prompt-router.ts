import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { prompts } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const promptRouter = createRouter({
  // ─── 获取所有提示词 ───
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(prompts)
      .orderBy(desc(prompts.createdAt));
  }),

  // ─── 按分类筛选 ───
  listByCategory: publicQuery
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(prompts)
        .where(eq(prompts.category, input.category))
        .orderBy(desc(prompts.createdAt));
    }),

  // ─── 获取单个提示词 ───
  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(prompts).where(eq(prompts.id, input.id));
      return result[0] || null;
    }),

  // ─── 创建提示词 ───
  create: publicQuery
    .input(z.object({
      name: z.string().min(1),
      description: z.string().default(""),
      content: z.string().min(1),
      category: z.string().default("正文"),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(prompts).values({
        name: input.name,
        description: input.description,
        content: input.content,
        category: input.category,
      }).returning();
      return result[0];
    }),

  // ─── 更新提示词 ───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      isFavorite: z.boolean().optional(),
      isLocked: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.isFavorite !== undefined) updateData.isFavorite = updates.isFavorite;
      if (updates.isLocked !== undefined) updateData.isLocked = updates.isLocked;

      const result = await db.update(prompts).set(updateData).where(eq(prompts.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除提示词 ───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(prompts).where(eq(prompts.id, input.id));
      return { success: true };
    }),
});
