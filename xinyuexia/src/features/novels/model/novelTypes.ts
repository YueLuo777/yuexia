export type WorkType = 'novel' | 'script';

export interface Novel {
  id: number;
  title: string;
  type: WorkType;
  category: string;
  wordCount: number;
  createdAt: string;
  lastModifiedAt: string;
  synopsis?: string;
  cover?: string;
}

export interface RecycledNovel extends Novel {
  deletedAt: string;
  expireAt: string;
}

export interface NewNovelInput {
  title: string;
  type: WorkType;
  category: string;
  synopsis?: string;
}
