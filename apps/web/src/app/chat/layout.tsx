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
		const chats = await client.chat.list();

		queryClient.setQueryData(["chat", "list"], chats);
	} catch {
		// User not authenticated, will show empty state
	}

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{children}
		</HydrationBoundary>
	);
}
