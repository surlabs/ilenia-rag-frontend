import { logger } from './logger';

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

export async function retryWithStatus<T>(
  fn: () => Promise<T>,
  onRetry: (attempt: number, error: Error) => void,
  onError: (error: Error) => void,
  config?: RetryConfig
): Promise<T> {
  const { maxAttempts, baseDelayMs } = { ...getRetryConfig(), ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        logger.warn(
          { attempt, error: lastError.message },
          'RAG request failed, retrying...'
        );
        onRetry(attempt, lastError);

        const delay = calculateBackoffDelay(attempt, baseDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(
    { error: lastError?.message, attempts: maxAttempts },
    'RAG request failed after all retries'
  );
  onError(lastError!);
  throw lastError;
}
