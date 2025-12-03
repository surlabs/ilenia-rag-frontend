import { z } from "zod";
import { protectedProcedure } from "../lib/orpc";
import { db } from "../db";
import { chat, message } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getRagProvider, type Context } from "../lib/rag-adapter";
import { ragDiscoveryService } from "../lib/rag-discovery";
import { retryWithStatusGenerator } from "../lib/retry-with-status";
import {
	STATUS_ERROR,
	type StreamEvent,
} from "../lib/stream-events";

export const chatRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const chats = await db
			.select({
				id: chat.id,
				title: chat.title,
				createdAt: chat.createdAt,
				updatedAt: chat.updatedAt,
			})
			.from(chat)
			.where(eq(chat.userId, userId))
			.orderBy(desc(chat.createdAt));

		const chatsWithLastMessage = await Promise.all(
			chats.map(async (c) => {
				const [lastMsg] = await db
					.select({ content: message.content })
					.from(message)
					.where(eq(message.chatId, c.id))
					.orderBy(desc(message.createdAt))
					.limit(1);
				return {
					...c,
					lastMessage: lastMsg?.content ?? null,
				};
			})
		);

		return chatsWithLastMessage;
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const [chatData] = await db
				.select()
				.from(chat)
				.where(and(eq(chat.id, input.id), eq(chat.userId, userId)))
				.limit(1);

			if (!chatData) {
				return null;
			}

			const messages = await db
				.select()
				.from(message)
				.where(eq(message.chatId, input.id))
				.orderBy(message.createdAt);

			return {
				...chatData,
				messages,
			};
		}),

	create: protectedProcedure
		.input(z.object({ title: z.string() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const id = crypto.randomUUID();
			const title = input.title;
			const now = new Date();

			await db.insert(chat).values({
				id,
				userId,
				title,
				createdAt: now,
				updatedAt: now,
			});

			return { id, userId, title, createdAt: now, updatedAt: now };
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			await db
				.delete(chat)
				.where(and(eq(chat.id, input.id), eq(chat.userId, userId)));

			return { success: true };
		}),

	sendMessage: protectedProcedure
		.input(
			z.object({
				chatId: z.string(),
				content: z.string().min(1),
				title: z.string().optional(),
				language: z.string().optional(),
				domain: z.string().optional(),
				demo: z.boolean().optional(),
			})
		)
		.handler(async function* ({ input, context }): AsyncGenerator<StreamEvent> {
			const userId = context.session.user.id;
			const { chatId, content, title, language, domain, demo } = input;

			logger.info(
				{ chatId, contentLength: content.length, demo: !!demo },
				"sendMessage: Starting request"
			);

			// Verify chat belongs to user
			const [chatData] = await db
				.select()
				.from(chat)
				.where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
				.limit(1);

			if (!chatData) {
				yield {
					type: "status",
					code: STATUS_ERROR,
					params: { message: "Chat not found" },
				};
				return;
			}

			// Update title if provided (first message optimistic title)
			if (title) {
				await db.update(chat).set({ title }).where(eq(chat.id, chatId));
			}

			// Persist user message
			const userMessageId = crypto.randomUUID();
			await db.insert(message).values({
				id: userMessageId,
				chatId,
				role: "user",
				content,
				createdAt: new Date(),
			});

			// Load chat history for RAG context
			const history = await db
				.select({ role: message.role, content: message.content })
				.from(message)
				.where(eq(message.chatId, chatId))
				.orderBy(message.createdAt);

			// Determine RAG configuration
			let ragLanguage: string;
			let ragDomain: string;

			const provider = getRagProvider();

			if (demo) {
				// Demo mode: use mock provider with defaults
				ragLanguage = language || "es";
				ragDomain = domain || "general";
				logger.info(
					{ language: ragLanguage, domain: ragDomain },
					"sendMessage: Using demo mode"
				);
			} else if (language && domain) {
				// Explicit configuration provided
				ragLanguage = language;
				ragDomain = domain;
				logger.info(
					{ language: ragLanguage, domain: ragDomain },
					"sendMessage: RAG configuration provided by client"
				);
			} else {
				// Auto-configure using /configure
				try {
					const capabilities = ragDiscoveryService.getCapabilities();
					const availableConfigs = capabilities
						.filter((c) => c.language && c.domain)
						.map((c) => ({
							language: c.language!,
							domain: c.domain!,
						}));

					const config = await provider.configure({
						prompt: content,
						available_configs: availableConfigs,
						language: language || null,
						domain: domain || null,
					});

					ragLanguage = config.language;
					ragDomain = config.domain;
					logger.info(
						{ language: ragLanguage, domain: ragDomain },
						"sendMessage: RAG configuration resolved via /configure"
					);
				} catch (err) {
					logger.error(
						{ error: (err as Error).message },
						"sendMessage: Failed to configure RAG"
					);
					yield {
						type: "status",
						code: STATUS_ERROR,
						params: { message: "Failed to configure RAG service" },
					};
					return;
				}
			}

		// Stream response from RAG with retry logic
		let fullResponse = "";
		let sources: Context[] = [];

		const startStream = async () => {
			const iterator = provider.predict({
				history: history.map((h) => ({
					role: h.role,
					content: h.content,
				})),
				prompt: content,
				language: ragLanguage,
				domain: ragDomain,
			});

			const first = await iterator.next();
			if (first.done) {
				throw new Error("Empty stream from RAG provider");
			}

			return { iterator, firstChunk: first.value };
		};

		const retryGenerator = retryWithStatusGenerator(startStream);

		let retryResult: IteratorResult<
			{ type: "status"; code: string; params?: { attempt?: number; message?: string } },
			{ success: boolean; value?: { iterator: AsyncGenerator<{ response: string; contexts: Context[] | null }>; firstChunk: { response: string; contexts: Context[] | null } }; error?: Error }
		>;

		do {
			retryResult = await retryGenerator.next();
			if (!retryResult.done) {
				yield retryResult.value as StreamEvent;
			}
		} while (!retryResult.done);

		const result = retryResult.value;

		if (!result.success || !result.value) {
			logger.error(
				{ chatId, error: result.error?.message },
				"sendMessage: Critical error"
			);
			return;
		}

		logger.info({ chatId }, "sendMessage: RAG connection established");

		// Process first chunk
		fullResponse += result.value.firstChunk.response;
		if (result.value.firstChunk.contexts) {
			sources = result.value.firstChunk.contexts;
		}
		yield {
			type: "content",
			response: result.value.firstChunk.response,
			contexts: result.value.firstChunk.contexts,
		};

		// Continue streaming remaining chunks
		try {
			for await (const chunk of result.value.iterator) {
				fullResponse += chunk.response;
				if (chunk.contexts) {
					sources = chunk.contexts;
				}
				yield {
					type: "content",
					response: chunk.response,
					contexts: chunk.contexts,
				};
			}
		} catch (err) {
			yield {
				type: "status",
				code: STATUS_ERROR,
				params: { message: (err as Error).message },
			};
			return;
		}

			// Persist assistant message on successful completion
		if (fullResponse) {
			const assistantMessageId = crypto.randomUUID();
			await db.insert(message).values({
				id: assistantMessageId,
				chatId,
				role: "assistant",
				content: fullResponse,
				sources: sources.length > 0 ? sources.map((s) => ({ title: s.title, url: s.url || "" })) : null,
				createdAt: new Date(),
			});

			logger.info(
				{ chatId, responseLength: fullResponse.length },
				"sendMessage: Response persisted"
			);
		}
	}),
};
