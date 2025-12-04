import { logger } from './logger';

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
    const credentials = credentialsEnv.split(',').map(c => c.trim()).filter(Boolean);

    if (serverUrls.length === 0) {
      throw new Error('RAG_SERVERS is required when RAG_PROVIDER=real');
    }

    if (serverUrls.length !== credentials.length) {
      throw new Error(
        `Mismatch between RAG_SERVERS (${serverUrls.length}) and RAG_SERVER_CREDENTIALS (${credentials.length}) count`
      );
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

    for (let i = 0; i < serverUrls.length; i++) {
      const url = serverUrls[i];
      const [user, password] = this.parseCredentials(credentials[i]);

      const config: RagServerConfig = {
        url,
        user,
        password,
        isMaster: url === masterUrl,
      };

      this.servers.push(config);
      this.credentialsMap.set(url, { user, password });
    }

    this.initialized = true;

    logger.info(
      { serverCount: this.servers.length, masterUrl: this.masterUrl },
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
