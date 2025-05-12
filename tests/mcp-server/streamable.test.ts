// @ts-nocheck
import { initStreamableServer } from '../../src/mcp-server/transport/streamable';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { parseMCPServerOptionsFromRequest } from '../../src/mcp-server/transport/utils';

// 模拟依赖
jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('@modelcontextprotocol/sdk/server/streamableHttp.js');
jest.mock('../../src/mcp-server/transport/utils', () => ({
  parseMCPServerOptionsFromRequest: jest.fn().mockReturnValue({
    success: true,
    data: {
      appId: 'mock-app-id',
      appSecret: 'mock-app-secret',
    },
  }),
}));

jest.mock('express', () => {
  const mockApp = {
    use: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    listen: jest.fn().mockImplementation((port, host, callback) => {
      if (callback) callback();
      return { close: jest.fn() };
    }),
  };

  const mockExpress = jest.fn(() => mockApp);
  mockExpress.json = jest.fn();

  return mockExpress;
});

describe('initStreamableServer', () => {
  // 保存原始控制台和process.exit
  const originalConsole = console;
  const originalExit = process.exit;

  // 模拟函数
  const connectMock = jest.fn();
  const handleRequestMock = jest.fn();
  const transportCloseMock = jest.fn();
  const serverCloseMock = jest.fn();

  // 创建测试用的请求和响应
  const mockRequest = { body: { data: 'test' } };
  const mockResponse = {
    on: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    writeHead: jest.fn().mockReturnThis(),
    end: jest.fn(),
    headersSent: false,
  };

  // 设置
  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 模拟控制台和process.exit
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();

    // 设置McpServer模拟
    (McpServer as jest.Mock).mockImplementation(() => ({
      connect: connectMock,
      close: serverCloseMock,
    }));

    // 设置StreamableHTTPServerTransport模拟
    (StreamableHTTPServerTransport as jest.Mock).mockImplementation(() => ({
      handleRequest: handleRequestMock,
      close: transportCloseMock,
    }));

    // 重置parseMCPServerOptionsFromRequest模拟
    (parseMCPServerOptionsFromRequest as jest.Mock).mockReturnValue({
      success: true,
      data: {
        appId: 'mock-app-id',
        appSecret: 'mock-app-secret',
      },
    });
  });

  // 清理
  afterEach(() => {
    // 恢复原始控制台和process.exit
    console = originalConsole;
    process.exit = originalExit;
  });

  it('应该初始化Express应用程序并设置正确的路由', () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 执行
    initStreamableServer(getMockServer, options);

    // 断言
    expect(express).toHaveBeenCalled();
    expect(express.json).toHaveBeenCalled();
    expect(mockApp.use).toHaveBeenCalled();
    expect(mockApp.post).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(mockApp.get).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(mockApp.delete).toHaveBeenCalledWith('/mcp', expect.any(Function));
    expect(mockApp.listen).toHaveBeenCalledWith(options.port, options.host, expect.any(Function));
  });

  it('应该处理POST请求错误和关闭回调', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 模拟错误
    handleRequestMock.mockRejectedValueOnce(new Error('Test error'));

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取POST处理程序并调用它
    const postHandler = mockApp.post.mock.calls[0][1];
    await postHandler(mockRequest, mockResponse);

    // 断言错误处理
    expect(console.error).toHaveBeenCalledWith('Error handling MCP request:', expect.any(Error));
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });

    // 模拟响应关闭回调
    const closeCallback = mockResponse.on.mock.calls[0][1];
    closeCallback();

    // 断言关闭逻辑
    expect(transportCloseMock).toHaveBeenCalled();
    expect(serverCloseMock).toHaveBeenCalled();
  });

  it('如果headers已经发送，不应该发送错误响应', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 模拟错误和已发送的headers
    handleRequestMock.mockRejectedValueOnce(new Error('Test error'));
    const mockResponseWithHeadersSent = {
      ...mockResponse,
      headersSent: true,
    };

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取POST处理程序并调用它
    const postHandler = mockApp.post.mock.calls[0][1];
    await postHandler(mockRequest, mockResponseWithHeadersSent);

    // 断言错误处理
    expect(console.error).toHaveBeenCalledWith('Error handling MCP request:', expect.any(Error));
    expect(mockResponseWithHeadersSent.status).not.toHaveBeenCalled();
    expect(mockResponseWithHeadersSent.json).not.toHaveBeenCalled();
  });

  it('应该处理GET请求', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取GET处理程序并调用它
    const getHandler = mockApp.get.mock.calls[0][1];
    await getHandler(mockRequest, mockResponse);

    // 断言响应
    expect(console.log).toHaveBeenCalledWith('Received GET MCP request');
    expect(mockResponse.writeHead).toHaveBeenCalledWith(405);
    expect(mockResponse.end).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      }),
    );
  });

  it('应该处理DELETE请求', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取DELETE处理程序并调用它
    const deleteHandler = mockApp.delete.mock.calls[0][1];
    await deleteHandler(mockRequest, mockResponse);

    // 断言响应
    expect(console.log).toHaveBeenCalledWith('Received DELETE MCP request');
    expect(mockResponse.writeHead).toHaveBeenCalledWith(405);
    expect(mockResponse.end).toHaveBeenCalledWith(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      }),
    );
  });

  it('应该处理服务器启动错误', () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 模拟listen调用中的错误
    mockApp.listen.mockImplementationOnce((port, host, callback) => {
      callback(new Error('Server start error'));
      return { close: jest.fn() };
    });

    // 执行
    initStreamableServer(getMockServer, options);

    // 断言错误处理
    expect(console.error).toHaveBeenCalledWith('Server error:', expect.any(Error));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('应该处理请求参数解析失败', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 模拟参数解析失败
    (parseMCPServerOptionsFromRequest as jest.Mock).mockReturnValueOnce({
      success: false,
      message: '无效参数',
      data: {},
    });

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取POST处理程序并调用它
    const postHandler = mockApp.post.mock.calls[0][1];
    const mockReq = { ...mockRequest, query: { appId: 'invalid-format' } };
    await postHandler(mockReq, mockResponse);

    // 断言错误处理
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: expect.stringContaining('Error handling MCP request'),
      },
      id: null,
    });
  });

  it('应该传递正确的选项给McpServer', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();
    const getMockServer = jest.fn().mockReturnValue(new McpServer());
    const options = { port: 3000, host: 'localhost' };

    // 模拟自定义参数
    (parseMCPServerOptionsFromRequest as jest.Mock).mockReturnValueOnce({
      success: true,
      data: {
        appId: 'custom-app-id',
        appSecret: 'custom-app-secret',
        language: 'zh',
        tools: ['tool1', 'tool2'],
      },
    });

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取POST处理程序并调用它
    const postHandler = mockApp.post.mock.calls[0][1];
    const mockReq = {
      ...mockRequest,
      query: {
        appId: 'custom-app-id',
        appSecret: 'custom-app-secret',
        language: 'zh',
        tools: 'tool1,tool2',
      },
    };
    await postHandler(mockReq, mockResponse);

    // 断言选项传递
    expect(getMockServer).toHaveBeenCalledWith({
      appId: 'custom-app-id',
      appSecret: 'custom-app-secret',
      language: 'zh',
      tools: ['tool1', 'tool2'],
    });
  });

  it('应该支持多个并发连接', async () => {
    // 设置
    const express = require('express');
    const mockApp = express();

    // 创建不同的模拟服务器实例
    const mockServer1 = { connect: jest.fn(), close: jest.fn() };
    const mockServer2 = { connect: jest.fn(), close: jest.fn() };

    // 模拟getNewServer按顺序返回不同的服务器
    const getMockServer = jest.fn().mockReturnValueOnce(mockServer1).mockReturnValueOnce(mockServer2);

    const options = { port: 3000, host: 'localhost' };

    // 模拟不同的传输对象
    const mockTransport1 = { handleRequest: jest.fn(), close: jest.fn() };
    const mockTransport2 = { handleRequest: jest.fn(), close: jest.fn() };

    (StreamableHTTPServerTransport as jest.Mock)
      .mockImplementationOnce(() => mockTransport1)
      .mockImplementationOnce(() => mockTransport2);

    // 执行
    initStreamableServer(getMockServer, options);

    // 获取POST处理程序并调用它
    const postHandler = mockApp.post.mock.calls[0][1];

    // 处理两个并发请求
    const mockRes1 = { ...mockResponse, on: jest.fn() };
    const mockRes2 = { ...mockResponse, on: jest.fn() };

    await postHandler(mockRequest, mockRes1);
    await postHandler(mockRequest, mockRes2);

    // 断言每个请求创建了自己的服务器和传输对象
    expect(getMockServer).toHaveBeenCalledTimes(2);
    expect(StreamableHTTPServerTransport).toHaveBeenCalledTimes(2);
    expect(mockServer1.connect).toHaveBeenCalledWith(mockTransport1);
    expect(mockServer2.connect).toHaveBeenCalledWith(mockTransport2);
  });

  it('应该在客户端断开连接时清理资源', async () => {
    // 我们需要完全模拟一个新的POST请求处理场景

    // 模拟Express
    const express = require('express');
    const mockApp = express();

    // 单独定义精确的mockServer和mockTransport，它们有明确的close方法
    const localServerCloseMock = jest.fn();
    const localTransportCloseMock = jest.fn();

    const mockServer = {
      connect: jest.fn(),
      close: localServerCloseMock,
    };

    const mockTransport = {
      handleRequest: jest.fn(),
      close: localTransportCloseMock,
    };

    const getMockServer = jest.fn().mockReturnValue(mockServer);

    // 重置StreamableHTTPServerTransport mock以返回我们的自定义mockTransport
    (StreamableHTTPServerTransport as jest.Mock).mockImplementationOnce(() => mockTransport);

    // 执行
    initStreamableServer(getMockServer, { port: 3000, host: 'localhost' });

    // 获取POST处理程序
    const postHandler = mockApp.post.mock.calls[0][1];

    // 模拟响应对象，它会储存close事件的回调
    let closeCallback;
    const mockRes = {
      ...mockResponse,
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockRes;
      }),
    };

    // 调用POST处理程序
    await postHandler(mockRequest, mockRes);

    // 验证res.on被调用来监听close事件
    expect(mockRes.on).toHaveBeenCalledWith('close', expect.any(Function));

    // 手动触发我们捕获的close回调
    expect(closeCallback).toBeDefined();
    closeCallback();

    // 验证close方法被调用
    expect(localTransportCloseMock).toHaveBeenCalled();
    expect(localServerCloseMock).toHaveBeenCalled();
  });
});
