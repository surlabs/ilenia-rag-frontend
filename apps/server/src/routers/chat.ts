import { z } from "zod";
import { protectedProcedure } from "../lib/orpc";
import { db } from "../db";
import { chat, message } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

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
		.input(z.object({ title: z.string().optional() }))
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const id = crypto.randomUUID();
			const title = input.title || "Nueva conversación";
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
};
