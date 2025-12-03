import { MockRagProvider } from './mock-rag-provider';

export interface RagProvider {
  getConfig(): Promise<{ modes: { language: string; domain: string }[] }>;

  configure(params: {
    prompt: string;
    available_configs: { language: string; domain: string }[];
    language: string | null;
    domain: string | null;
  }): Promise<{ language: string; domain: string }>;

  predict(params: {
    history: { role: string; content: string }[];
    prompt: string;
    language: string;
    domain: string;
  }): AsyncGenerator<RagChunk>;
}

export type RagChunk = {
  response: string;
  contexts: Context[] | null;
};

export type Context = {
  id: string;
  title: string;
  passage: string;
  timestamp?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

let providerInstance: RagProvider | null = null;

export function getRagProvider(): RagProvider {
  if (providerInstance) return providerInstance;

  const providerType = process.env.RAG_PROVIDER || 'mock';

  if (providerType === 'mock') {
    providerInstance = new MockRagProvider();
  } else {
    console.warn(`RAG_PROVIDER '${providerType}' not implemented yet. Falling back to Mock.`);
    providerInstance = new MockRagProvider();
  }

  return providerInstance;
}
