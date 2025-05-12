import express from 'express';
import { initSSEServer } from '../../src/mcp-server/transport/sse';
import { McpServerOptions } from '../../src/mcp-server/shared/types';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { parseMCPServerOptionsFromRequest } from '../../src/mcp-server/transport/utils';

// 创建可跟踪的模拟函数
const handlePostMessageMock = jest.fn().mockResolvedValue(undefined);
const mcpConnectMock = jest.fn().mockResolvedValue(undefined);

// 模拟依赖
jest.mock('http', () => ({
  createServer: jest.fn().mockImplementation((app) => ({
    listen: jest.fn().mockImplementation((port, host, callback) => {
      callback && callback();
      return {
        close: jest.fn(),
      };
    }),
  })),
}));

// 模拟 McpServer
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: mcpConnectMock,
    close: jest.fn(),
    server: {},
    _registeredResources: {},
    _registeredResourceTemplates: {},
    _registeredTools: {},
  })),
}));

jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn().mockImplementation((port, host, callback) => {
      if (callback) callback();
      return { close: jest.fn() };
    }),
    handlers: {
      get: null,
      post: null,
    },
    mockResponse: {
      setHeader: jest.fn().mockReturnThis(),
      flushHeaders: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      once: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    },
  };

  // 保存路由处理程序
  mockApp.get.mockImplementation((path, handler) => {
    mockApp.handlers.get = handler;
    return mockApp;
  });

  mockApp.post.mockImplementation((path, handler) => {
    mockApp.handlers.post = handler;
    return mockApp;
  });

  return jest.fn(() => mockApp);
});

jest.mock('../../src/mcp-server/shared/init', () => ({
  initOAPIMcpServer: jest.fn().mockImplementation((options) => ({
    mcpServer: {
      connect: mcpConnectMock,
    },
    larkClient: {},
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => {
  const mockSessionId = 'test-session-id';
  return {
    SSEServerTransport: jest.fn().mockImplementation((path, res) => ({
      sessionId: mockSessionId,
      handlePostMessage: handlePostMessageMock,
      close: jest.fn(),
    })),
  };
});

// 模拟utils.ts
jest.mock('../../src/mcp-server/transport/utils', () => {
  const original = jest.requireActual('../../src/mcp-server/transport/utils');
  return {
    ...original,
    parseMCPServerOptionsFromRequest: jest.fn().mockReturnValue({
      success: true,
      data: {
        appId: 'mock-app-id',
        appSecret: 'mock-app-secret',
      },
    }),
  };
});

// 保存原始console和process.exit
const originalConsole = console;
const originalProcessExit = process.exit;

describe('initSseServer', () => {
  // 获取模拟的Express应用程序
  const mockApp = express();

  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();

    // 模拟console和process.exit
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn() as any;

    // 重置parseMCPServerOptionsFromRequest的模拟
    (parseMCPServerOptionsFromRequest as jest.Mock).mockReturnValue({
      success: true,
      data: {
        appId: 'mock-app-id',
        appSecret: 'mock-app-secret',
      },
    });
  });

  afterEach(() => {
    // 恢复原始console和process.exit
    console = originalConsole;
    process.exit = originalProcessExit;
  });

  it('应该初始化Express应用程序并创建HTTP服务器', () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 验证调用
    expect(express).toHaveBeenCalled();
    expect(mockApp.get).toHaveBeenCalledWith('/sse', expect.any(Function));
    expect(mockApp.post).toHaveBeenCalledWith('/messages', expect.any(Function));
    expect(mockApp.listen).toHaveBeenCalledWith(options.port, options.host, expect.any(Function));
  });

  it('应该设置SSE响应头和连接MCP服务器', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 模拟请求和响应对象
    const req = { query: {} };
    const res = (mockApp as any).mockResponse;

    // 调用GET /sse 路由处理程序
    await (mockApp as any).handlers.get(req, res);

    // 验证SSEServerTransport创建和连接
    expect(SSEServerTransport).toHaveBeenCalledWith('/messages', res);
    expect(mcpConnectMock).toHaveBeenCalled();

    // 验证关闭事件侦听器设置
    expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('应该处理有效的POST消息请求', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 首先模拟一个SSE连接，这会创建transport
    const getReq = { query: {} };
    const getRes = (mockApp as any).mockResponse;
    await (mockApp as any).handlers.get(getReq, getRes);

    // 然后模拟一个POST请求
    const postReq = {
      query: { sessionId: 'test-session-id' },
      body: { data: 'test-data' },
    };
    const postRes = (mockApp as any).mockResponse;

    // 调用POST /messages 路由处理程序
    await (mockApp as any).handlers.post(postReq, postRes);

    // 验证handlePostMessage被调用
    expect(handlePostMessageMock).toHaveBeenCalledWith(postReq, postRes);
  });

  it('应该处理无效的POST消息请求', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 模拟一个带有无效sessionId的POST请求
    const invalidReq = {
      query: { sessionId: 'invalid-session-id' },
    };
    const res = (mockApp as any).mockResponse;

    // 调用POST /messages 路由处理程序
    await (mockApp as any).handlers.post(invalidReq, res);

    // 验证错误处理
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('No transport found for sessionId');
    expect(handlePostMessageMock).not.toHaveBeenCalled();
  });

  it('应该处理服务器错误', () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 修改listen以模拟错误
    (mockApp.listen as jest.Mock).mockImplementationOnce((port, host, callback) => {
      callback(new Error('Server error'));
      return { close: jest.fn() };
    });

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 验证错误处理
    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('应该在客户端断开连接时清理transport', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 模拟请求和响应对象
    const req = {
      query: { sessionId: 'test-session-id' },
    };
    const res = (mockApp as any).mockResponse;

    // 调用GET /sse 路由处理程序创建transport
    await (mockApp as any).handlers.get(req, res);
    expect(mockApp.get).toHaveBeenCalledWith('/sse', expect.any(Function));
    // 确保transport已创建并存储
    expect(SSEServerTransport).toHaveBeenCalledWith('/messages', res);

    // 获取并手动触发关闭回调
    type MockCall = [string, (...args: any[]) => void];
    const closeHandler = res.on.mock.calls.find((call: MockCall) => call[0] === 'close')[1];
    expect(closeHandler).toBeDefined();
    closeHandler();

    // 尝试发送带有刚才创建的会话ID的消息请求
    // 由于关闭回调已删除transport，预期会失败
    const postReq = {
      query: {
        sessionId: 'test-session-id',
      },
      body: { data: 'test-data' },
    };
    const postRes = (mockApp as any).mockResponse;

    // 调用POST /messages 路由处理程序
    await (mockApp as any).handlers.post(postReq, postRes);

    // 验证返回了错误
    expect(postRes.status).toHaveBeenCalledWith(400);
    expect(postRes.send).toHaveBeenCalledWith('No transport found for sessionId');
  });

  it('应该处理无效的请求参数', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    // 模拟 parseMCPServerOptionsFromRequest 返回失败
    (parseMCPServerOptionsFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      message: '无效的参数',
      data: {},
    });

    initSSEServer(() => mockServer, options);

    // 模拟请求和响应对象
    const req = { query: {} };
    const res = (mockApp as any).mockResponse;

    // 调用GET /sse 路由处理程序
    await (mockApp as any).handlers.get(req, res);

    // 验证错误处理
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Error handling SSE request'));
  });

  it('应该处理SSE请求过程中的异常', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例并使其抛出异常
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServerInstance = new McpServer();
    // 覆盖connect方法以抛出异常
    mockServerInstance.connect = jest.fn().mockRejectedValue(new Error('连接错误'));

    initSSEServer(() => mockServerInstance, options);

    // 模拟请求和响应对象
    const req = { query: {} };
    const res = (mockApp as any).mockResponse;
    res.headersSent = false;

    // 调用GET /sse 路由处理程序
    await (mockApp as any).handlers.get(req, res);

    // 验证错误处理
    expect(console.error).toHaveBeenCalledWith('Error handling SSE request:', expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Error handling SSE request');
  });

  it('应该处理headersSent为true时的错误处理', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 创建McpServer模拟实例并使其抛出异常
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServerInstance = new McpServer();
    // 覆盖connect方法以抛出异常
    mockServerInstance.connect = jest.fn().mockRejectedValue(new Error('连接错误'));

    initSSEServer(() => mockServerInstance, options);

    // 模拟请求和响应对象
    const req = {};
    const res = {
      ...(mockApp as any).mockResponse,
      headersSent: true,
    };

    // 调用GET /sse 路由处理程序
    await (mockApp as any).handlers.get(req, res);

    // 验证错误处理
    expect(console.error).toHaveBeenCalledWith('Error handling SSE request:', expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('应该处理具有不同请求参数的SSE连接', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 模拟解析不同的请求参数
    (parseMCPServerOptionsFromRequest as jest.Mock).mockReturnValueOnce({
      success: true,
      data: {
        appId: 'custom-app-id',
        appSecret: 'custom-app-secret',
        language: 'zh',
        tools: ['tool1', 'tool2'],
      },
    });

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();
    const getNewServerMock = jest.fn().mockReturnValue(mockServer);

    initSSEServer(getNewServerMock, options);

    // 模拟带有自定义参数的请求
    const req = {
      query: {
        appId: 'custom-app-id',
        appSecret: 'custom-app-secret',
        language: 'zh',
        tools: 'tool1,tool2',
      },
    };
    const res = (mockApp as any).mockResponse;

    // 调用GET /sse 路由处理程序
    await (mockApp as any).handlers.get(req, res);

    // 验证getNewServer使用了解析的选项
    expect(getNewServerMock).toHaveBeenCalledWith({
      appId: 'custom-app-id',
      appSecret: 'custom-app-secret',
      language: 'zh',
      tools: ['tool1', 'tool2'],
    });
  });

  it('应该对多个SSE连接使用不同的sessionId', async () => {
    const options: McpServerOptions = {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      host: 'localhost',
      port: 3000,
    };

    // 修改SSEServerTransport以返回不同的sessionId
    (SSEServerTransport as jest.Mock)
      .mockImplementationOnce((path, res) => ({
        sessionId: 'session-1',
        handlePostMessage: handlePostMessageMock,
        close: jest.fn(),
      }))
      .mockImplementationOnce((path, res) => ({
        sessionId: 'session-2',
        handlePostMessage: handlePostMessageMock,
        close: jest.fn(),
      }));

    // 创建McpServer模拟实例
    const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
    const mockServer = new McpServer();

    initSSEServer(() => mockServer, options);

    // 处理第一个SSE连接
    const req1 = { query: {} };
    const res1 = { ...(mockApp as any).mockResponse, on: jest.fn() };
    await (mockApp as any).handlers.get(req1, res1);

    // 处理第二个SSE连接
    const req2 = { query: {} };
    const res2 = { ...(mockApp as any).mockResponse, on: jest.fn() };
    await (mockApp as any).handlers.get(req2, res2);

    // 发送带有第一个sessionId的消息
    const postReq1 = {
      query: { sessionId: 'session-1' },
      body: { data: 'test-data-1' },
    };
    const postRes1 = (mockApp as any).mockResponse;
    await (mockApp as any).handlers.post(postReq1, postRes1);

    // 发送带有第二个sessionId的消息
    const postReq2 = {
      query: { sessionId: 'session-2' },
      body: { data: 'test-data-2' },
    };
    const postRes2 = (mockApp as any).mockResponse;
    await (mockApp as any).handlers.post(postReq2, postRes2);

    // 验证两个请求都由正确的transport处理
    expect(handlePostMessageMock).toHaveBeenCalledWith(postReq1, postRes1);
    expect(handlePostMessageMock).toHaveBeenCalledWith(postReq2, postRes2);
  });
});
