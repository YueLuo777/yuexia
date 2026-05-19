export type MaterialType = 'novel' | 'script';

export interface MaterialItem {
  id: string;
  novelId: number;
  novelTitle: string;
  type: MaterialType;
  title: string;
  content: string;
  chapterName?: string;
  chapterSerial?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewMaterialInput {
  novelId: number;
  novelTitle: string;
  type: MaterialType;
  title: string;
  content: string;
  chapterName?: string;
  chapterSerial?: number;
}
