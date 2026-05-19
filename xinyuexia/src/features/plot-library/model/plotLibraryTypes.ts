export interface PlotLibraryItem {
  id: string;
  title: string;
  chapter: string;
  novelTitle: string;
  content: string;
  tags: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewPlotLibraryItem {
  title: string;
  chapter: string;
  novelTitle: string;
  content: string;
  tags?: string[];
}
