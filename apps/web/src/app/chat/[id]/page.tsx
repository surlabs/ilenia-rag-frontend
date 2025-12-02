"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { cn } from "@/lib/utils";
import { Loader2, ExternalLink } from "lucide-react";

type Message = {
	id: string;
	chatId: string;
	role: "user" | "assistant" | "system";
	content: string;
	sources: { title: string; url: string }[] | null;
	createdAt: Date;
};

export default function ChatDetailPage() {
	const params = useParams();
	const chatId = params.id as string;

	const { data: chat, isLoading, error } = useQuery({
		...orpc.chat.get.queryOptions({ input: { id: chatId } }),
		enabled: !!chatId,
	});

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error || !chat) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-muted-foreground">Conversación no encontrada</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex-1 overflow-auto p-4 space-y-4">
				{chat.messages.map((message: Message) => (
					<div
						key={message.id}
						className={cn(
							"flex flex-col gap-2 max-w-2xl",
							message.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
						)}
					>
						<div
							className={cn(
								"rounded-lg px-4 py-2 text-sm",
								message.role === "user"
									? "bg-sky-600 text-white"
									: "bg-muted"
							)}
						>
							{message.content}
						</div>
						{message.sources && message.sources.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{message.sources.map((source, idx) => (
									<a
										key={idx}
										href={source.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
									>
										<ExternalLink className="h-3 w-3" />
										{source.title}
									</a>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
