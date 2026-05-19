export interface ModelItem {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface NewModelInput {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}
