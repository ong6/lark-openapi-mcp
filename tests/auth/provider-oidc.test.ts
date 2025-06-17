import { Response } from 'express';
import { LarkOIDC2OAuthServerProvider } from '../../src/auth/provider/oidc';
import { authStore } from '../../src/auth/store';
import { isTokenValid } from '../../src/auth/utils/is-token-valid';
import { generateCodeChallenge } from '../../src/auth/utils/pkce';
import { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

// Mock dependencies
jest.mock('../../src/auth/store');
jest.mock('../../src/auth/utils/is-token-valid');
jest.mock('../../src/auth/utils/pkce');

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LarkOIDC2OAuthServerProvider', () => {
  let provider: LarkOIDC2OAuthServerProvider;
  let mockResponse: Partial<Response>;
  let mockClient: OAuthClientInformationFull;
  let mockAuthStore: any;

  const options = {
    domain: 'https://open.feishu.cn',
    host: 'localhost',
    port: 3000,
    appId: 'test-app-id',
    appSecret: 'test-app-secret',
    callbackUrl: 'http://localhost:3000/callback',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    provider = new LarkOIDC2OAuthServerProvider(options);

    mockResponse = {
      redirect: jest.fn(),
    };

    mockClient = {
      client_id: 'test-client-id',
      redirect_uris: ['http://example.com/callback'],
    } as OAuthClientInformationFull;

    mockAuthStore = {
      storeToken: jest.fn(),
      storeCodeVerifier: jest.fn(),
      getCodeVerifier: jest.fn(),
      removeCodeVerifier: jest.fn(),
      getTokenByRefreshToken: jest.fn(),
    };

    (authStore as any) = mockAuthStore;
    (generateCodeChallenge as jest.Mock).mockReturnValue('test-challenge');
  });

  describe('constructor', () => {
    it('应该正确初始化endpoints', () => {
      expect(provider['_endpoints']).toEqual({
        appAccessTokenUrl: 'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        authorizationUrl: 'https://open.feishu.cn/open-apis/authen/v1/index',
        tokenUrl: 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token',
        refreshTokenUrl: 'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
        registrationUrl: 'https://open.feishu.cn/open-apis/authen/v1/index',
      });
    });

    it('应该设置skipLocalPkceValidation为true', () => {
      expect(provider.skipLocalPkceValidation).toBe(true);
    });

    it('应该正确存储options', () => {
      expect(provider['_options']).toEqual(options);
    });
  });

  describe('clientsStore getter', () => {
    it('应该返回authStore实例', () => {
      expect(provider.clientsStore).toBe(authStore);
    });
  });

  describe('authorize method', () => {
    it('应该重定向到正确的授权URL', async () => {
      const params = {
        codeChallenge: 'test-challenge',
        redirectUri: 'http://example.com/callback',
        state: 'test-state',
        scopes: ['scope1', 'scope2'],
      };

      await provider.authorize(mockClient, params, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://open.feishu.cn/open-apis/authen/v1/index'),
      );

      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      const url = new URL(redirectUrl);

      expect(url.searchParams.get('app_id')).toBe('test-app-id');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3000/callback?redirect_uri=http://example.com/callback',
      );
      expect(url.searchParams.get('state')).toBe('test-state');
    });

    it('应该处理没有state的情况', async () => {
      const params = {
        codeChallenge: 'test-challenge',
        redirectUri: 'http://example.com/callback',
      };

      await provider.authorize(mockClient, params, mockResponse as Response);

      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      const url = new URL(redirectUrl);

      expect(url.searchParams.get('state')).toBeNull();
    });

    it('应该在有codeChallenge时存储code verifier', async () => {
      const params = {
        codeChallenge: 'test-challenge',
        redirectUri: 'http://example.com/callback',
      };

      await provider.authorize(mockClient, params, mockResponse as Response);

      expect(mockAuthStore.storeCodeVerifier).toHaveBeenCalledWith('challenge_test-client-id', 'test-challenge');
    });

    it('应该在没有codeChallenge时不存储code verifier', async () => {
      const params = {
        codeChallenge: '',
        redirectUri: 'http://example.com/callback',
      };

      await provider.authorize(mockClient, params, mockResponse as Response);

      expect(mockAuthStore.storeCodeVerifier).not.toHaveBeenCalled();
    });
  });

  describe('challengeForAuthorizationCode method', () => {
    it('应该返回空字符串', async () => {
      const result = await provider.challengeForAuthorizationCode(mockClient, 'test-code');
      expect(result).toBe('');
    });
  });

  describe('exchangeAuthorizationCode method', () => {
    const mockAppAccessTokenResponse = {
      app_access_token: 'test-app-access-token',
    };

    const mockTokenResponse = {
      code: 0,
      msg: 'success',
      data: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_expires_in: 7200,
        scope: 'scope1 scope2',
      },
    };

    beforeEach(() => {
      // Reset all mocks in this describe block
      mockFetch.mockClear();
    });

    it('应该成功交换授权码获取token', async () => {
      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAppAccessTokenResponse),
      });

      // Mock token exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      const result = await provider.exchangeAuthorizationCode(
        mockClient,
        'test-auth-code',
        undefined,
        'http://example.com/callback',
      );

      // Verify app access token request
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            app_id: 'test-app-id',
            app_secret: 'test-app-secret',
          }),
        },
      );

      // Verify token exchange request
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: 'Bearer test-app-access-token',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: 'test-auth-code',
        }),
      });

      expect(mockAuthStore.storeToken).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        token: 'test-access-token',
        scopes: ['scope1', 'scope2'],
        expiresAt: expect.any(Number),
        extra: {
          refreshToken: 'test-refresh-token',
          token: mockTokenResponse,
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      });

      expect(result).toEqual({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'scope1 scope2',
        refresh_token: 'test-refresh-token',
      });
    });

    it('应该处理PKCE验证成功的情况', async () => {
      mockAuthStore.getCodeVerifier.mockReturnValue('test-challenge');
      (generateCodeChallenge as jest.Mock).mockReturnValue('test-challenge');

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAppAccessTokenResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      await provider.exchangeAuthorizationCode(
        mockClient,
        'test-auth-code',
        'test-code-verifier',
        'http://example.com/callback',
      );

      expect(mockAuthStore.getCodeVerifier).toHaveBeenCalledWith('challenge_test-client-id');
      expect(generateCodeChallenge).toHaveBeenCalledWith('test-code-verifier');
      expect(mockAuthStore.removeCodeVerifier).toHaveBeenCalledWith('challenge_test-client-id');
    });

    it('应该在PKCE验证失败时抛出错误 - 未找到challenge', async () => {
      mockAuthStore.getCodeVerifier.mockReturnValue(null);

      await expect(
        provider.exchangeAuthorizationCode(
          mockClient,
          'test-auth-code',
          'test-code-verifier',
          'http://example.com/callback',
        ),
      ).rejects.toThrow('PKCE validation failed: code challenge not found');
    });

    it('应该在PKCE验证失败时抛出错误 - verifier不匹配', async () => {
      mockAuthStore.getCodeVerifier.mockReturnValue('different-challenge');
      (generateCodeChallenge as jest.Mock).mockReturnValue('test-challenge');

      await expect(
        provider.exchangeAuthorizationCode(
          mockClient,
          'test-auth-code',
          'test-code-verifier',
          'http://example.com/callback',
        ),
      ).rejects.toThrow('PKCE validation failed: code verifier does not match challenge');
    });

    it('应该在token交换失败时抛出错误', async () => {
      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAppAccessTokenResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      await expect(
        provider.exchangeAuthorizationCode(mockClient, 'test-auth-code', undefined, 'http://example.com/callback'),
      ).rejects.toThrow('Token exchange failed: 400 Bad Request');
    });

    it('应该处理没有expires_in的token响应', async () => {
      const responseWithoutExpiry = {
        ...mockTokenResponse,
        data: {
          ...mockTokenResponse.data,
          expires_in: undefined,
        },
      };

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAppAccessTokenResponse),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(responseWithoutExpiry),
      });

      await provider.exchangeAuthorizationCode(mockClient, 'test-auth-code', undefined, 'http://example.com/callback');

      expect(mockAuthStore.storeToken).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        token: 'test-access-token',
        scopes: ['scope1', 'scope2'],
        expiresAt: undefined,
        extra: {
          refreshToken: 'test-refresh-token',
          token: responseWithoutExpiry,
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      });
    });

    it('应该处理没有scope的token响应', async () => {
      const responseWithoutScope = {
        ...mockTokenResponse,
        data: {
          ...mockTokenResponse.data,
          scope: undefined,
        },
      };

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAppAccessTokenResponse),
      });

      // Mock token exchange response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(responseWithoutScope),
      });

      await provider.exchangeAuthorizationCode(mockClient, 'test-auth-code', undefined, 'http://example.com/callback');

      expect(mockAuthStore.storeToken).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        token: 'test-access-token',
        scopes: [],
        expiresAt: expect.any(Number),
        extra: {
          refreshToken: 'test-refresh-token',
          token: responseWithoutScope,
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      });
    });
  });

  describe('exchangeRefreshToken method', () => {
    const mockTokenResponse = {
      code: 0,
      msg: 'success',
      data: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'scope1 scope2',
      },
    };

    it('应该成功刷新token', async () => {
      const mockOriginalToken = {
        token: 'original-token',
        clientId: 'test-client-id',
        scopes: ['scope1', 'scope2'],
        expiresAt: Date.now() / 1000 + 3600,
        extra: {
          refreshToken: 'test-refresh-token',
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      };

      mockAuthStore.getTokenByRefreshToken.mockResolvedValue(mockOriginalToken);

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_access_token: 'test-app-access-token' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      const result = await provider.exchangeRefreshToken(mockClient, 'test-refresh-token', ['scope1', 'scope2']);

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer test-app-access-token' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: 'test-refresh-token',
          }),
        },
      );

      expect(mockAuthStore.storeToken).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        token: 'new-access-token',
        scopes: ['scope1', 'scope2'],
        expiresAt: expect.any(Number),
        extra: {
          refreshToken: 'new-refresh-token',
          token: mockTokenResponse,
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      });

      expect(result).toEqual({
        access_token: 'new-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'scope1 scope2',
        refresh_token: 'new-refresh-token',
      });
    });

    it('应该处理没有scopes的情况', async () => {
      const mockOriginalToken = {
        token: 'original-token',
        clientId: 'test-client-id',
        scopes: [],
        expiresAt: Date.now() / 1000 + 3600,
        extra: {
          refreshToken: 'test-refresh-token',
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      };

      mockAuthStore.getTokenByRefreshToken.mockResolvedValue(mockOriginalToken);

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_access_token: 'test-app-access-token' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      await provider.exchangeRefreshToken(mockClient, 'test-refresh-token');

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', Authorization: 'Bearer test-app-access-token' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: 'test-refresh-token',
          }),
        },
      );
    });

    it('应该在refresh失败时抛出错误', async () => {
      const mockOriginalToken = {
        token: 'original-token',
        clientId: 'test-client-id',
        scopes: [],
        expiresAt: Date.now() / 1000 + 3600,
        extra: {
          refreshToken: 'invalid-refresh-token',
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      };

      mockAuthStore.getTokenByRefreshToken.mockResolvedValue(mockOriginalToken);

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_access_token: 'test-app-access-token' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      });

      await expect(provider.exchangeRefreshToken(mockClient, 'invalid-refresh-token')).rejects.toThrow(
        'Token refresh failed: 401 Unauthorized',
      );
    });

    it('应该处理没有expires_in的刷新token响应', async () => {
      const mockOriginalToken = {
        token: 'original-token',
        clientId: 'test-client-id',
        scopes: ['scope1', 'scope2'],
        expiresAt: Date.now() / 1000 + 3600,
        extra: {
          refreshToken: 'test-refresh-token',
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      };

      mockAuthStore.getTokenByRefreshToken.mockResolvedValue(mockOriginalToken);

      const responseWithoutExpiry = {
        ...mockTokenResponse,
        data: {
          ...mockTokenResponse.data,
          expires_in: undefined,
        },
      };

      // Mock app access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_access_token: 'test-app-access-token' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(responseWithoutExpiry),
      });

      await provider.exchangeRefreshToken(mockClient, 'test-refresh-token', ['scope1', 'scope2']);

      expect(mockAuthStore.storeToken).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        token: 'new-access-token',
        scopes: ['scope1', 'scope2'],
        expiresAt: undefined,
        extra: {
          refreshToken: 'new-refresh-token',
          token: responseWithoutExpiry,
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
        },
      });
    });
  });

  describe('verifyAccessToken method', () => {
    it('应该在token有效时返回正确的AuthInfo', async () => {
      const mockStoredToken: AuthInfo = {
        token: 'valid-token',
        clientId: 'test-client-id',
        scopes: ['scope1', 'scope2'],
        expiresAt: Date.now() / 1000 + 3600,
        extra: { refresh_token: 'refresh-token' },
      };

      (isTokenValid as jest.Mock).mockResolvedValue({
        valid: true,
        token: mockStoredToken,
      });

      const result = await provider.verifyAccessToken('valid-token');

      expect(isTokenValid).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(mockStoredToken);
    });

    it('应该在token无效时返回默认AuthInfo', async () => {
      const mockStoredToken = {
        token: 'invalid-token',
        clientId: 'test-client-id',
        scopes: ['scope1'],
        expiresAt: 1,
        extra: {},
      };

      (isTokenValid as jest.Mock).mockResolvedValue({
        valid: false,
        token: mockStoredToken,
      });

      const result = await provider.verifyAccessToken('invalid-token');

      expect(result).toEqual({
        token: 'invalid-token',
        clientId: 'test-client-id',
        scopes: ['scope1'],
        expiresAt: 1,
        extra: {},
      });
    });

    it('应该在没有存储token时返回默认值', async () => {
      (isTokenValid as jest.Mock).mockResolvedValue({
        valid: false,
        token: null,
      });

      const result = await provider.verifyAccessToken('unknown-token');

      expect(result).toEqual({
        token: '',
        clientId: '',
        scopes: [],
        expiresAt: 1,
        extra: {},
      });
    });
  });

  describe('Schema validation', () => {
    it('应该正确解析有效的Lark OIDC token响应', async () => {
      const validResponse = {
        code: 0,
        msg: 'success',
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          refresh_expires_in: 7200,
          scope: 'scope1 scope2',
        },
      };

      // Mock successful app access token call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_access_token: 'app-token' }),
      });

      // Mock successful token exchange call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(validResponse),
      });

      const result = await provider.exchangeAuthorizationCode(mockClient, 'test-code');

      expect(result.access_token).toBe('test-token');
      expect(result.token_type).toBe('Bearer');
    });

    it('应该处理缺少可选字段的响应', async () => {
      const minimalResponse = {
        code: 0,
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
        },
      };

      // Mock successful app access token call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_access_token: 'app-token' }),
      });

      // Mock successful token exchange call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(minimalResponse),
      });

      const result = await provider.exchangeAuthorizationCode(mockClient, 'test-code');

      expect(result.access_token).toBe('test-token');
      expect(result.refresh_token).toBeUndefined();
      expect(result.expires_in).toBeUndefined();
    });
  });
});
