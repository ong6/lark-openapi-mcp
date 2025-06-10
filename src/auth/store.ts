import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { storageManager } from './utils/storage-manager';
import { StorageData } from './types';

export class AuthStore implements OAuthRegisteredClientsStore {
  private storageDataCache: StorageData = { tokens: {}, clients: {} };
  private codeVerifiers: Map<string, string> = new Map();
  private initializePromise: Promise<void> | undefined;

  constructor() {
    this.initialize()
      .then(() => this.clearExpiredTokens())
      .catch((error) => {
        console.error('Failed to initialize AuthStore:', error);
      });
  }

  private async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }
    this.initializePromise = this.loadFromStorage();
    return this.initializePromise;
  }

  private async loadFromStorage(): Promise<void> {
    const storageData = await storageManager.loadStorageData();
    this.storageDataCache = storageData;
  }

  private async saveToStorage(): Promise<void> {
    await storageManager.saveStorageData(this.storageDataCache);
  }

  private async clearExpiredTokens(): Promise<void> {
    await this.initialize();
    if (!this.storageDataCache || !this.storageDataCache.tokens) {
      return;
    }
    const now = Date.now() / 1000;
    let hasExpiredTokens = false;

    for (const token of Object.values(this.storageDataCache.tokens)) {
      // 7 days after expires clear the token
      if (token.expiresAt && token.expiresAt + 7 * 24 * 60 * 60 < now) {
        delete this.storageDataCache.tokens[token.token];
        hasExpiredTokens = true;
      }
    }

    if (this.storageDataCache.localTokens) {
      for (const [key, value] of Object.entries(this.storageDataCache.localTokens)) {
        if (!this.storageDataCache.tokens[value] && this.storageDataCache.localTokens?.[key]) {
          delete this.storageDataCache.localTokens[key];
          hasExpiredTokens = true;
        }
      }
    }

    if (hasExpiredTokens) {
      await this.saveToStorage();
    }
  }

  async storeToken(token: AuthInfo): Promise<AuthInfo> {
    await this.initialize();
    this.storageDataCache.tokens[token.token] = token;
    await this.saveToStorage();
    return token;
  }

  async removeToken(accessToken: string): Promise<void> {
    await this.initialize();
    delete this.storageDataCache.tokens[accessToken];
    await this.saveToStorage();
  }

  async getToken(accessToken: string): Promise<AuthInfo | undefined> {
    await this.initialize();
    return this.storageDataCache.tokens[accessToken];
  }

  async getTokenByRefreshToken(refreshToken: string): Promise<AuthInfo | undefined> {
    await this.initialize();
    return Object.values(this.storageDataCache.tokens).find((token) => token.extra?.refreshToken === refreshToken);
  }

  async getLocalAccessToken(appId: string): Promise<string | undefined> {
    await this.initialize();

    return this.storageDataCache.localTokens?.[appId];
  }

  async storeLocalAccessToken(accessToken: string, appId: string): Promise<string> {
    await this.initialize();

    if (!this.storageDataCache.localTokens) {
      this.storageDataCache.localTokens = {};
    }
    this.storageDataCache.localTokens[appId] = accessToken;

    await this.saveToStorage();
    return accessToken;
  }

  async removeLocalAccessToken(appId: string): Promise<void> {
    await this.initialize();

    if (this.storageDataCache.localTokens?.[appId]) {
      const tokenToRemove = this.storageDataCache.localTokens[appId];
      delete this.storageDataCache.tokens[tokenToRemove];
      delete this.storageDataCache.localTokens[appId];
    }

    await this.saveToStorage();
  }

  async removeAllLocalAccessTokens(): Promise<void> {
    await this.initialize();
    this.storageDataCache.localTokens = {};
    await this.saveToStorage();
  }

  async getAllLocalAccessTokens(): Promise<{ [appId: string]: string }> {
    await this.initialize();
    return this.storageDataCache.localTokens || {};
  }

  async registerClient(client: OAuthClientInformationFull): Promise<OAuthClientInformationFull> {
    await this.initialize();
    this.storageDataCache.clients[client.client_id] = client;
    await this.saveToStorage();
    return client;
  }

  async getClient(id: string): Promise<OAuthClientInformationFull | undefined> {
    await this.initialize();
    return this.storageDataCache.clients[id];
  }

  async removeClient(clientId: string): Promise<void> {
    await this.initialize();
    delete this.storageDataCache.clients[clientId];
    await this.saveToStorage();
  }

  storeCodeVerifier(key: string, codeVerifier: string): void {
    this.codeVerifiers.set(key, codeVerifier);
  }

  getCodeVerifier(key: string): string | undefined {
    return this.codeVerifiers.get(key);
  }

  removeCodeVerifier(key: string): void {
    this.codeVerifiers.delete(key);
  }

  clearExpiredCodeVerifiers(): void {
    this.codeVerifiers.clear();
  }
}

export const authStore = new AuthStore();
