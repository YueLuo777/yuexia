export interface PromptItem {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  isFavorite: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewPromptInput {
  name: string;
  description: string;
  content: string;
  category: string;
}
