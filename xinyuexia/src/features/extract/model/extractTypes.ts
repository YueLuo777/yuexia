export type ExtractZone = 'system' | 'output';

export interface ExtractModule {
  id: string;
  label: string;
  instruction: string;
  zone: ExtractZone;
  active: boolean;
  locked?: boolean;
}

export interface ExtractChapter {
  id: number;
  title: string;
  serialNumber: number;
  wordCount: number;
  content: string;
}

export interface ExtractNovel {
  id: number;
  title: string;
  type: 'novel' | 'script';
  chapters: ExtractChapter[];
}

export interface ExtractResult {
  id: string;
  chapterTitle: string;
  content: string;
}
