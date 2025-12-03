import { publicProcedure } from '../lib/orpc';
import { ragDiscoveryService } from '../lib/rag-discovery';

export const ragRouter = {
  getCapabilities: publicProcedure.handler(async () => {
    const capabilities = ragDiscoveryService.getCapabilities();
    return { modes: capabilities };
  }),
};
