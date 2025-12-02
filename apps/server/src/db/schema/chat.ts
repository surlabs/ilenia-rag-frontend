import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	json,
	mysqlEnum,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";

export const chat = mysqlTable("chat", {
	id: varchar("id", { length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	title: varchar("title", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const message = mysqlTable("message", {
	id: varchar("id", { length: 36 }).primaryKey(),
	chatId: varchar("chat_id", { length: 36 })
		.notNull()
		.references(() => chat.id, { onDelete: "cascade" }),
	role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
	content: text("content").notNull(),
	sources: json("sources").$type<{ title: string; url: string }[]>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
