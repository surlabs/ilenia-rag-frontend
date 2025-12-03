import { logger } from './logger';
import {
  STATUS_RETRYING,
  STATUS_SUCCESS,
  STATUS_ERROR,
  type StreamStatusEvent,
} from './stream-events';

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

type RetryConfig = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

function getRetryConfig(): Required<RetryConfig> {
  return {
    maxAttempts: Number.parseInt(
      process.env.RAG_RETRY_MAX_ATTEMPTS || String(DEFAULT_MAX_ATTEMPTS),
      10
    ),
    baseDelayMs: Number.parseInt(
      process.env.RAG_RETRY_BASE_DELAY_MS || String(DEFAULT_BASE_DELAY_MS),
      10
    ),
  };
}

function calculateBackoffDelay(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * 2 ** (attempt - 1);
}

export type RetryResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

export async function* retryWithStatusGenerator<T>(
  fn: () => Promise<T>,
  config?: RetryConfig
): AsyncGenerator<StreamStatusEvent, RetryResult<T>> {
  const { maxAttempts, baseDelayMs } = { ...getRetryConfig(), ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      yield { type: 'status', code: STATUS_SUCCESS };
      return { success: true, value: result };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        logger.warn(
          { attempt, error: lastError.message },
          'RAG request failed, retrying...'
        );
        yield {
          type: 'status',
          code: STATUS_RETRYING,
          params: { attempt },
        };

        const delay = calculateBackoffDelay(attempt, baseDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(
    { error: lastError?.message, attempts: maxAttempts },
    'RAG request failed after all retries'
  );

  yield {
    type: 'status',
    code: STATUS_ERROR,
    params: { message: lastError?.message },
  };

  return { success: false, error: lastError! };
}
