import { Client } from '@larksuiteoapi/node-sdk';
import { LarkMcpTool } from '../../src/mcp-tool/mcp-tool';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { filterTools } from '../../src/mcp-tool/utils/filter-tools';
import { caseTransf } from '../../src/mcp-tool/utils/case-transf';
import { ToolName } from '../../src/mcp-tool/tools';
import { larkOapiHandler } from '../../src/mcp-tool/utils/handler';
import { TokenMode } from '../../src/mcp-tool/types';
import { LarkAuthHandler, isTokenValid } from '../../src/auth';

// 模拟依赖项
jest.mock('../../src/mcp-tool/utils/filter-tools');
jest.mock('../../src/mcp-tool/utils/case-transf');
jest.mock('../../src/mcp-tool/utils/handler');
jest.mock('../../src/auth');

// mock larkOapiHandler
const mockLarkOapiHandler = jest.fn();
jest.mocked(larkOapiHandler).mockImplementation(mockLarkOapiHandler);

// 模拟McpServer
const mockServer = {
  tool: jest.fn(),
} as unknown as McpServer;

describe('LarkMcpTool', () => {
  let larkMcpTool: LarkMcpTool;
  let mockClient: jest.Mocked<Client>;
  let mockAuth: jest.Mocked<LarkAuthHandler>;

  beforeEach(() => {
    jest.clearAllMocks();

    // 设置mock返回值
    (filterTools as jest.Mock).mockReturnValue([
      {
        name: 'im.v1.message.create',
        description: '发送消息',
        schema: {},
        project: 'im',
        accessTokens: ['user', 'tenant'],
        sdkName: 'im.message.create',
      },
    ]);

    (caseTransf as jest.Mock).mockImplementation((toolName, caseType) => {
      if (caseType === 'snake') {
        return 'im_v1_message_create';
      }
      if (caseType === 'camel') {
        return 'imV1MessageCreate';
      }
      if (caseType === 'kebab') {
        return 'im-v1-message-create';
      }
      return 'im_v1_message_create'; // 默认返回snake case用于未指定时
    });

    mockClient = new Client({ appId: 'test-app-id', appSecret: 'test-app-secret' }) as jest.Mocked<Client>;
    larkMcpTool = new LarkMcpTool({
      client: mockClient,
      tokenMode: TokenMode.AUTO,
    });

    // 模拟LarkAuthHandler
    mockAuth = {
      refreshToken: jest.fn(),
      reAuthorize: jest.fn(),
    } as any;

    // 模拟isTokenValid
    (isTokenValid as jest.Mock).mockResolvedValue({
      valid: true,
      isExpired: false,
      token: null,
    });
  });

  describe('constructor', () => {
    it('应该用提供的客户端初始化', () => {
      expect(filterTools).toHaveBeenCalled();
    });

    it('如果没有提供客户端，应该使用提供的凭证创建客户端', () => {
      const tool = new LarkMcpTool({
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      });
      expect(Client).toHaveBeenCalledWith({
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      });
    });

    it('应该使用中文工具当language为zh时', () => {
      new LarkMcpTool({
        client: mockClient,
        toolsOptions: {
          language: 'zh',
        },
      });

      // 验证filterTools被调用，并且使用了中文工具列表
      expect(filterTools).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          language: 'zh',
        }),
      );
    });
  });

  describe('updateUserAccessToken', () => {
    it('应该更新userAccessToken', () => {
      larkMcpTool.updateUserAccessToken('test-token');
      // 因为userAccessToken是私有属性，我们可以在后续方法中间接验证
      const tools = larkMcpTool.getTools();
      larkMcpTool.registerMcpServer(mockServer);
      expect(mockServer.tool).toHaveBeenCalled();
    });
  });

  describe('getTools', () => {
    it('应该返回过滤后的工具列表', () => {
      const tools = larkMcpTool.getTools();
      expect(tools).toEqual([
        {
          name: 'im.v1.message.create',
          description: '发送消息',
          schema: {},
          project: 'im',
          accessTokens: ['user', 'tenant'],
          sdkName: 'im.message.create',
        },
      ]);
    });
  });

  describe('registerMcpServer', () => {
    it('应该将工具注册到MCP服务器', () => {
      larkMcpTool.registerMcpServer(mockServer);
      expect(caseTransf).toHaveBeenCalledWith('im.v1.message.create', undefined);
      expect(mockServer.tool).toHaveBeenCalledWith('im_v1_message_create', '发送消息', {}, expect.any(Function));
    });

    it('应该使用工具名称大小写选项', () => {
      larkMcpTool.registerMcpServer(mockServer, { toolNameCase: 'camel' });
      expect(caseTransf).toHaveBeenCalledWith('im.v1.message.create', 'camel');
      expect(mockServer.tool).toHaveBeenCalledWith('imV1MessageCreate', '发送消息', {}, expect.any(Function));
    });

    it('应该在客户端未初始化时抛出错误', async () => {
      // 创建没有客户端的实例
      const toolWithoutClient = new LarkMcpTool({
        toolsOptions: { allowTools: ['im.v1.message.create'] as ToolName[] },
      });

      // 模拟registerMcpServer并触发handler
      toolWithoutClient.registerMcpServer(mockServer);

      // 提取并调用处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      const result = await handlerFunction({ content: 'test' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('{"msg":"Client not initialized"}');
    });

    it('应该使用customHandler而非默认的larkOapiHandler', async () => {
      // 模拟自定义处理程序
      const customHandlerMock = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Custom handler response' }],
      });

      // 使用spyOn修改过滤后的工具数组
      (filterTools as jest.Mock).mockReturnValueOnce([
        {
          name: 'custom.handler.tool',
          description: '自定义处理程序工具',
          schema: {},
          project: 'custom',
          accessTokens: ['user', 'tenant'],
          sdkName: 'custom.handler.tool',
          customHandler: customHandlerMock,
        },
      ]);

      // 创建新的实例以使用修改后的模拟
      const toolWithCustomHandler = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.AUTO,
      });

      // 注册到服务器
      toolWithCustomHandler.registerMcpServer(mockServer);

      // 提取处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理函数
      await handlerFunction({ content: 'test' });

      // 验证customHandler被调用而非larkOapiHandler
      expect(customHandlerMock).toHaveBeenCalled();
    });

    it('应该使用larkOapiHandler', async () => {
      // 使用spyOn修改过滤后的工具数组
      (filterTools as jest.Mock).mockReturnValueOnce([
        {
          name: 'custom.handler.tool',
          description: '自定义处理程序工具',
          schema: {},
          project: 'custom',
          accessTokens: ['user', 'tenant'],
          sdkName: 'custom.handler.tool',
        },
      ]);

      // 创建新的实例以使用修改后的模拟
      const toolWithCustomHandler = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.AUTO,
      });

      // 注册到服务器
      toolWithCustomHandler.registerMcpServer(mockServer);

      // 提取处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理函数
      await handlerFunction({ content: 'test' });

      // 验证customHandler被调用而非larkOapiHandler
      expect(larkOapiHandler).toHaveBeenCalled();
    });
  });

  // 添加额外的构造函数测试
  describe('constructor额外测试', () => {
    it('应该使用自定义允许工具列表', () => {
      const customAllowTools: ToolName[] = ['im.v1.message.create', 'im.v1.chat.create'] as ToolName[];
      new LarkMcpTool({
        client: mockClient,
        toolsOptions: {
          allowTools: customAllowTools,
        },
      });

      expect(filterTools).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          allowTools: customAllowTools,
        }),
      );
    });

    it('应该设置自定义tokenMode', () => {
      const tool = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.USER_ACCESS_TOKEN,
      });

      // 注册服务器以验证tokenMode是否传递给handler
      tool.registerMcpServer(mockServer);
    });
  });

  describe('处理USER_ACCESS_TOKEN模式错误情况', () => {
    it('当tokenMode为USER_ACCESS_TOKEN但没有userAccessToken时应返回错误', async () => {
      const tool = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.USER_ACCESS_TOKEN,
      });

      tool.registerMcpServer(mockServer);

      // 提取处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理函数
      const result = await handlerFunction({ content: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('{"errorMessage":"UserAccessToken is invalid or expired"}');
    });
  });

  describe('异常处理', () => {
    it('应捕获并返回错误信息', async () => {
      mockLarkOapiHandler.mockImplementationOnce(() => {
        throw new Error('测试错误');
      });

      larkMcpTool.registerMcpServer(mockServer);

      // 提取处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理函数
      const result = await handlerFunction({ content: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('"测试错误"');
    });
  });

  describe('参数传递处理', () => {
    it('应在AUTO模式下处理useUAT', async () => {
      // 清除模拟调用
      (mockLarkOapiHandler as jest.Mock).mockClear();

      // AUTO模式
      const autoTool = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.AUTO,
      });

      autoTool.registerMcpServer(mockServer);

      const autoHandler = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理程序，当useUAT为true但没有userAccessToken时应返回错误
      const result1 = await autoHandler({ content: 'test', useUAT: true });
      expect(result1.isError).toBe(true);
      expect(result1.content[0].text).toBe('{"errorMessage":"UserAccessToken is invalid or expired"}');

      // 验证handler没有被调用，因为返回了错误
      expect(mockLarkOapiHandler).not.toHaveBeenCalled();

      // 清除模拟调用
      (mockLarkOapiHandler as jest.Mock).mockClear();

      // 更新token后测试
      autoTool.updateUserAccessToken('test-token');

      // 调用处理程序
      await autoHandler({ content: 'test', useUAT: true });

      // 验证handler被调用，并传入了userAccessToken
      expect(mockLarkOapiHandler).toHaveBeenCalledWith(
        mockClient,
        expect.any(Object),
        expect.objectContaining({
          userAccessToken: 'test-token',
        }),
      );
    });

    it('当没有params时，useUAT为false', async () => {
      const tool = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.AUTO,
      });

      tool.registerMcpServer(mockServer);

      // 提取处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理函数
      await handlerFunction();

      // 验证handler被调用，并传入了userAccessToken
      expect(mockLarkOapiHandler).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          useUAT: false,
        }),
        expect.any(Object),
      );
    });

    it('handler throw error', async () => {
      mockLarkOapiHandler.mockImplementationOnce(() => {
        throw new Error('测试错误');
      });

      const tool = new LarkMcpTool({
        client: mockClient,
        tokenMode: TokenMode.AUTO,
      });

      tool.registerMcpServer(mockServer);

      // 提取处理函数
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      // 调用处理函数
      const result = await handlerFunction({ content: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('"测试错误"');
    });
  });

  describe('ensureGetUserAccessToken', () => {
    it('应该在没有OAuth时直接返回userAccessToken', async () => {
      const tool = new LarkMcpTool({
        client: mockClient,
        oauth: false,
      });

      tool.updateUserAccessToken('test-token');

      // 通过registerMcpServer间接测试ensureGetUserAccessToken
      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test' });

      // 验证handler被调用，说明token正常传递
      expect(mockLarkOapiHandler).toHaveBeenCalled();
    });

    it('应该在没有OAuth且没有userAccessToken时返回空对象', async () => {
      const tool = new LarkMcpTool({
        client: mockClient,
        oauth: false,
      });

      // 不设置userAccessToken，让它为undefined

      // 直接测试ensureGetUserAccessToken方法
      const result = await tool.ensureGetUserAccessToken();

      // 应该返回空对象，因为没有OAuth且没有userAccessToken
      expect(result).toEqual({});
    });

    it('应该在没有OAuth且token无效时返回空对象', async () => {
      // 创建独立的mock auth
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: false, // 禁用OAuth
        },
        localMockAuth,
      );

      // 不设置userAccessToken，让它为undefined

      // 模拟token验证返回无效
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: false,
        token: null,
      });

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test' });

      // 验证不会调用reAuthorize，因为oauth被禁用
      expect(localMockAuth.reAuthorize).not.toHaveBeenCalled();
      expect(mockLarkOapiHandler).toHaveBeenCalled();
    });

    it('应该在token有效时直接返回', async () => {
      // 清除之前的mock调用
      jest.clearAllMocks();

      // 重新创建mock auth，确保状态干净
      const freshMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
        },
        freshMockAuth,
      );

      tool.updateUserAccessToken('valid-token');

      // 重置并模拟token验证返回有效
      (isTokenValid as jest.Mock).mockReset();
      (isTokenValid as jest.Mock).mockResolvedValue({
        valid: true,
        isExpired: false,
        token: null,
      });

      // 模拟larkOapiHandler返回成功结果
      mockLarkOapiHandler.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Success' }],
      });

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test', useUAT: true });

      expect(isTokenValid).toHaveBeenCalledWith('valid-token');
      expect(freshMockAuth.refreshToken).not.toHaveBeenCalled();
      expect(freshMockAuth.reAuthorize).not.toHaveBeenCalled();
    });

    it('应该在token过期但有refresh token时刷新token', async () => {
      // 清除之前的mock调用
      jest.clearAllMocks();

      // 重新创建mock auth，确保状态干净
      const freshMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
        },
        freshMockAuth,
      );

      tool.updateUserAccessToken('expired-token');

      // 重置并模拟token验证返回过期但有refresh token
      (isTokenValid as jest.Mock).mockReset();
      (isTokenValid as jest.Mock).mockResolvedValue({
        valid: false,
        isExpired: true,
        token: {
          token: 'expired-token',
          extra: { refreshToken: 'refresh-token' },
        },
      });

      // 模拟refreshToken返回一个有效的新token
      freshMockAuth.refreshToken.mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      } as any);

      // 模拟larkOapiHandler返回成功结果
      mockLarkOapiHandler.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Success' }],
      });

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test', useUAT: true });

      expect(freshMockAuth.refreshToken).toHaveBeenCalledWith('expired-token');
      expect(freshMockAuth.reAuthorize).not.toHaveBeenCalled();
    });

    it('应该在刷新失败时进行重新授权', async () => {
      // 创建独立的mock auth
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
        },
        localMockAuth,
      );

      tool.updateUserAccessToken('expired-token');

      // 模拟token验证返回过期但有refresh token
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: true,
        token: {
          token: 'expired-token',
          extra: { refreshToken: 'refresh-token' },
        },
      });

      // 模拟refreshToken失败
      localMockAuth.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

      // 模拟reAuthorize返回授权URL
      localMockAuth.reAuthorize.mockResolvedValueOnce({
        authorizeUrl: 'https://auth.example.com',
        accessToken: '',
      } as any);

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      const result = await handlerFunction({ content: 'test', useUAT: true });

      expect(localMockAuth.refreshToken).toHaveBeenCalled();
      expect(localMockAuth.reAuthorize).toHaveBeenCalled();
      // 当需要重新授权时，处理函数可能不返回结果或返回默认的larkOapiHandler结果
      // 我们只验证相关方法被调用即可
    });

    it('应该在refreshToken返回没有access_token时进行重新授权', async () => {
      // 创建独立的mock auth
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
        },
        localMockAuth,
      );

      tool.updateUserAccessToken('expired-token');

      // 模拟token验证返回过期但有refresh token
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: true,
        token: {
          token: 'expired-token',
          extra: { refreshToken: 'refresh-token' },
        },
      });

      // 模拟refreshToken返回一个对象但没有access_token
      localMockAuth.refreshToken.mockResolvedValueOnce({
        access_token: '', // 空字符串，falsy值
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
      } as any);

      // 模拟reAuthorize返回授权URL
      localMockAuth.reAuthorize.mockResolvedValueOnce({
        authorizeUrl: 'https://auth.example.com',
        accessToken: '',
      } as any);

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      const result = await handlerFunction({ content: 'test', useUAT: true });

      expect(localMockAuth.refreshToken).toHaveBeenCalled();
      expect(localMockAuth.reAuthorize).toHaveBeenCalled();
      // 当需要重新授权时，处理函数可能不返回结果或返回默认的larkOapiHandler结果
      // 我们只验证相关方法被调用即可
    });

    it('应该在reAuthorize没有返回authorizeUrl时返回UserAccessToken is invalid or expired错误', async () => {
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
          tokenMode: TokenMode.USER_ACCESS_TOKEN, // 确保shouldUseUAT为true
        },
        localMockAuth,
      );

      // 不设置userAccessToken，确保userAccessToken为undefined

      // 模拟token验证返回无效
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: false,
        token: null,
      });

      // 模拟reAuthorize没有返回authorizeUrl
      localMockAuth.reAuthorize.mockResolvedValueOnce({
        accessToken: '', // 空字符串，falsy值
        // 没有authorizeUrl字段，所以authorizeUrl是undefined
      } as any);

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      const result = await handlerFunction({ content: 'test', useUAT: true });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('{"errorMessage":"UserAccessToken is invalid or expired"}');
    });

    it('应该在重新授权返回访问令牌时使用新token', async () => {
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
        },
        localMockAuth,
      );

      tool.updateUserAccessToken('old-token');

      // 模拟token验证返回无效
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: false,
        token: null,
      });

      // 模拟reAuthorize直接返回新的访问令牌
      localMockAuth.reAuthorize.mockResolvedValueOnce({
        accessToken: 'new-access-token',
      } as any);

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test', useUAT: true });

      expect(localMockAuth.reAuthorize).toHaveBeenCalled();
      expect(mockLarkOapiHandler).toHaveBeenCalledWith(
        mockClient,
        expect.any(Object),
        expect.objectContaining({
          userAccessToken: 'new-access-token',
        }),
      );
    });

    it('应该在没有auth实例时直接返回', async () => {
      const tool = new LarkMcpTool({
        client: mockClient,
        oauth: true, // 设置oauth为true但不传入auth实例
      });

      tool.updateUserAccessToken('test-token');

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test' });

      // 验证没有调用auth相关方法
      expect(isTokenValid).not.toHaveBeenCalled();
      expect(mockLarkOapiHandler).toHaveBeenCalled();
    });

    it('应该在reAuthorize返回accessToken时使用新token', async () => {
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
        },
        localMockAuth,
      );

      tool.updateUserAccessToken('expired-token');

      // 模拟token验证返回过期且没有refresh token
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: true,
        token: {
          token: 'expired-token',
          extra: {}, // 没有refresh_token
        },
      });

      // 模拟reAuthorize返回新的accessToken
      localMockAuth.reAuthorize.mockResolvedValueOnce({
        authorizeUrl: 'https://auth.example.com',
        accessToken: 'new-access-token',
      } as any);

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      await handlerFunction({ content: 'test', useUAT: true });

      expect(localMockAuth.reAuthorize).toHaveBeenCalledWith('expired-token');
      expect(mockLarkOapiHandler).toHaveBeenCalledWith(
        mockClient,
        expect.any(Object),
        expect.objectContaining({
          userAccessToken: 'new-access-token',
        }),
      );
    });

    it('应该在没有authorizeUrl时返回UserAccessToken is invalid or expired错误', async () => {
      const localMockAuth = {
        refreshToken: jest.fn(),
        reAuthorize: jest.fn(),
      } as any;

      const tool = new LarkMcpTool(
        {
          client: mockClient,
          oauth: true,
          tokenMode: TokenMode.USER_ACCESS_TOKEN,
        },
        localMockAuth,
      );

      // 不设置userAccessToken，让其为undefined

      // 模拟token验证返回无效
      (isTokenValid as jest.Mock).mockResolvedValueOnce({
        valid: false,
        isExpired: false,
        token: null,
      });

      // 模拟reAuthorize返回空的authorizeUrl和accessToken
      localMockAuth.reAuthorize.mockResolvedValueOnce({
        authorizeUrl: '',
        accessToken: '',
      } as any);

      tool.registerMcpServer(mockServer);
      const handlerFunction = (mockServer.tool as jest.Mock).mock.calls[0][3];

      const result = await handlerFunction({ content: 'test', useUAT: true });

      expect(result).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: '{"errorMessage":"UserAccessToken is invalid or expired"}',
          },
        ],
      });
    });
  });
});
