import { RagProvider, RagChunk } from './rag-adapter';
import { ragConfigService } from './rag-config';
import { parseSSEStream } from './sse-parser';
import { logger } from './logger';

const CONFIG_TIMEOUT_MS = parseInt(process.env.RAG_CONFIG_TIMEOUT_MS || '5000', 10);
const REQUEST_TIMEOUT_MS = parseInt(process.env.RAG_REQUEST_TIMEOUT_MS || '30000', 10);

export class RealRagProvider implements RagProvider {
  async getConfig(backendUrl?: string): Promise<{ modes: { language: string; domain: string }[] }> {
    if (!backendUrl) {
      throw new Error('backendUrl is required for RealRagProvider.getConfig()');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);

    try {
      const response = await fetch(`${backendUrl}/get_config`, {
        method: 'GET',
        headers: {
          ...ragConfigService.getAuthHeader(backendUrl),
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        logger.error({ url: backendUrl }, 'Authentication failed for RAG backend');
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = (await response.json()) as { modes: { language: string; domain: string }[] };

      logger.info(
        { url: backendUrl, modesCount: config.modes.length },
        'Config fetched successfully'
      );

      return config;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.error({ url: backendUrl, timeoutMs: CONFIG_TIMEOUT_MS }, 'Timeout fetching config');
        throw new Error(`Timeout fetching config from ${backendUrl}`);
      }
      logger.error({ url: backendUrl, err: error }, 'Failed to fetch config');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async configure(params: {
    prompt: string;
    available_configs: { language: string; domain: string }[];
    language: string | null;
    domain: string | null;
  }): Promise<{ language: string; domain: string }> {
    const masterUrl = ragConfigService.getMasterUrl();

    if (!masterUrl) {
      throw new Error('Master URL not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);

    try {
      const response = await fetch(`${masterUrl}/configure`, {
        method: 'POST',
        headers: {
          ...ragConfigService.getAuthHeader(masterUrl),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: params.prompt,
          available_configs: params.available_configs,
          language: params.language,
          domain: params.domain,
        }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        logger.error({ url: masterUrl }, 'Authentication failed for RAG master');
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = (await response.json()) as { language: string; domain: string };

      logger.info(
        { masterUrl, language: result.language, domain: result.domain },
        'RAG configuration resolved'
      );

      return result;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.error({ url: masterUrl, timeoutMs: CONFIG_TIMEOUT_MS }, 'Timeout during configure');
        throw new Error(`Timeout during configure at ${masterUrl}`);
      }
      logger.error({ url: masterUrl, err: error }, 'Failed to configure');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *predict(
    params: {
      history: { role: string; content: string }[];
      prompt: string;
      language: string;
      domain: string;
    },
    backendUrl?: string
  ): AsyncGenerator<RagChunk> {
    if (!backendUrl) {
      throw new Error('backendUrl is required for RealRagProvider.predict()');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    logger.info({ url: backendUrl, language: params.language, domain: params.domain }, 'Starting predict request');

    try {
      const response = await fetch(`${backendUrl}/predict`, {
        method: 'POST',
        headers: {
          ...ragConfigService.getAuthHeader(backendUrl),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: params.history,
          prompt: params.prompt,
          language: params.language,
          domain: params.domain,
        }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        logger.error({ url: backendUrl }, 'Authentication failed for predict');
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Backend sends accumulated responses, we convert to deltas
      let lastAccumulated = '';

      for await (const chunk of parseSSEStream<RagChunk>(response)) {
        const delta = chunk.response.slice(lastAccumulated.length);
        lastAccumulated = chunk.response;

        if (delta || chunk.contexts) {
          yield {
            response: delta,
            contexts: chunk.contexts,
          };
        }
      }

      logger.info({ url: backendUrl }, 'Predict stream completed');
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      
      // Handle normal stream termination as success
      if (errorMessage.includes('terminated') || errorMessage.includes('other side closed')) {
        logger.info({ url: backendUrl }, 'Predict stream completed (connection closed by server)');
        return;
      }
      
      if ((error as Error).name === 'AbortError') {
        logger.error({ url: backendUrl, timeoutMs: REQUEST_TIMEOUT_MS }, 'Timeout during predict');
        throw new Error(`Timeout during predict at ${backendUrl}`);
      }
      logger.error({ url: backendUrl, err: error }, 'Failed during predict');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
