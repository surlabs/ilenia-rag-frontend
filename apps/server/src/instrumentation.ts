export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ragDiscoveryService } = await import('./lib/rag-discovery');
    await ragDiscoveryService.initialize();
    const interval = parseInt(
      process.env.RAG_DISCOVERY_INTERVAL_MS || '300000',
      10,
    );
    ragDiscoveryService.startPolling(interval);
  }
}
