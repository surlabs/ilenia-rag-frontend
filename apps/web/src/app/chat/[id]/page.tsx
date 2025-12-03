"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
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
import { useTranslation } from "@/providers/i18n-provider";

type ChatMessage = {
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
	const { t } = useTranslation();

	const { data: chat, isLoading, isFetching, error } = useQuery({
		...orpc.chat.get.queryOptions({ input: { id: chatId } }),
		enabled: !!chatId,
	});

	if (isLoading || isFetching || (!chat && !error)) {
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

	if (chat.messages.length === 0) {
		return (
			<ConversationEmptyState
				title={t("chat.emptyTitle")}
				description={t("chat.emptyDescription")}
			/>
		);
	}

	return (
		<Conversation>
			<ConversationContent className="max-w-3xl mx-auto">
				{chat.messages.map((message: ChatMessage) => (
					<Message key={message.id} from={message.role}>
						<MessageContent>
							<MessageResponse>{message.content}</MessageResponse>
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
				))}
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	);
}
