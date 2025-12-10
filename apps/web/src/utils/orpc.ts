import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppRouterClient } from "../../../server/src/routers/index";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // 1. LOGUEAR EL ERROR REAL PARA PODER VERLO
      console.error('🚨 ORPC Error:', error);

      // 2. Comprobación de Auth mejorada
      const errorMessage = error.message?.toLowerCase() || '';
      const isAuthError =
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('401') ||
        errorMessage.includes('unauthenticated') ||
        errorMessage.includes('session not found');

      if (isAuthError) return;

      toast.error('Ha ocurrido un error. Por favor, inténtalo de nuevo.', {
        description: error.message,
        action: {
          label: 'Reintentar',
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: 'include',
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
