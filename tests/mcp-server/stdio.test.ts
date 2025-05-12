import { initStdioServer } from '../../src/mcp-server/transport/stdio';
import { initOAPIMcpServer } from '../../src/mcp-server/shared/init';
import { McpServerOptions } from '../../src/mcp-server/shared/types';
import { TokenMode } from '../../src/mcp-tool';

// 创建可追踪的模拟函数
const connectMock = jest.fn().mockResolvedValue(undefined);
const connectErrorMock = jest.fn().mockRejectedValue(new Error('Connection error'));

// 模拟依赖
jest.mock('../../src/mcp-server/shared/init', () => {
  return {
    initOAPIMcpServer: jest.fn().mockImplementation(() => ({
      mcpServer: {
        connect: connectMock,
      },
      larkClient: {},
    })),
  };
});

// 模拟 McpServer
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: connectMock,
    server: {},
    _registeredResources: {},
    _registeredResourceTemplates: {},
    _registeredTools: {},
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
  })),
}));

// 模拟mcp-tool，提供TokenMode
jest.mock('../../src/mcp-tool', () => ({
  TokenMode: {
    AUTO: 'auto',
    USER_ACCESS_TOKEN: 'user_access_token',
    TENANT_ACCESS_TOKEN: 'tenant_access_token',
  },
}));

// 保存原始console
const originalConsole = console;

// 创建用于stdin的模拟函数
const setEncodingMock = jest.fn().mockReturnValue(process.stdin);
const resumeMock = jest.fn().mockReturnValue(process.stdin);
const onMock = jest.fn().mockReturnValue(process.stdin);

describe('initStdioServer', () => {
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 模拟console方法
    console.log = jest.fn();
    console.error = jest.fn();

    // 模拟process方法，但不直接替换对象
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    jest.spyOn(process.stdin, 'setEncoding').mockImplementation(setEncodingMock);
    jest.spyOn(process.stdin, 'resume').mockImplementation(resumeMock);
    jest.spyOn(process.stdin, 'on').mockImplementation(onMock);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      return undefined as never;
    });
  });

  afterEach(() => {
    // 恢复原始console
    console = originalConsole;

    // 清除所有模拟
    jest.restoreAllMocks();
  });

  it('应该初始化MCP服务器并连接', () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 首先初始化MCP服务器
    const { mcpServer } = initOAPIMcpServer(options);

    // 然后使用mcpServer调用initStdioServer
    initStdioServer(() => mcpServer);

    // 验证调用
    expect(initOAPIMcpServer).toHaveBeenCalledWith(options);
    expect(connectMock).toHaveBeenCalled();
  });

  it('应该处理连接错误', () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 修改connect的实现以模拟错误
    (initOAPIMcpServer as jest.Mock).mockImplementationOnce(() => ({
      mcpServer: {
        connect: connectErrorMock,
      },
      larkClient: {},
    }));

    // 首先初始化MCP服务器
    const { mcpServer } = initOAPIMcpServer(options);

    // 然后使用mcpServer调用initStdioServer
    initStdioServer(() => mcpServer);

    // 假设错误处理是异步的，我们需要等待Promise rejecting
    return new Promise<void>(process.nextTick).then(() => {
      // 验证错误处理
      expect(connectErrorMock).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('MCP Connect Error:', expect.any(Error));
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  it('应该处理StdioServerTransport初始化时的异常', () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 修改StdioServerTransport的实现以模拟抛出异常
    const StdioServerTransportMock = jest.fn().mockImplementation(() => {
      throw new Error('初始化错误');
    });

    jest.mock('@modelcontextprotocol/sdk/server/stdio', () => ({
      StdioServerTransport: StdioServerTransportMock,
    }));

    // 重新导入以应用模拟
    jest.resetModules();
    const { initStdioServer: initStdioServerReimported } = require('../../src/mcp-server/transport/stdio');

    // 首先初始化MCP服务器
    const { mcpServer } = initOAPIMcpServer(options);

    // 期望抛出异常
    initStdioServerReimported(() => mcpServer);

    // 验证错误处理
    expect(console.error).toHaveBeenCalledWith('Error handling MCP request:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('应该正确处理和传递用户指定的选项', () => {
    const { TokenMode } = require('../../src/mcp-tool');

    const options: McpServerOptions = {
      appId: 'custom-app-id',
      appSecret: 'custom-app-secret',
      host: 'localhost',
      port: 3000,
      tools: ['tool1', 'tool2'],
      language: 'zh',
      toolNameCase: 'camel',
      tokenMode: TokenMode.AUTO,
    };

    // 创建一个自定义的getNewServer函数来验证选项传递
    const getNewServerMock = jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
    });

    // 调用initStdioServer
    initStdioServer(getNewServerMock);

    // 验证getNewServer被调用
    expect(getNewServerMock).toHaveBeenCalled();
  });

  it('应该在transport.connect成功后不调用process.exit', async () => {
    // 设置成功的connect
    const successConnectMock = jest.fn().mockResolvedValue(undefined);

    // 创建带有成功connect的模拟服务器
    const mockServer = {
      connect: successConnectMock,
      close: jest.fn(),
    };

    // 使用一个能够访问Promise的自定义实现
    const StdioServerTransportSuccessMock = jest.fn().mockImplementation(() => {
      return {
        // 不进行任何操作，只返回成功的connect
      };
    });

    jest.mock('@modelcontextprotocol/sdk/server/stdio', () => ({
      StdioServerTransport: StdioServerTransportSuccessMock,
    }));

    // 重新导入以应用模拟
    jest.resetModules();
    const { initStdioServer: initStdioServerSuccess } = require('../../src/mcp-server/transport/stdio');

    // 调用initStdioServer
    initStdioServerSuccess(() => mockServer);

    // 等待潜在的异步操作完成
    await new Promise(process.nextTick);

    // 验证在成功情况下process.exit不被调用
    expect(process.exit).not.toHaveBeenCalled();
  });
});
