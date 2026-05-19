export interface Chapter {
  id: number;
  title: string;
  serialNumber: number;
  wordCount: number;
  isSelected: boolean;
  isPublished?: boolean;
}

export interface Volume {
  id: number;
  name: string;
  isExpanded: boolean;
  chapters: Chapter[];
}

export interface RecycledChapter extends Chapter {
  volumeId: number;
  volumeName: string;
  deletedAt: string;
  expireAt: string;
  content: string;
}

export interface WorkbenchNovel {
  id: number;
  title: string;
  type: 'novel' | 'script';
  wordCount?: number;
  lastModifiedAt?: string;
}
