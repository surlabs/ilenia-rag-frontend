import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { cookies } from "next/headers";
import type { AppRouterClient } from "../../../server/src/routers/index";

export async function getServerClient(): Promise<AppRouterClient> {
	const cookieStore = await cookies();
	const cookieHeader = cookieStore
		.getAll()
		.map((c) => `${c.name}=${c.value}`)
		.join("; ");

	const link = new RPCLink({
  url: 'http://server:3000/rpc',
  fetch(url, options) {
    return fetch(url, {
      ...options,
      headers: {
        Cookie: cookieHeader,
      },
    });
  },
});

	return createORPCClient(link) as AppRouterClient;
}
