export async function* parseSSEStream<T>(response: Response): AsyncGenerator<T> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>;
      
      try {
        readResult = await reader.read();
      } catch (err) {
        const message = (err as Error).message || '';
        if (message.includes('terminated') || message.includes('other side closed')) {
          break;
        }
        throw err;
      }
      
      const { done, value } = readResult;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const parsed = parseSSELine<T>(line);
        if (parsed !== null) {
          yield parsed;
        }
      }
    }

    if (buffer.trim()) {
      const parsed = parseSSELine<T>(buffer);
      if (parsed !== null) {
        yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSELine<T>(line: string): T | null {
  let trimmed = line.trim();
  
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('data:')) {
    trimmed = trimmed.slice(5).trim();
  }

  if (trimmed.startsWith('event:') || trimmed.startsWith('id:') || trimmed.startsWith('retry:')) {
    return null;
  }

  if (!trimmed || trimmed === '[DONE]') {
    return null;
  }

  return JSON.parse(trimmed) as T;
}
