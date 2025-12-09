import { logger } from './logger';
import { getRagProvider } from './rag-adapter';
import { ragConfigService } from './rag-config';

type BackendUrl = string;
type CapabilityKey = string; // Normalized key for lookups: "lang-domain" (lowercase)

type CapabilityInfo = {
  url: BackendUrl;
  language: string;
  domain: string;
};

declare global {
  // eslint-disable-next-line no-var
  var ragDiscoveryServiceInstance: RagDiscoveryService | undefined;
}

class RagDiscoveryService {
  private capabilityMap: Map<CapabilityKey, CapabilityInfo> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private isMock = false;

  public static getInstance(): RagDiscoveryService {
    if (!globalThis.ragDiscoveryServiceInstance) {
      globalThis.ragDiscoveryServiceInstance = new RagDiscoveryService();
    }
    return globalThis.ragDiscoveryServiceInstance;
  }

  public async initialize(): Promise<void> {
    this.isMock = process.env.RAG_PROVIDER === 'mock';
    logger.info({ isMock: this.isMock }, 'Initializing RagDiscoveryService');

    if (this.isMock) {
      try {
        const provider = getRagProvider();
        const config = await provider.getConfig();

        this.capabilityMap.clear();
        for (const mode of config.modes) {
          const key = this.normalizeKey(mode.language, mode.domain);
          this.capabilityMap.set(key, {
            url: 'mock-provider',
            language: mode.language,
            domain: mode.domain,
          });
        }
        logger.info(
          { capabilities: Array.from(this.capabilityMap.keys()) },
          'Mock capabilities loaded',
        );
      } catch (error) {
        logger.error({ err: error }, 'Failed to load mock capabilities');
        throw new Error('RAG Discovery Initialization Failed: Mock capabilities load error.');
      }
    } else {
      try {
        await this.refreshCapabilities();
      } catch (error) {
        logger.error({ err: error }, 'Initial discovery refresh failed');
      }

      if (this.capabilityMap.size === 0) {
        logger.warn('Discovery initialized with 0 capabilities; will keep polling');
      }
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

  public findBackend(language: string, domain: string): {
    url: string;
    language: string;
    domain: string;
  } | null {
    // 1. Exact match
    const exactKey = this.normalizeKey(language, domain);
    if (this.capabilityMap.has(exactKey)) {
      const info = this.capabilityMap.get(exactKey)!;
      return {
        url: info.url,
        language: info.language,
        domain: info.domain,
      };
    }

    // 2. Language wildcard
    const langWildcard = this.normalizeKey(language, null); // "lang-*"
    if (this.capabilityMap.has(langWildcard)) {
      const info = this.capabilityMap.get(langWildcard)!;
      return {
        url: info.url,
        language: info.language,
        domain: info.domain,
      };
    }

    // 3. Domain wildcard
    const domainWildcard = this.normalizeKey(null, domain); // "*-domain"
    if (this.capabilityMap.has(domainWildcard)) {
      const info = this.capabilityMap.get(domainWildcard)!;
      return {
        url: info.url,
        language: info.language,
        domain: info.domain,
      };
    }

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
    for (const info of this.capabilityMap.values()) {
      const language = info.language || null;
      const domain = info.domain || null;

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
    let servers: string[];

    if (ragConfigService.isInitialized()) {
      servers = ragConfigService.getServerUrls();
    } else {
      servers = (process.env.RAG_SERVERS || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    if (servers.length === 0) {
      logger.warn('No RAG_SERVERS configured for discovery');
      return;
    }

    const newMap = new Map<CapabilityKey, CapabilityInfo>();

    for (const url of servers) {
      try {
        const config = await this.fetchConfigWithRetry(url);
        for (const mode of config.modes) {
          const key = this.normalizeKey(mode.language, mode.domain);
          newMap.set(key, {
            url,
            language: mode.language,
            domain: mode.domain,
          });
        }
        logger.info({ url, modesCount: config.modes.length }, 'Config fetched successfully');
      } catch (error) {
        logger.error(
          { err: error, url },
          'Failed to fetch config from backend after retries',
        );
      }
    }

    this.capabilityMap = newMap;
    logger.info({ capabilities: Array.from(this.capabilityMap.keys()) }, 'Map Updated');
  }

  private async fetchConfigWithRetry(url: string): Promise<{ modes: { language: string; domain: string }[] }> {
    const retries = parseInt(process.env.RAG_DISCOVERY_RETRIES || '3', 10);
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.fetchConfig(url);
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          logger.warn({ url, attempt: attempt + 1, err: error }, 'Retrying discovery fetch...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simple 1s backoff
        }
      }
    }
    throw lastError;
  }

  private async fetchConfig(
    url: string,
  ): Promise<{ modes: { language: string; domain: string }[] }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ragConfigService.isInitialized()) {
      Object.assign(headers, ragConfigService.getAuthHeader(url));
    }

    try {
      const response = await fetch(`${url}/get_config`, {
        signal: controller.signal,
        headers,
      });

      if (response.status === 401) {
        logger.error({ url }, 'Authentication failed for RAG backend');
        throw new Error('Authentication failed');
      }

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