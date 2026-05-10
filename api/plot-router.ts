import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { plotPoints } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const plotRouter = createRouter({
  // ─── 获取小说的所有剧情点 ───
  listByNovel: publicQuery
    .input(z.object({ novelId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(plotPoints)
        .where(eq(plotPoints.novelId, input.novelId))
        .orderBy(desc(plotPoints.createdAt));
    }),

  // ─── 获取单个剧情点 ───
  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(plotPoints).where(eq(plotPoints.id, input.id));
      return result[0] || null;
    }),

  // ─── 创建剧情点（含向量嵌入）───
  create: publicQuery
    .input(z.object({
      novelId: z.number(),
      novelTitle: z.string().default(""),
      chapterId: z.number().optional(),
      chapterName: z.string().optional(),
      title: z.string().default(""),
      content: z.string().min(1),
      characters: z.string().default(""),
      location: z.string().default(""),
      mood: z.string().default(""),
      tags: z.string().default(""),
      sourceText: z.string().default(""),
      embedding: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { embedding, ...data } = input;

      const result = await db.insert(plotPoints).values({
        ...data,
        embedding: embedding ? sql`${JSON.stringify(embedding)}::vector` : null,
      }).returning();

      return result[0];
    }),

  // ─── 批量创建剧情点 ───
  batchCreate: publicQuery
    .input(z.object({
      items: z.array(z.object({
        novelId: z.number(),
        novelTitle: z.string().default(""),
        chapterId: z.number().optional(),
        chapterName: z.string().optional(),
        title: z.string().default(""),
        content: z.string().min(1),
        characters: z.string().default(""),
        location: z.string().default(""),
        mood: z.string().default(""),
        tags: z.string().default(""),
        sourceText: z.string().default(""),
        embedding: z.array(z.number()).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const inserted: any[] = [];

      for (const item of input.items) {
        const { embedding, ...data } = item;
        const result = await db.insert(plotPoints).values({
          ...data,
          embedding: embedding ? sql`${JSON.stringify(embedding)}::vector` : null,
        }).returning();
        inserted.push(result[0]);
      }

      return inserted;
    }),

  // ─── 更新剧情点 ───
  update: publicQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      characters: z.string().optional(),
      location: z.string().optional(),
      mood: z.string().optional(),
      tags: z.string().optional(),
      embedding: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, embedding, ...updates } = input;
      const updateData: Record<string, any> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.characters !== undefined) updateData.characters = updates.characters;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.mood !== undefined) updateData.mood = updates.mood;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (embedding !== undefined) {
        updateData.embedding = sql`${JSON.stringify(embedding)}::vector`;
      }

      const result = await db.update(plotPoints).set(updateData).where(eq(plotPoints.id, id)).returning();
      return result[0] || null;
    }),

  // ─── 删除剧情点 ───
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(plotPoints).where(eq(plotPoints.id, input.id));
      return { success: true };
    }),

  // ─── 删除小说的所有剧情点 ───
  deleteByNovel: publicQuery
    .input(z.object({ novelId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(plotPoints).where(eq(plotPoints.novelId, input.novelId));
      return { success: true };
    }),

  // ─── 向量语义搜索（最核心）───
  search: publicQuery
    .input(z.object({
      queryVector: z.array(z.number()),
      novelId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      // pgvector 余弦相似度搜索（<=> 操作符）
      // 值越小越相似
      const vectorStr = JSON.stringify(input.queryVector);

      let query;
      if (input.novelId) {
        // 限定在某本小说内搜索
        query = sql`SELECT id, novel_id, novel_title, chapter_id, chapter_name, title, content, characters, location, mood, tags, source_text, created_at,
          embedding <=> ${vectorStr}::vector AS distance
          FROM plot_points
          WHERE novel_id = ${input.novelId}
          ORDER BY embedding <=> ${vectorStr}::vector
          LIMIT ${input.limit}`;
      } else {
        // 全局搜索
        query = sql`SELECT id, novel_id, novel_title, chapter_id, chapter_name, title, content, characters, location, mood, tags, source_text, created_at,
          embedding <=> ${vectorStr}::vector AS distance
          FROM plot_points
          ORDER BY embedding <=> ${vectorStr}::vector
          LIMIT ${input.limit}`;
      }

      const result = await db.execute(query);
      return result.rows;
    }),

  // ─── 全文关键词搜索（辅助）───
  searchByKeyword: publicQuery
    .input(z.object({
      keyword: z.string(),
      novelId: z.number().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      // 使用 ILIKE 进行不区分大小写的模糊搜索
      const keywordPattern = `%${input.keyword}%`;

      if (input.novelId) {
        return db.select().from(plotPoints)
          .where(sql`${plotPoints.novelId} = ${input.novelId} AND (${plotPoints.content} ILIKE ${keywordPattern} OR ${plotPoints.title} ILIKE ${keywordPattern} OR ${plotPoints.tags} ILIKE ${keywordPattern})`)
          .limit(input.limit);
      }

      return db.select().from(plotPoints)
        .where(sql`${plotPoints.content} ILIKE ${keywordPattern} OR ${plotPoints.title} ILIKE ${keywordPattern} OR ${plotPoints.tags} ILIKE ${keywordPattern}`)
        .limit(input.limit);
    }),

  // ─── 获取剧情点统计 ───
  stats: publicQuery.query(async () => {
    const db = getDb();
    const result = await db.execute(sql`SELECT COUNT(*) as total FROM plot_points`);
    const novelResult = await db.execute(sql`SELECT COUNT(DISTINCT novel_id) as novel_count FROM plot_points`);
    return {
      total: parseInt(result.rows[0]?.total as string) || 0,
      novelCount: parseInt(novelResult.rows[0]?.novel_count as string) || 0,
    };
  }),
});
