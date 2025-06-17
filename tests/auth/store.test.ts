import { AuthStore, authStore } from '../../src/auth/store';
import { generatePKCEPair } from '../../src/auth/utils/pkce';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { storageManager } from '../../src/auth/utils/storage-manager';

// Mock StorageManager
jest.mock('../../src/auth/utils/storage-manager', () => ({
  storageManager: {
    loadStorageData: jest.fn(),
    saveStorageData: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
}));

// Mock isTokenExpired
jest.mock('../../src/auth/utils/is-token-valid', () => ({
  isTokenExpired: jest.fn(),
}));

import { isTokenExpired } from '../../src/auth/utils/is-token-valid';

const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
const mockIsTokenExpired = isTokenExpired as jest.MockedFunction<typeof isTokenExpired>;

describe('AuthStore', () => {
  let testAuthStore: AuthStore;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockStorageManager.loadStorageData.mockResolvedValue({ tokens: {}, clients: {} });
    mockStorageManager.saveStorageData.mockResolvedValue();
    mockStorageManager.encrypt.mockImplementation((data) => `encrypted:${data}`);
    mockStorageManager.decrypt.mockImplementation((data) => data.replace('encrypted:', ''));

    testAuthStore = new AuthStore();
  });

  afterEach(async () => {
    // Wait for any pending promises in constructor
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  describe('Expired Token Cleanup', () => {
    it('should automatically clear expired tokens on initialization', async () => {
      const now = Date.now() / 1000;
      const expiredToken: AuthInfo = {
        token: 'expired-token',
        clientId: 'test-client',
        scopes: ['read'],
        expiresAt: now - 8 * 24 * 60 * 60, // Expired 8 days ago (beyond 7 day threshold)
      };

      const validToken: AuthInfo = {
        token: 'valid-token',
        clientId: 'test-client',
        scopes: ['read'],
        expiresAt: now + 3600, // Expires in 1 hour
      };

      // Mock storage data with both expired and valid tokens
      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {
          'expired-token': expiredToken,
          'valid-token': validToken,
        },
        clients: {},
      });

      const newAuthStore = new AuthStore();

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Expired token should be removed, valid token should remain
      const retrievedExpiredToken = await newAuthStore.getToken('expired-token');
      const retrievedValidToken = await newAuthStore.getToken('valid-token');

      expect(retrievedExpiredToken).toBeUndefined();
      expect(retrievedValidToken).toEqual(validToken);

      // Should have called saveToStorage to persist the cleanup
      expect(mockStorageManager.saveStorageData).toHaveBeenCalled();
    });

    it('should not save to storage if no tokens are expired', async () => {
      const now = Date.now() / 1000;
      const validToken: AuthInfo = {
        token: 'valid-token',
        clientId: 'test-client',
        scopes: ['read'],
        expiresAt: now + 3600, // Expires in 1 hour
      };

      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {
          'valid-token': validToken,
        },
        clients: {},
      });

      const newAuthStore = new AuthStore();

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have called saveToStorage during cleanup since no tokens were expired
      expect(mockStorageManager.saveStorageData).not.toHaveBeenCalled();
    });

    it('should handle tokens without expiry dates', async () => {
      const tokenWithoutExpiry: AuthInfo = {
        token: 'no-expiry-token',
        clientId: 'test-client',
        scopes: ['read'],
        // No expiresAt field
      };

      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {
          'no-expiry-token': tokenWithoutExpiry,
        },
        clients: {},
      });

      const newAuthStore = new AuthStore();

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Token without expiry should not be removed
      const retrievedToken = await newAuthStore.getToken('no-expiry-token');
      expect(retrievedToken).toEqual(tokenWithoutExpiry);
    });

    it('should clean up local tokens when corresponding tokens are expired', async () => {
      const now = Date.now() / 1000;
      const expiredToken: AuthInfo = {
        token: 'expired-token',
        clientId: 'test-client',
        scopes: ['read'],
        expiresAt: now - 8 * 24 * 60 * 60, // Expired 8 days ago (beyond 7 day threshold)
      };

      const validToken: AuthInfo = {
        token: 'valid-token',
        clientId: 'test-client',
        scopes: ['read'],
        expiresAt: now + 3600, // Expires in 1 hour
      };

      // Mock storage data with expired and valid tokens, and local tokens pointing to both
      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {
          'expired-token': expiredToken,
          'valid-token': validToken,
        },
        clients: {},
        localTokens: {
          app1: 'expired-token', // This should be cleaned up
          app2: 'valid-token', // This should remain
        },
      });

      const newAuthStore = new AuthStore();

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Expired token should be removed
      const retrievedExpiredToken = await newAuthStore.getToken('expired-token');
      expect(retrievedExpiredToken).toBeUndefined();

      // Valid token should remain
      const retrievedValidToken = await newAuthStore.getToken('valid-token');
      expect(retrievedValidToken).toEqual(validToken);

      // Local token pointing to expired token should be cleaned up
      const localToken1 = await newAuthStore.getLocalAccessToken('app1');
      expect(localToken1).toBeUndefined();

      // Local token pointing to valid token should remain
      const localToken2 = await newAuthStore.getLocalAccessToken('app2');
      expect(localToken2).toBe('valid-token');

      // Should have called saveToStorage to persist the cleanup
      expect(mockStorageManager.saveStorageData).toHaveBeenCalled();
    });
  });

  describe('Storage Error Handling', () => {
    it('should handle save storage errors in storeToken', async () => {
      mockStorageManager.saveStorageData.mockRejectedValue(new Error('Storage save failed'));

      const token: AuthInfo = {
        token: 'test-token',
        clientId: 'test-client',
        scopes: ['read'],
      };

      await expect(testAuthStore.storeToken(token)).rejects.toThrow('Storage save failed');
    });

    it('should handle save storage errors in removeToken', async () => {
      mockStorageManager.saveStorageData.mockRejectedValue(new Error('Storage save failed'));

      await expect(testAuthStore.removeToken('test-token')).rejects.toThrow('Storage save failed');
    });

    it('should handle save storage errors in storeLocalAccessToken', async () => {
      mockStorageManager.saveStorageData.mockRejectedValue(new Error('Storage save failed'));

      await expect(testAuthStore.storeLocalAccessToken('test-token', 'test-app')).rejects.toThrow(
        'Storage save failed',
      );
    });

    it('should handle save storage errors in removeLocalAccessToken', async () => {
      mockStorageManager.saveStorageData.mockRejectedValue(new Error('Storage save failed'));

      await expect(testAuthStore.removeLocalAccessToken('test-app')).rejects.toThrow('Storage save failed');
    });

    it('should handle save storage errors in registerClient', async () => {
      mockStorageManager.saveStorageData.mockRejectedValue(new Error('Storage save failed'));

      const client = {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        redirect_uris: ['http://localhost:3000/callback'],
      };

      await expect(testAuthStore.registerClient(client)).rejects.toThrow('Storage save failed');
    });

    it('should handle save storage errors in removeClient', async () => {
      mockStorageManager.saveStorageData.mockRejectedValue(new Error('Storage save failed'));

      await expect(testAuthStore.removeClient('test-client')).rejects.toThrow('Storage save failed');
    });
  });

  describe('Token Management', () => {
    it('should store and retrieve tokens', async () => {
      const token: AuthInfo = {
        token: 'test-access-token',
        clientId: 'test-client',
        scopes: ['read', 'write'],
        expiresAt: Date.now() / 1000 + 3600, // 1 hour from now
      };

      const storedToken = await testAuthStore.storeToken(token);
      expect(storedToken).toEqual(token);

      // Verify storage was updated
      expect(mockStorageManager.saveStorageData).toHaveBeenCalled();

      // Test cache retrieval
      const retrievedToken = await testAuthStore.getToken(token.token);
      expect(retrievedToken).toEqual(token);
    });

    it('should return undefined for non-existent token', async () => {
      const retrievedToken = await testAuthStore.getToken('non-existent');
      expect(retrievedToken).toBeUndefined();
    });

    it('should remove tokens', async () => {
      const token: AuthInfo = {
        token: 'to-be-removed',
        clientId: 'test-client',
        scopes: ['read'],
      };

      // First store the token
      await testAuthStore.storeToken(token);

      // Then remove it
      await testAuthStore.removeToken(token.token);

      expect(mockStorageManager.saveStorageData).toHaveBeenCalledTimes(2); // store + remove

      // Should not be retrievable from cache
      const retrievedToken = await testAuthStore.getToken(token.token);
      expect(retrievedToken).toBeUndefined();
    });

    it('should retrieve token by refresh token', async () => {
      const refreshToken = 'test-refresh-token';
      const token: AuthInfo = {
        token: 'test-access-token',
        clientId: 'test-client',
        scopes: ['read'],
        extra: {
          refreshToken: refreshToken,
        },
      };

      // Store token with refresh token
      await testAuthStore.storeToken(token);

      // Retrieve by refresh token
      const retrievedToken = await testAuthStore.getTokenByRefreshToken(refreshToken);
      expect(retrievedToken).toEqual(token);
    });

    it('should return undefined when no token matches refresh token', async () => {
      const retrievedToken = await testAuthStore.getTokenByRefreshToken('non-existent-refresh-token');
      expect(retrievedToken).toBeUndefined();
    });

    it('should return undefined when token has no refresh token', async () => {
      const token: AuthInfo = {
        token: 'test-access-token',
        clientId: 'test-client',
        scopes: ['read'],
        // No extra field with refreshToken
      };

      await testAuthStore.storeToken(token);

      const retrievedToken = await testAuthStore.getTokenByRefreshToken('some-refresh-token');
      expect(retrievedToken).toBeUndefined();
    });
  });

  describe('Local Access Token Management', () => {
    it('should store and retrieve local access token with appId', async () => {
      const accessToken = 'local-access-token';
      const appId = 'test-app-id';

      const storedToken = await testAuthStore.storeLocalAccessToken(accessToken, appId);
      expect(storedToken).toBe(accessToken);
      expect(mockStorageManager.saveStorageData).toHaveBeenCalled();

      // Test cache retrieval
      const retrievedToken = await testAuthStore.getLocalAccessToken(appId);
      expect(retrievedToken).toBe(accessToken);
    });

    it('should remove local access token and associated token from tokens cache', async () => {
      const accessToken = 'local-access-token';
      const appId = 'test-app-id';

      // First store the local token and corresponding token in cache
      await testAuthStore.storeLocalAccessToken(accessToken, appId);

      // Store corresponding token in tokens cache
      const token: AuthInfo = {
        token: accessToken,
        clientId: 'test-client',
        scopes: ['read'],
      };
      await testAuthStore.storeToken(token);

      // Remove local access token
      await testAuthStore.removeLocalAccessToken(appId);

      // Local token should be undefined
      const retrievedLocalToken = await testAuthStore.getLocalAccessToken(appId);
      expect(retrievedLocalToken).toBeUndefined();

      // Associated token should also be removed from tokens cache
      const retrievedToken = await testAuthStore.getToken(accessToken);
      expect(retrievedToken).toBeUndefined();

      expect(mockStorageManager.saveStorageData).toHaveBeenCalledTimes(3); // store local + store token + remove
    });

    it('should handle removeLocalAccessToken when no local token exists', async () => {
      const appId = 'test-app-id';

      // Remove when no local token exists
      await testAuthStore.removeLocalAccessToken(appId);

      const retrievedToken = await testAuthStore.getLocalAccessToken(appId);
      expect(retrievedToken).toBeUndefined();

      expect(mockStorageManager.saveStorageData).toHaveBeenCalledTimes(1); // just the remove operation
    });

    it('should handle removeLocalAccessToken when localToken exists but no corresponding token in cache', async () => {
      const accessToken = 'local-access-token-only';
      const appId = 'test-app-id';

      // Store only the local token reference, but not the actual token in tokens cache
      await testAuthStore.storeLocalAccessToken(accessToken, appId);

      // Remove local access token - should handle gracefully even if token doesn't exist in cache
      await testAuthStore.removeLocalAccessToken(appId);

      // Local token should be undefined
      const retrievedLocalToken = await testAuthStore.getLocalAccessToken(appId);
      expect(retrievedLocalToken).toBeUndefined();

      // Token should still be undefined (wasn't there to begin with)
      const retrievedToken = await testAuthStore.getToken(accessToken);
      expect(retrievedToken).toBeUndefined();

      expect(mockStorageManager.saveStorageData).toHaveBeenCalledTimes(2); // store local + remove
    });

    it('should return undefined when no local access token exists for appId', async () => {
      const appId = 'non-existent-app';
      const retrievedToken = await testAuthStore.getLocalAccessToken(appId);
      expect(retrievedToken).toBeUndefined();
    });

    it('should handle multiple apps with different local tokens', async () => {
      const accessToken1 = 'token-app1';
      const accessToken2 = 'token-app2';
      const appId1 = 'app1';
      const appId2 = 'app2';

      // Store tokens for different apps
      await testAuthStore.storeLocalAccessToken(accessToken1, appId1);
      await testAuthStore.storeLocalAccessToken(accessToken2, appId2);

      // Verify both are retrievable
      const retrievedToken1 = await testAuthStore.getLocalAccessToken(appId1);
      const retrievedToken2 = await testAuthStore.getLocalAccessToken(appId2);

      expect(retrievedToken1).toBe(accessToken1);
      expect(retrievedToken2).toBe(accessToken2);

      // Remove one app's token
      await testAuthStore.removeLocalAccessToken(appId1);

      // First app's token should be gone, second should remain
      const finalToken1 = await testAuthStore.getLocalAccessToken(appId1);
      const finalToken2 = await testAuthStore.getLocalAccessToken(appId2);

      expect(finalToken1).toBeUndefined();
      expect(finalToken2).toBe(accessToken2);
    });

    it('should get all local access tokens', async () => {
      const accessToken1 = 'token-app1';
      const accessToken2 = 'token-app2';
      const appId1 = 'app1';
      const appId2 = 'app2';

      // Store tokens for different apps
      await testAuthStore.storeLocalAccessToken(accessToken1, appId1);
      await testAuthStore.storeLocalAccessToken(accessToken2, appId2);

      // Get all tokens
      const allTokens = await testAuthStore.getAllLocalAccessTokens();

      expect(allTokens).toEqual({
        [appId1]: accessToken1,
        [appId2]: accessToken2,
      });
    });

    it('should remove all local access tokens', async () => {
      const accessToken1 = 'token-app1';
      const accessToken2 = 'token-app2';
      const appId1 = 'app1';
      const appId2 = 'app2';

      // Store tokens for different apps
      await testAuthStore.storeLocalAccessToken(accessToken1, appId1);
      await testAuthStore.storeLocalAccessToken(accessToken2, appId2);

      // Verify tokens are stored
      const allTokensBefore = await testAuthStore.getAllLocalAccessTokens();
      expect(allTokensBefore).toEqual({
        [appId1]: accessToken1,
        [appId2]: accessToken2,
      });

      // Remove all tokens
      await testAuthStore.removeAllLocalAccessTokens();

      // Verify all tokens are removed
      const allTokensAfter = await testAuthStore.getAllLocalAccessTokens();
      expect(allTokensAfter).toEqual({});

      // Verify individual tokens are also removed
      const token1 = await testAuthStore.getLocalAccessToken(appId1);
      const token2 = await testAuthStore.getLocalAccessToken(appId2);
      expect(token1).toBeUndefined();
      expect(token2).toBeUndefined();
    });

    it('should return empty object when localTokens is undefined', async () => {
      // Mock storage data without localTokens
      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {},
        clients: {},
        // localTokens is undefined
      });

      const newAuthStore = new AuthStore();

      // Wait for constructor promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      const allTokens = await newAuthStore.getAllLocalAccessTokens();
      expect(allTokens).toEqual({});
    });

    it('should load local tokens from storage on construction', async () => {
      const localTokens = {
        app1: 'token1',
        app2: 'token2',
      };

      // Create corresponding tokens that the local tokens reference
      const token1: AuthInfo = {
        token: 'token1',
        clientId: 'test-client-1',
        scopes: ['read'],
        expiresAt: Date.now() / 1000 + 3600, // Future expiry
      };

      const token2: AuthInfo = {
        token: 'token2',
        clientId: 'test-client-2',
        scopes: ['read'],
        expiresAt: Date.now() / 1000 + 3600, // Future expiry
      };

      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {
          token1: token1,
          token2: token2,
        },
        clients: {},
        localTokens: localTokens,
      });

      const newAuthStore = new AuthStore();

      // Wait for constructor promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 100));

      const retrievedToken1 = await newAuthStore.getLocalAccessToken('app1');
      const retrievedToken2 = await newAuthStore.getLocalAccessToken('app2');

      expect(retrievedToken1).toBe('token1');
      expect(retrievedToken2).toBe('token2');
    });
  });

  describe('Client Management', () => {
    it('should register and retrieve clients', async () => {
      const client = {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        redirect_uris: ['http://localhost:3000/callback'],
      };

      const registeredClient = await testAuthStore.registerClient(client);
      expect(registeredClient).toEqual(client);
      expect(mockStorageManager.saveStorageData).toHaveBeenCalled();

      const retrievedClient = await testAuthStore.getClient(client.client_id);
      expect(retrievedClient).toEqual(client);
    });

    it('should return undefined for non-existent client', async () => {
      const retrievedClient = await testAuthStore.getClient('non-existent-client');
      expect(retrievedClient).toBeUndefined();
    });

    it('should remove clients', async () => {
      const client = {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        redirect_uris: ['http://localhost:3000/callback'],
      };

      await testAuthStore.registerClient(client);
      await testAuthStore.removeClient(client.client_id);

      expect(mockStorageManager.saveStorageData).toHaveBeenCalledTimes(2);

      const retrievedClient = await testAuthStore.getClient(client.client_id);
      expect(retrievedClient).toBeUndefined();
    });
  });

  describe('Constructor initialization', () => {
    it('should load tokens from storage on construction', async () => {
      const validToken: AuthInfo = {
        token: 'valid-token',
        clientId: 'test-client',
        scopes: ['read'],
        expiresAt: Date.now() / 1000 + 3600, // Future expiry
      };

      // Mock storage data
      mockStorageManager.loadStorageData.mockResolvedValue({
        tokens: {
          'valid-token': validToken,
        },
        clients: {},
      });

      const newAuthStore = new AuthStore();

      // Wait for constructor promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStorageManager.loadStorageData).toHaveBeenCalled();

      // Valid token should be accessible
      const retrievedToken = await newAuthStore.getToken('valid-token');
      expect(retrievedToken).toEqual(validToken);
    });

    it('should handle initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Set up the mock before creating the AuthStore instance
      mockStorageManager.loadStorageData.mockRejectedValue(new Error('Load failed'));

      try {
        const newAuthStore = new AuthStore();

        // Wait for constructor promises to resolve
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize AuthStore:', expect.any(Error));
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('should reuse initialization promise if called multiple times', async () => {
      // Reset the mock to ensure clean slate for this test
      mockStorageManager.loadStorageData.mockClear();

      const newAuthStore = new AuthStore();

      // Wait a bit for constructor to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Call multiple async methods that trigger initialization
      const promises = [
        newAuthStore.getToken('test'),
        newAuthStore.getLocalAccessToken('test-app').catch(() => undefined), // Catch error since appId is required
        newAuthStore.getToken('test2'),
      ];

      await Promise.all(promises);

      // Should only load from storage once (either from constructor or first method call)
      expect(mockStorageManager.loadStorageData).toHaveBeenCalledTimes(1);
    });
  });

  describe('Code Verifier Management', () => {
    it('should store and retrieve code verifier', () => {
      const { codeVerifier } = generatePKCEPair();
      const key = 'test-key';

      testAuthStore.storeCodeVerifier(key, codeVerifier);
      const retrievedVerifier = testAuthStore.getCodeVerifier(key);

      expect(retrievedVerifier).toBe(codeVerifier);
    });

    it('should return undefined for non-existent code verifier', () => {
      const retrievedVerifier = testAuthStore.getCodeVerifier('non-existent');
      expect(retrievedVerifier).toBeUndefined();
    });

    it('should remove code verifier', () => {
      const { codeVerifier } = generatePKCEPair();
      const key = 'test-key';

      testAuthStore.storeCodeVerifier(key, codeVerifier);
      expect(testAuthStore.getCodeVerifier(key)).toBe(codeVerifier);

      testAuthStore.removeCodeVerifier(key);
      expect(testAuthStore.getCodeVerifier(key)).toBeUndefined();
    });

    it('should store multiple code verifiers with different keys', () => {
      const { codeVerifier: verifier1 } = generatePKCEPair();
      const { codeVerifier: verifier2 } = generatePKCEPair();
      const key1 = 'key1';
      const key2 = 'key2';

      testAuthStore.storeCodeVerifier(key1, verifier1);
      testAuthStore.storeCodeVerifier(key2, verifier2);

      expect(testAuthStore.getCodeVerifier(key1)).toBe(verifier1);
      expect(testAuthStore.getCodeVerifier(key2)).toBe(verifier2);
    });

    it('should overwrite existing code verifier with same key', () => {
      const { codeVerifier: verifier1 } = generatePKCEPair();
      const { codeVerifier: verifier2 } = generatePKCEPair();
      const key = 'test-key';

      testAuthStore.storeCodeVerifier(key, verifier1);
      expect(testAuthStore.getCodeVerifier(key)).toBe(verifier1);

      testAuthStore.storeCodeVerifier(key, verifier2);
      expect(testAuthStore.getCodeVerifier(key)).toBe(verifier2);
    });

    it('should clear all expired code verifiers', () => {
      const { codeVerifier: verifier1 } = generatePKCEPair();
      const { codeVerifier: verifier2 } = generatePKCEPair();

      testAuthStore.storeCodeVerifier('key1', verifier1);
      testAuthStore.storeCodeVerifier('key2', verifier2);

      expect(testAuthStore.getCodeVerifier('key1')).toBe(verifier1);
      expect(testAuthStore.getCodeVerifier('key2')).toBe(verifier2);

      testAuthStore.clearExpiredCodeVerifiers();

      expect(testAuthStore.getCodeVerifier('key1')).toBeUndefined();
      expect(testAuthStore.getCodeVerifier('key2')).toBeUndefined();
    });
  });

  describe('Global authStore instance', () => {
    it('should be properly initialized', () => {
      expect(authStore).toBeInstanceOf(AuthStore);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete token lifecycle', async () => {
      const token: AuthInfo = {
        token: 'lifecycle-token',
        clientId: 'test-client',
        scopes: ['read', 'write'],
        expiresAt: Date.now() / 1000 + 3600,
      };
      const appId = 'test-app';

      // Store token
      await testAuthStore.storeToken(token);

      // Set as local token
      await testAuthStore.storeLocalAccessToken(token.token, appId);

      // Verify both are accessible
      const retrievedToken = await testAuthStore.getToken(token.token);
      const localToken = await testAuthStore.getLocalAccessToken(appId);

      expect(retrievedToken).toEqual(token);
      expect(localToken).toBe(token.token);

      // Remove local token (should also remove from tokens)
      await testAuthStore.removeLocalAccessToken(appId);

      // Both should be gone
      const finalToken = await testAuthStore.getToken(token.token);
      const finalLocalToken = await testAuthStore.getLocalAccessToken(appId);

      expect(finalToken).toBeUndefined();
      expect(finalLocalToken).toBeUndefined();
    });

    it('should handle client registration and token association', async () => {
      const client = {
        client_id: 'integration-client',
        client_secret: 'client-secret',
        redirect_uris: ['http://localhost:3000/callback'],
      };

      const token: AuthInfo = {
        token: 'client-token',
        clientId: client.client_id,
        scopes: ['read'],
      };

      // Register client and store token
      await testAuthStore.registerClient(client);
      await testAuthStore.storeToken(token);

      // Verify both are retrievable
      const retrievedClient = await testAuthStore.getClient(client.client_id);
      const retrievedToken = await testAuthStore.getToken(token.token);

      expect(retrievedClient).toEqual(client);
      expect(retrievedToken).toEqual(token);

      // Remove client
      await testAuthStore.removeClient(client.client_id);
      const finalClient = await testAuthStore.getClient(client.client_id);

      expect(finalClient).toBeUndefined();
      // Token should still exist
      const finalToken = await testAuthStore.getToken(token.token);
      expect(finalToken).toEqual(token);
    });
  });
});
