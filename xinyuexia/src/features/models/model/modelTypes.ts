export interface ModelItem {
  id: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  locked?: boolean;
  connectionStatus?: 'unknown' | 'connected' | 'failed' | 'testing';
}

export interface NewModelInput {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}
