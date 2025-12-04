import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/query-client";
import { getServerClient } from "@/lib/orpc-server";

export default async function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = makeQueryClient();

	try {
		const client = await getServerClient();
		const [chats, ragCapabilities] = await Promise.all([
			client.chat.list(),
			client.rag.getCapabilities(),
		]);

		queryClient.setQueryData(["chat", "list"], chats);
		queryClient.setQueryData(["rag", "capabilities"], ragCapabilities);
	} catch {
		// User not authenticated or RAG service unavailable
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{children}
		</HydrationBoundary>
	);
}
