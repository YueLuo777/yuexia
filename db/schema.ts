import { pgTable, serial, integer, text, boolean, timestamp, vector } from "drizzle-orm/pg-core";

// ─── 小说/剧本 ───
export const novels = pgTable("novels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull().default("novel"),
  category: text("category").notNull().default("未分类"),
  synopsis: text("synopsis"),
  cover: text("cover"),
  wordCount: integer("word_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ─── 卷 ───
export const volumes = pgTable("volumes", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isExpanded: boolean("is_expanded").notNull().default(true),
});

// ─── 章节 ───
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull(),
  volumeId: integer("volume_id").notNull(),
  title: text("title").notNull().default(""),
  serialNumber: integer("serial_number").notNull(),
  content: text("content").notNull().default(""),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ─── 资料库 ───
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull(),
  novelTitle: text("novel_title").notNull(),
  type: text("type").notNull().default("novel"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  chapterName: text("chapter_name"),
  chapterSerial: integer("chapter_serial"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ─── 提示词 ───
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull(),
  category: text("category").notNull().default("正文"),
  visibility: text("visibility").notNull().default("private"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ─── AI 模型配置 ───
export const modelConfigs = pgTable("model_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modelId: text("model_id").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ─── 应用设置 ───
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
});

// ─── 剧情点（带向量嵌入，用于语义搜索）───
export const plotPoints = pgTable("plot_points", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull(),
  novelTitle: text("novel_title").notNull().default(""),
  chapterId: integer("chapter_id"),
  chapterName: text("chapter_name"),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  characters: text("characters").default(""),
  location: text("location").default(""),
  mood: text("mood").default(""),
  tags: text("tags").default(""),
  sourceText: text("source_text").default(""),
  embedding: vector("embedding", { dimensions: 384 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// ─── 类型导出 ───
export type Novel = typeof novels.$inferSelect;
export type InsertNovel = typeof novels.$inferInsert;
export type Volume = typeof volumes.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Prompt = typeof prompts.$inferSelect;
export type ModelConfig = typeof modelConfigs.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type PlotPoint = typeof plotPoints.$inferSelect;
export type InsertPlotPoint = typeof plotPoints.$inferInsert;
