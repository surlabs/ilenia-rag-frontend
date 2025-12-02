import "dotenv/config";
import { db } from "./index";
import { chat, message, user } from "./schema";
import { eq } from "drizzle-orm";

function generateId(): string {
	return crypto.randomUUID();
}

function daysAgo(days: number): Date {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date;
}

async function seed() {
	console.log("🌱 Starting seed...");

	const users = await db.select().from(user).limit(1);
	if (users.length === 0) {
		console.log("❌ No users found. Please create a user first via the auth flow.");
		process.exit(1);
	}

	const testUser = users[0];
	console.log(`📧 Using user: ${testUser.email}`);

	await db.delete(message);
	await db.delete(chat);
	console.log("🗑️ Cleared existing chats and messages");

	const chatsData = [
		{ id: generateId(), title: "Estado del Euskera en IA", daysAgo: 0 },
		{ id: generateId(), title: "Resumen Proyecto ILENIA", daysAgo: 0 },
		{ id: generateId(), title: "Traducción Jurídica Gallego", daysAgo: 1 },
		{ id: generateId(), title: "Corpus Textual Catalán", daysAgo: 1 },
		{ id: generateId(), title: "Modelos ASR Multilingües", daysAgo: 5 },
		{ id: generateId(), title: "Benchmarks NLP Lenguas Cooficiales", daysAgo: 8 },
	];

	for (const c of chatsData) {
		const createdAt = daysAgo(c.daysAgo);
		await db.insert(chat).values({
			id: c.id,
			userId: testUser.id,
			title: c.title,
			createdAt,
			updatedAt: createdAt,
		});
	}
	console.log(`✅ Created ${chatsData.length} chats`);

	const messagesData = [
		{
			chatId: chatsData[0].id,
			messages: [
				{ role: "user" as const, content: "¿Cuál es el estado actual del euskera en los modelos de IA?" },
				{
					role: "assistant" as const,
					content:
						"El euskera presenta desafíos únicos para los modelos de IA debido a su estructura aglutinante y recursos limitados. Sin embargo, proyectos como ILENIA están trabajando activamente en mejorar esta situación.",
					sources: [
						{ title: "ILENIA - Euskera", url: "https://ilenia.es/euskera" },
						{ title: "HiTZ Center", url: "https://hitz.eus" },
					],
				},
			],
		},
		{
			chatId: chatsData[1].id,
			messages: [
				{ role: "user" as const, content: "Dame un resumen del proyecto ILENIA" },
				{
					role: "assistant" as const,
					content:
						"ILENIA es un proyecto de infraestructura lingüística para las lenguas cooficiales de España. Su objetivo es desarrollar recursos y herramientas de procesamiento del lenguaje natural para el euskera, catalán, gallego y valenciano.",
					sources: [{ title: "Proyecto ILENIA", url: "https://ilenia.es" }],
				},
			],
		},
		{
			chatId: chatsData[2].id,
			messages: [
				{ role: "user" as const, content: "Necesito traducir documentos jurídicos al gallego" },
				{
					role: "assistant" as const,
					content:
						"Para traducción jurídica al gallego, recomiendo utilizar los recursos del ProLNat@GE junto con revisión humana especializada. Los términos jurídicos requieren precisión y contexto legal específico.",
				},
			],
		},
	];

	let messageCount = 0;
	for (const chatMessages of messagesData) {
		for (const m of chatMessages.messages) {
			await db.insert(message).values({
				id: generateId(),
				chatId: chatMessages.chatId,
				role: m.role,
				content: m.content,
				sources: "sources" in m ? m.sources : null,
				createdAt: new Date(),
			});
			messageCount++;
		}
	}
	console.log(`✅ Created ${messageCount} messages`);

	console.log("🌱 Seed complete!");
	process.exit(0);
}

seed().catch((err) => {
	console.error("❌ Seed failed:", err);
	process.exit(1);
});
