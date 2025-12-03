import { RagProvider, RagChunk, Context } from './rag-adapter';
import scenariosData from './demo-scenarios.json';

type Scenario = {
  language: string | null;
  domain: string | null;
  response: string;
  contexts: Context[] | null;
};

const DELAY_MS = 30;
const SIMULATE_FAILURES_COUNT = 2;

export class MockRagProvider implements RagProvider {
  private predictCallCount = 0;

  private shouldSimulateFailure(): boolean {
    const simulateFailures = process.env.RAG_MOCK_SIMULATE_FAILURES === 'true';
    if (!simulateFailures) return false;

    this.predictCallCount++;
    return this.predictCallCount <= SIMULATE_FAILURES_COUNT;
  }

  private resetFailureCounter(): void {
    this.predictCallCount = 0;
  }
  async getConfig(): Promise<{ modes: { language: string; domain: string }[] }> {
    const scenarios = scenariosData as Scenario[];
    
    const modes = scenarios
      .map(s => ({ 
        language: s.language || 'any', 
        domain: s.domain || 'any' 
      }))
      .filter((v, i, a) => a.findIndex(t => t.language === v.language && t.domain === v.domain) === i);

    return { modes };
  }

  async configure(params: {
    prompt: string;
    available_configs: { language: string; domain: string }[];
    language: string | null;
    domain: string | null;
  }): Promise<{ language: string; domain: string }> {
    if (params.language && params.domain) {
      return { language: params.language, domain: params.domain };
    }

    if (params.language) {
      return { language: params.language, domain: 'general' };
    }
    
    if (params.domain) {
      return { language: 'es', domain: params.domain };
    }

    return { language: 'es', domain: 'general' };
  }

  async *predict(params: {
    history: { role: string; content: string }[];
    prompt: string;
    language: string;
    domain: string;
  }): AsyncGenerator<RagChunk> {
    if (this.shouldSimulateFailure()) {
      throw new Error(
        `Simulated RAG failure (attempt ${this.predictCallCount}/${SIMULATE_FAILURES_COUNT + 1})`
      );
    }

    const scenarios = scenariosData as Scenario[];
    
    let match = scenarios.find(s => s.language === params.language && s.domain === params.domain);
    
    if (!match) {
      match = scenarios.find(s => s.language === params.language && s.domain === null);
    }
    
    if (!match) {
      match = scenarios.find(s => s.language === null && s.domain === params.domain);
    }
    
    if (!match) {
       match = {
         language: null,
         domain: null,
         response: "Mock mode: No matching scenario found for this configuration. Returning generic response.",
         contexts: []
       };
    }

    const fullResponse = match.response;
    const chunkSize = 10; 
    let cursor = 0;

    await new Promise(resolve => setTimeout(resolve, 500));

    while (cursor < fullResponse.length) {
      const chunkText = fullResponse.slice(cursor, cursor + chunkSize);
      cursor += chunkSize;

      yield {
        response: chunkText,
        contexts: null
      };
      
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    yield {
      response: "",
      contexts: match.contexts || []
    };

    this.resetFailureCounter();
  }
}
