export type IdeaStatus = 'draft' | 'outlined' | 'completed';

export interface IdeaItem {
  id: string;
  title: string;
  content: string;
  promptId: string;
  promptName: string;
  genre: string;
  tags: string[];
  modelId: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
  status: IdeaStatus;
  outlineContent?: string;
}

export interface NewIdeaInput {
  title: string;
  content: string;
  promptId: string;
  promptName: string;
  genre: string;
  tags: string[];
  modelId: string;
  modelName: string;
  status?: IdeaStatus;
  outlineContent?: string;
}
