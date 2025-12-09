import { logger } from './logger';

const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  logger.warn('Development mode: TLS certificate verification is disabled');
}

declare global {
  // eslint-disable-next-line no-var
  var ragConfigServiceInstance: RagConfigService | undefined;
}

export type RagServerConfig = {
  url: string;
  user: string;
  password: string;
  isMaster: boolean;
};

class RagConfigService {
  private servers: RagServerConfig[] = [];
  private credentialsMap: Map<string, { user: string; password: string }> = new Map();
  private masterUrl: string = '';
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    const serversEnv = process.env.RAG_SERVERS || '';
    const credentialsEnv = process.env.RAG_SERVER_CREDENTIALS || '';
    const masterUrl = process.env.RAG_MASTER_URL || '';

    const serverUrls = serversEnv.split(',').map(s => s.trim()).filter(Boolean);
    const credentials = credentialsEnv.split(',').map(c => c.trim());

    if (serverUrls.length === 0) {
      throw new Error('RAG_SERVERS is required when RAG_PROVIDER=real');
    }

    if (!masterUrl) {
      throw new Error('RAG_MASTER_URL is required when RAG_PROVIDER=real');
    }

    if (!serverUrls.includes(masterUrl)) {
      throw new Error('RAG_MASTER_URL must be one of RAG_SERVERS');
    }

    this.masterUrl = masterUrl;
    this.servers = [];
    this.credentialsMap.clear();

    const withCredentials: string[] = [];
    const withoutCredentials: string[] = [];

    for (let i = 0; i < serverUrls.length; i++) {
      const url = serverUrls[i];
      const credentialRaw = credentials[i]?.trim();
      let user = '';
      let password = '';

      if (credentialRaw) {
        [user, password] = this.parseCredentials(credentialRaw);
        this.credentialsMap.set(url, { user, password });
        withCredentials.push(url);
      } else {
        withoutCredentials.push(url);
      }

      const config: RagServerConfig = {
        url,
        user,
        password,
        isMaster: url === masterUrl,
      };

      this.servers.push(config);
    }

    this.initialized = true;

    logger.info(
      {
        serverCount: this.servers.length,
        masterUrl: this.masterUrl,
        withCredentials,
        withoutCredentials,
      },
      'RAG config initialized'
    );
  }

  private parseCredentials(credentialString: string): [string, string] {
    const colonIndex = credentialString.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(
        'Invalid credential format. Expected user:password'
      );
    }
    const user = credentialString.slice(0, colonIndex);
    const password = credentialString.slice(colonIndex + 1);
    return [user, password];
  }

  getAuthHeader(url: string): Record<string, string> {
    const creds = this.credentialsMap.get(url);
    if (!creds) {
      logger.warn({ url }, 'No credentials found for URL');
      return {};
    }

    const encoded = Buffer.from(`${creds.user}:${creds.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  getMasterUrl(): string {
    return this.masterUrl;
  }

  getServerUrls(): string[] {
    return this.servers.map(s => s.url);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

function getRagConfigService(): RagConfigService {
  if (!globalThis.ragConfigServiceInstance) {
    globalThis.ragConfigServiceInstance = new RagConfigService();
  }
  return globalThis.ragConfigServiceInstance;
}

export const ragConfigService = getRagConfigService();
