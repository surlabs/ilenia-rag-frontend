"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/utils/orpc";
import { Loader } from "@/components/ai-elements/loader";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { MessageStatus } from "@/components/message-status";
import { AssistantAvatar } from "@/components/assistant-avatar";
import { LoadingDots } from "@/components/loading-dots";
import { TypingCursor } from "@/components/typing-cursor";
import { useTranslation } from "@/providers/i18n-provider";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ChatStatus } from "ai";

type ChatMessage = {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: { title: string; url: string }[] | null;
  createdAt: Date;
};

type StreamStatusEvent = {
  type: "status";
  code: "STATUS_RETRYING" | "STATUS_SUCCESS" | "STATUS_ERROR";
  params?: { attempt?: number; message?: string };
};

type StreamContentEvent = {
  type: "content";
  response: string;
  contexts: { title: string; url?: string }[] | null;
};

type StreamEvent = StreamStatusEvent | StreamContentEvent;

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = params.id as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [submitStatus, setSubmitStatus] = useState<ChatStatus>("ready");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStatusCode, setCurrentStatusCode] = useState<string | null>(null);
  const [statusParams, setStatusParams] = useState<{ attempt?: number } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previousDataRef = useRef<{ chat: any; list: any } | null>(null);

  const { data: chat, isLoading, error } = useQuery({
    ...orpc.chat.get.queryOptions({ input: { id: chatId } }),
    enabled: !!chatId,
  });

  const previousSubmitStatusRef = useRef<ChatStatus>("ready");

  // Reset states when chatId changes
  useEffect(() => {
    setStreamingContent("");
    setStreamingMessageId(null);
    setCurrentStatusCode(null);
    setStatusParams(null);
    setSubmitStatus("ready");
  }, [chatId]);

  // Restore focus when streaming finishes
  useEffect(() => {
    const wasSubmitting = previousSubmitStatusRef.current === "submitted" || previousSubmitStatusRef.current === "streaming";
    const isNowReady = submitStatus === "ready" || submitStatus === "error";
    
    if (wasSubmitting && isNowReady) {
      const textarea = document.getElementById("chat-input") as HTMLTextAreaElement;
      textarea?.focus();
    }
    
    previousSubmitStatusRef.current = submitStatus;
  }, [submitStatus]);

  const handleSubmit = useCallback(
    async (message: { text: string }) => {
      const text = message.text.trim();
      if (!text || !chat) return;

      setSubmitStatus("submitted");

      const listKey = orpc.chat.list.queryOptions().queryKey;
      const getKey = orpc.chat.get.queryOptions({ input: { id: chatId } }).queryKey;

      // Save previous state for rollback
      previousDataRef.current = {
        chat: queryClient.getQueryData(getKey),
        list: queryClient.getQueryData(listKey),
      };

      const isFirstMessage = chat.messages.length === 0;
      const title = isFirstMessage ? text.slice(0, 30) : undefined;

      // Generate temporary IDs
      const userMessageId = `temp-user-${Date.now()}`;
      const assistantMessageId = `temp-assistant-${Date.now()}`;

      // Optimistic UI: Add user message and empty assistant message
      const userMessage: ChatMessage = {
        id: userMessageId,
        chatId,
        role: "user",
        content: text,
        sources: null,
        createdAt: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        chatId,
        role: "assistant",
        content: "",
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
        setSubmitStatus("streaming");
        let accumulatedContent = "";
        let latestSources: { title: string; url: string }[] = [];

        // Call sendMessage and consume the stream
        const stream = await client.chat.sendMessage({
          chatId,
          content: text,
          title,
          demo: false,
        });

        for await (const event of stream as AsyncIterable<StreamEvent>) {
          if (event.type === "status") {
            if (event.code === "STATUS_RETRYING") {
              setCurrentStatusCode(event.code);
              setStatusParams(event.params ?? null);
            } else if (event.code === "STATUS_SUCCESS") {
              setCurrentStatusCode(null);
              setStatusParams(null);
            } else if (event.code === "STATUS_ERROR") {
              setCurrentStatusCode(event.code);
              setStatusParams(null);
              setSubmitStatus("error");
              hasError = true;
            }
          } else if (event.type === "content") {
            accumulatedContent += event.response;
            setStreamingContent(accumulatedContent);

            if (event.contexts) {
              latestSources = event.contexts.map((c) => ({
                title: c.title,
                url: c.url ?? "",
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
                        sources: latestSources.length > 0 ? latestSources : m.sources,
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

        setSubmitStatus("ready");
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
        setCurrentStatusCode("STATUS_ERROR");
        setSubmitStatus("error");
        hasError = true;
      } finally {
        setStreamingContent("");
        if (!hasError) {
          setStreamingMessageId(null);
        }
      }
    },
    [chat, chatId, queryClient]
  );

  if (isLoading || (!chat && !error)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader size={24} />
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t("chat.notFound")}</p>
      </div>
    );
  }

  const isSubmitting = submitStatus === "submitted" || submitStatus === "streaming";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0 h-full">
        {chat.messages.length === 0 && !streamingMessageId ? (
          <ConversationEmptyState
            title={t("chat.emptyTitle")}
            description={t("chat.emptyDescription")}
          />
        ) : (
          <Conversation className="h-full">
            <ConversationContent className="max-w-3xl mx-auto pb-4">
              {chat.messages.map((message: ChatMessage) => {
                const isAssistant = message.role === "assistant";
                const isStreaming = message.id === streamingMessageId;
                const hasContent = message.content.length > 0;
                const isWaitingForResponse = isStreaming && !hasContent && !currentStatusCode;
                const isActivelyStreaming = isStreaming && hasContent && !currentStatusCode && submitStatus === "streaming";
                const hasStatusCode = isStreaming && currentStatusCode;

                return (
                  <div key={message.id} className={`flex gap-4 ${isAssistant ? "" : "justify-end"}`}>
                    {isAssistant && <AssistantAvatar className="mt-1" />}
                    <div className="flex-1 min-w-0">
                      <Message from={message.role}>
                        <MessageContent>
                          {isWaitingForResponse ? (
                            <LoadingDots />
                          ) : hasStatusCode ? (
                            <MessageStatus code={currentStatusCode} params={statusParams ?? undefined} />
                          ) : (
                            <div className="inline">
                              <MessageResponse>{message.content}</MessageResponse>
                              {isActivelyStreaming && <TypingCursor />}
                            </div>
                          )}
                        </MessageContent>
                        {message.sources && message.sources.length > 0 && (
                          <Sources>
                            <SourcesTrigger count={message.sources.length} />
                            <SourcesContent>
                              {message.sources.map((source, idx) => (
                                <Source key={idx} href={source.url} title={source.title} />
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

      <div className="bg-background px-4 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              id="chat-input"
              placeholder={t("chat.inputPlaceholder")}
              disabled={isSubmitting}
            />
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit disabled={isSubmitting} status={submitStatus} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
