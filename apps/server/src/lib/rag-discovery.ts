import { logger } from './logger';
import { getRagProvider } from './rag-adapter';

type BackendUrl = string;
type CapabilityKey = string; // "lang-domain"

class RagDiscoveryService {
  private static instance: RagDiscoveryService;
  private capabilityMap: Map<CapabilityKey, BackendUrl> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private isMock = false;

  private constructor() {}

  public static getInstance(): RagDiscoveryService {
    if (!RagDiscoveryService.instance) {
      RagDiscoveryService.instance = new RagDiscoveryService();
    }
    return RagDiscoveryService.instance;
  }

  public async initialize(): Promise<void> {
    this.isMock = process.env.RAG_PROVIDER === 'mock';
    logger.info({ isMock: this.isMock }, 'Initializing RagDiscoveryService');

    if (this.isMock) {
      try {
        const provider = getRagProvider();
        const config = await provider.getConfig();

        this.capabilityMap.clear();
        // For mock, we map capabilities but URL is irrelevant as we use the provider directly
        // But to satisfy findBackend contract, we can store a "mock" placeholder
        for (const mode of config.modes) {
          const key = this.normalizeKey(mode.language, mode.domain);
          this.capabilityMap.set(key, 'mock-provider');
        }
        logger.info(
          { capabilities: Array.from(this.capabilityMap.keys()) },
          'Mock capabilities loaded',
        );
      } catch (error) {
        logger.error({ err: error }, 'Failed to load mock capabilities');
      }
    } else {
      // Initial active discovery
      await this.refreshCapabilities();
    }
  }

  public startPolling(intervalMs: number): void {
    if (this.isMock) {
      logger.info('Polling disabled in mock mode');
      return;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    logger.info({ intervalMs }, 'Starting RAG discovery polling');
    this.pollingInterval = setInterval(() => {
      this.refreshCapabilities().catch((err) => {
        logger.error({ err }, 'Error during scheduled polling');
      });
    }, intervalMs);
  }

  public findBackend(language: string, domain: string): string | null {
    // 1. Exact match
    const exactKey = this.normalizeKey(language, domain);
    if (this.capabilityMap.has(exactKey))
      return this.capabilityMap.get(exactKey)!;

    // 2. Language wildcard
    const langWildcard = this.normalizeKey(language, null); // "lang-*"
    if (this.capabilityMap.has(langWildcard))
      return this.capabilityMap.get(langWildcard)!;

    // 3. Domain wildcard
    const domainWildcard = this.normalizeKey(null, domain); // "*-domain"
    if (this.capabilityMap.has(domainWildcard))
      return this.capabilityMap.get(domainWildcard)!;

    return null;
  }

  public getCapabilities(): {
    language: string | null;
    domain: string | null;
    label: string;
  }[] {
    const caps: {
      language: string | null;
      domain: string | null;
      label: string;
    }[] = [];
    for (const key of this.capabilityMap.keys()) {
      const [lang, dom] = key.split('-');
      const language = lang === '*' ? null : lang;
      const domain = dom === '*' ? null : dom;

      // Simple label generation
      const langLabel = language ? language.toUpperCase() : 'Multilingüe';
      const domLabel =
        domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'General';

      caps.push({
        language,
        domain,
        label: `${domLabel} · ${langLabel}`,
      });
    }
    return caps;
  }

  private normalizeKey(
    language: string | null | 'any',
    domain: string | null | 'any',
  ): string {
    const l =
      language === null || language === 'any' ? '*' : language.toLowerCase();
    const d = domain === null || domain === 'any' ? '*' : domain.toLowerCase();
    return `${l}-${d}`;
  }

  private async refreshCapabilities(): Promise<void> {
    const servers = (process.env.RAG_SERVERS || '').split(',').filter(Boolean);
    if (servers.length === 0) {
      logger.warn('No RAG_SERVERS configured for discovery');
      return;
    }

    const newMap = new Map<CapabilityKey, BackendUrl>();

    for (const url of servers) {
      try {
        const config = await this.fetchConfig(url.trim());
        for (const mode of config.modes) {
          const key = this.normalizeKey(mode.language, mode.domain);
          newMap.set(key, url.trim());
        }
      } catch (error) {
        logger.error(
          { err: error, url },
          'Failed to fetch config from backend',
        );
        // Continue to next server
      }
    }

    this.capabilityMap = newMap;
    logger.info({ capabilities: Array.from(this.capabilityMap.keys()) }, 'Map Updated');
  }

  private async fetchConfig(
    url: string,
  ): Promise<{ modes: { language: string; domain: string }[] }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(`${url}/get_config`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.json()) as {
        modes: { language: string; domain: string }[];
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const ragDiscoveryService = RagDiscoveryService.getInstance();
