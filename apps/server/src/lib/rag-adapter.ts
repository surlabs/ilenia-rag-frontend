import { MockRagProvider } from './mock-rag-provider';
import { RealRagProvider } from './real-rag-provider';
import { ragConfigService } from './rag-config';
import { logger } from './logger';


export interface RagProvider {
  getConfig(backendUrl?: string): Promise<{ modes: { language: string; domain: string }[] }>;

  configure(params: {
    prompt: string;
    available_configs: { language: string; domain: string }[];
    language: string | null;
    domain: string | null;
  }): Promise<{ language: string; domain: string }>;

  predict(
    params: {
      history: { role: string; content: string }[];
      prompt: string;
      language: string;
      domain: string;
    },
    backendUrl?: string
  ): AsyncGenerator<RagChunk>;
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
let mockProviderInstance: MockRagProvider | null = null;

export function getRagProvider(): RagProvider {
  if (providerInstance) return providerInstance;

  const providerType = process.env.RAG_PROVIDER || 'mock';

  if (providerType === 'real') {
    if (!ragConfigService.isInitialized()) {
      ragConfigService.initialize();
    }
    providerInstance = new RealRagProvider();
    logger.info('Using RealRagProvider');
  } else if (providerType === 'mock') {
    providerInstance = new MockRagProvider();
    logger.info('Using MockRagProvider');
  } else {
    logger.warn({ providerType }, 'Unknown RAG_PROVIDER, falling back to mock');
    providerInstance = new MockRagProvider();
  }

  return providerInstance;
}

export function getMockProvider(): RagProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockRagProvider();
  }
  return mockProviderInstance;
}
