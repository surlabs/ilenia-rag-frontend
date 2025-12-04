import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { RagCapability } from "@/components/rag-context-selector";

type RagCapabilitiesResponse = {
  modes: RagCapability[];
};

export function useRagCapabilities() {
  const { data, isLoading, error } = useQuery({
    ...orpc.rag.getCapabilities.queryOptions(),
    queryKey: ["rag", "capabilities"],
    staleTime: 10 * 60 * 1000,
  });

  return {
    capabilities: (data as RagCapabilitiesResponse | undefined)?.modes ?? [],
    isLoading,
    error,
  };
}
