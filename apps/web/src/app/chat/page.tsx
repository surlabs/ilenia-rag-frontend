"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/utils/orpc";
import { useTranslation } from "@/providers/i18n-provider";
import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ai-elements/loader";
import { MessageSquarePlus } from "lucide-react";

export default function ChatPage() {
	const router = useRouter();
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const { data: chats, isLoading } = useQuery({
		...orpc.chat.list.queryOptions(),
	});

	const createChatMutation = useMutation({
		mutationFn: () => client.chat.create({ title: t("chat.newConversation") }),
		onSuccess: (newChat) => {
			queryClient.invalidateQueries({ queryKey: orpc.chat.list.queryOptions().queryKey });
			router.push(`/chat/${newChat.id}`);
		},
	});

	useEffect(() => {
		if (!isLoading && chats && chats.length > 0) {
			router.replace(`/chat/${chats[0].id}`);
		}
	}, [chats, isLoading, router]);

	if (isLoading || (chats && chats.length > 0)) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader size={24} />
			</div>
		);
	}

	return (
		<ConversationEmptyState
			title={t("sidebar.noChats")}
			description={t("chat.emptyDescription")}
		>
			<div className="flex flex-col items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<MessageSquarePlus className="h-6 w-6 text-muted-foreground" />
				</div>
				<div className="space-y-1 text-center">
					<h3 className="font-medium text-sm">{t("sidebar.noChats")}</h3>
					<p className="text-muted-foreground text-sm">{t("chat.emptyDescription")}</p>
				</div>
				<Button
					onClick={() => createChatMutation.mutate()}
					disabled={createChatMutation.isPending}
				>
					{createChatMutation.isPending ? (
						<Loader size={16} className="mr-2" />
					) : (
						<MessageSquarePlus className="mr-2 h-4 w-4" />
					)}
					{t("common.newChat")}
				</Button>
			</div>
		</ConversationEmptyState>
	);
}
