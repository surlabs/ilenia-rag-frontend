'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatStatus } from 'ai';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Loader } from '@/components/ai-elements/loader';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  type Suggestion,
  SuggestionsPanel,
} from '@/components/ai-elements/suggestions-panel';
import { AssistantAvatar } from '@/components/assistant-avatar';
import { LoadingDots } from '@/components/loading-dots';
import { MessageStatus } from '@/components/message-status';
import {
  RagContextSelector,
  type RagContextValue,
} from '@/components/rag-context-selector';
import { TypingCursor } from '@/components/typing-cursor';
import { useRagCapabilities } from '@/hooks/use-rag-capabilities';
import { useTranslation } from '@/providers/i18n-provider';
import { client, orpc } from '@/utils/orpc';

type ChatMessage = {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: { title: string; url: string }[] | null;
  createdAt: Date;
};

type StreamStatusEvent = {
  type: 'status';
  code: 'STATUS_RETRYING' | 'STATUS_SUCCESS' | 'STATUS_ERROR';
  params?: { attempt?: number; message?: string };
};

type StreamContentEvent = {
  type: 'content';
  response: string;
  contexts: { title: string; url?: string }[] | null;
};

type StreamEvent = StreamStatusEvent | StreamContentEvent;

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = params.id as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [submitStatus, setSubmitStatus] = useState<ChatStatus>('ready');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [currentStatusCode, setCurrentStatusCode] = useState<string | null>(
    null
  );
  const [statusParams, setStatusParams] = useState<{ attempt?: number } | null>(
    null
  );
  const [ragContext, setRagContext] = useState<RagContextValue>({
    mode: 'auto',
  });

  const { capabilities: ragCapabilities } = useRagCapabilities();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previousDataRef = useRef<{ chat: any; list: any } | null>(null);

  const {
    data: chat,
    isLoading,
    error,
  } = useQuery({
    ...orpc.chat.get.queryOptions({ input: { id: chatId } }),
    enabled: !!chatId,
  });

  const previousSubmitStatusRef = useRef<ChatStatus>('ready');

  // Reset states when chatId changes
  useEffect(() => {
    setStreamingContent('');
    setStreamingMessageId(null);
    setCurrentStatusCode(null);
    setStatusParams(null);
    setSubmitStatus('ready');
    setRagContext({ mode: 'auto' });
  }, [chatId]);

  // Restore focus when streaming finishes
  useEffect(() => {
    const wasSubmitting =
      previousSubmitStatusRef.current === 'submitted' ||
      previousSubmitStatusRef.current === 'streaming';
    const isNowReady = submitStatus === 'ready' || submitStatus === 'error';

    if (wasSubmitting && isNowReady) {
      const textarea = document.getElementById(
        'chat-input'
      ) as HTMLTextAreaElement;
      textarea?.focus();
    }

    previousSubmitStatusRef.current = submitStatus;
  }, [submitStatus]);

  const sendMessage = useCallback(
    async (
      text: string,
      options: { demo?: boolean; language?: string; domain?: string } = {}
    ) => {
      if (!(text && chat)) return;

      setSubmitStatus('submitted');

      const listKey = orpc.chat.list.queryOptions().queryKey;
      const getKey = orpc.chat.get.queryOptions({
        input: { id: chatId },
      }).queryKey;

      // Save previous state for rollback
      previousDataRef.current = {
        chat: queryClient.getQueryData(getKey),
        list: queryClient.getQueryData(listKey),
      };

      const isFirstMessage = ((chat as any)?.messages?.length ?? 0) === 0;
      const title = isFirstMessage ? text.slice(0, 30) : undefined;

      // Generate temporary IDs
      const userMessageId = `temp-user-${Date.now()}`;
      const assistantMessageId = `temp-assistant-${Date.now()}`;

      // Optimistic UI: Add user message and empty assistant message
      const userMessage: ChatMessage = {
        id: userMessageId,
        chatId,
        role: 'user',
        content: text,
        sources: null,
        createdAt: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        chatId,
        role: 'assistant',
        content: '',
        sources: null,
        createdAt: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(getKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...old.messages, userMessage, assistantMessage],
        };
      });

      setStreamingMessageId(assistantMessageId);

      // Optimistic UI: Update title and lastMessage in list
      if (isFirstMessage && title) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(listKey, (old: any) =>
          old?.map((c: { id: string; title: string; lastMessage: string }) =>
            c.id === chatId ? { ...c, title, lastMessage: text } : c
          )
        );
      }

      let hasError = false;

      try {
        setSubmitStatus('streaming');
        let accumulatedContent = '';
        let latestSources: { title: string; url: string }[] = [];

        // Call sendMessage and consume the stream
        const stream = await client.chat.sendMessage({
          chatId,
          content: text,
          title,
          demo: options.demo ?? false,
          language: options.language,
          domain: options.domain,
        });

        for await (const event of stream as AsyncIterable<StreamEvent>) {
          if (event.type === 'status') {
            if (event.code === 'STATUS_RETRYING') {
              setCurrentStatusCode(event.code);
              setStatusParams(event.params ?? null);
            } else if (event.code === 'STATUS_SUCCESS') {
              setCurrentStatusCode(null);
              setStatusParams(null);
            } else if (event.code === 'STATUS_ERROR') {
              setCurrentStatusCode(event.code);
              setStatusParams(null);
              setSubmitStatus('error');
              hasError = true;
            }
          } else if (event.type === 'content') {
            accumulatedContent += event.response;
            setStreamingContent(accumulatedContent);

            if (event.contexts) {
              latestSources = event.contexts.map((c) => ({
                title: c.title,
                url: c.url ?? '',
              }));
            }

            // Update assistant message in cache
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(getKey, (old: any) => {
              if (!old) return old;
              return {
                ...old,
                messages: old.messages.map((m: ChatMessage) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content: accumulatedContent,
                        sources:
                          latestSources.length > 0 ? latestSources : m.sources,
                      }
                    : m
                ),
              };
            });
          }
        }

        // Update lastMessage in list on success
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queryClient.setQueryData(listKey, (old: any) =>
          old?.map((c: { id: string }) =>
            c.id === chatId
              ? { ...c, lastMessage: accumulatedContent.slice(0, 100) }
              : c
          )
        );

        setSubmitStatus('ready');
      } catch {
        // Network error - rollback
        if (previousDataRef.current) {
          if (previousDataRef.current.chat) {
            queryClient.setQueryData(getKey, previousDataRef.current.chat);
          }
          if (previousDataRef.current.list) {
            queryClient.setQueryData(listKey, previousDataRef.current.list);
          }
        }
        setCurrentStatusCode('STATUS_ERROR');
        setSubmitStatus('error');
        hasError = true;
      } finally {
        setStreamingContent('');
        if (!hasError) {
          setStreamingMessageId(null);
        }
      }
    },
    [chat, chatId, queryClient]
  );

  const handleSubmit = useCallback(
    async (message: { text: string }) => {
      const text = message.text.trim();
      await sendMessage(text, {
        demo: false,
        language:
          ragContext.mode === 'manual' ? ragContext.language : undefined,
        domain: ragContext.mode === 'manual' ? ragContext.domain : undefined,
      });
    },
    [sendMessage, ragContext]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: Suggestion) => {
      await sendMessage(suggestion.question, {
        demo: true,
        language: suggestion.language,
        domain: suggestion.domain,
      });
    },
    [sendMessage]
  );

  if (isLoading || !(chat || error)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size={24} />
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('chat.notFound')}</p>
      </div>
    );
  }

  const isSubmitting =
    submitStatus === 'submitted' || submitStatus === 'streaming';

  return (
    <div className="flex h-full flex-col">
      <div className="h-full min-h-0 flex-1">
        {chat.messages.length === 0 && !streamingMessageId ? (
          <SuggestionsPanel onSuggestionClick={handleSuggestionClick} />
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="mx-auto max-w-3xl pb-4">
              {chat.messages.map((message: ChatMessage) => {
                const isAssistant = message.role === 'assistant';
                const isStreaming = message.id === streamingMessageId;
                const hasContent = message.content.length > 0;
                const isWaitingForResponse =
                  isStreaming && !hasContent && !currentStatusCode;
                const isActivelyStreaming =
                  isStreaming &&
                  hasContent &&
                  !currentStatusCode &&
                  submitStatus === 'streaming';
                const hasStatusCode = isStreaming && currentStatusCode;

                return (
                  <div
                    className={`flex gap-4 ${isAssistant ? '' : 'justify-end'}`}
                    key={message.id}
                  >
                    {isAssistant && <AssistantAvatar className="mt-1" />}
                    <div className="min-w-0 flex-1">
                      <Message from={message.role}>
                        <MessageContent>
                          {isWaitingForResponse ? (
                            <LoadingDots />
                          ) : hasStatusCode ? (
                            <MessageStatus
                              code={currentStatusCode}
                              params={statusParams ?? undefined}
                            />
                          ) : (
                            <div className="inline">
                              <MessageResponse>
                                {message.content}
                              </MessageResponse>
                              {isActivelyStreaming && <TypingCursor />}
                            </div>
                          )}
                        </MessageContent>
                        {message.sources && message.sources.length > 0 && (
                          <Sources>
                            <SourcesTrigger
                              count={message.sources.length}
                              label={t('sources.used', {
                                count: message.sources.length,
                              })}
                            />
                            <SourcesContent>
                              {message.sources.map((source, idx) => (
                                <Source
                                  href={source.url}
                                  key={idx}
                                  title={source.title}
                                />
                              ))}
                            </SourcesContent>
                          </Sources>
                        )}
                      </Message>
                    </div>
                  </div>
                );
              })}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        )}
      </div>

      <div className="bg-background px-4 pt-2 pb-6">
        <div className="mx-auto max-w-3xl">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              disabled={isSubmitting}
              id="chat-input"
              maxLength={5000}
              placeholder={t('chat.inputPlaceholder')}
            />
            <PromptInputFooter>
              <PromptInputTools>
                <RagContextSelector
                  capabilities={ragCapabilities}
                  disabled={isSubmitting}
                  onChange={setRagContext}
                  value={ragContext}
                />
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isSubmitting}
                status={submitStatus}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
