import { createRouter } from "./middleware";
import { novelRouter } from "./novel-router";
import { volumeRouter } from "./volume-router";
import { chapterRouter } from "./chapter-router";
import { materialRouter } from "./material-router";
import { promptRouter } from "./prompt-router";
import { modelRouter } from "./model-router";
import { settingsRouter } from "./settings-router";
import { syncRouter } from "./sync-router";
import { plotRouter } from "./plot-router";
import { backupRouter } from "./backup-router";

export const appRouter = createRouter({
  novel: novelRouter,
  volume: volumeRouter,
  chapter: chapterRouter,
  material: materialRouter,
  prompt: promptRouter,
  model: modelRouter,
  settings: settingsRouter,
  sync: syncRouter,
  plot: plotRouter,
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;
