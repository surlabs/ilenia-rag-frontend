export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('./lib/logger');

    if (process.env.RAG_PROVIDER === 'real') {
      const { ragConfigService } = await import('./lib/rag-config');
      try {
        ragConfigService.initialize();
        logger.info(
          { serverCount: ragConfigService.getServerUrls().length },
          'RAG config initialized'
        );
      } catch (error) {
        logger.fatal({ err: error }, 'Failed to initialize RAG config');
        throw error;
      }
    }

    const { ragDiscoveryService } = await import('./lib/rag-discovery');
    await ragDiscoveryService.initialize();
    const interval = parseInt(
      process.env.RAG_DISCOVERY_INTERVAL_MS || '300000',
      10,
    );
    ragDiscoveryService.startPolling(interval);
  }
}
