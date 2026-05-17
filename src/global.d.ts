declare global {
  interface Window {
    __handleExtract?: () => Promise<void>;
  }
}
export {};
