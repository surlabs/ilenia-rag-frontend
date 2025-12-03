import type { Context } from './rag-adapter';

export const STATUS_RETRYING = 'STATUS_RETRYING' as const;
export const STATUS_SUCCESS = 'STATUS_SUCCESS' as const;
export const STATUS_ERROR = 'STATUS_ERROR' as const;

export type StatusCode =
  | typeof STATUS_RETRYING
  | typeof STATUS_SUCCESS
  | typeof STATUS_ERROR;

export type StreamStatusEvent = {
  type: 'status';
  code: StatusCode;
  params?: {
    attempt?: number;
    message?: string;
  };
};

export type StreamContentEvent = {
  type: 'content';
  response: string;
  contexts: Context[] | null;
};

export type StreamEvent = StreamStatusEvent | StreamContentEvent;
