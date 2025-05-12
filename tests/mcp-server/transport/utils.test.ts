import { Request } from 'express';
import { parseMCPServerOptionsFromRequest } from '../../../src/mcp-server/transport/utils';
import { mcpServerCommonOptionSchema } from '../../../src/mcp-server/shared';

// 模拟zod schema
jest.mock('../../../src/mcp-server/shared/types', () => {
  const original = jest.requireActual('../../../src/mcp-server/shared/types');
  return {
    ...original,
    mcpServerCommonOptionSchema: {
      safeParse: jest.fn(),
    },
  };
});

describe('parseMCPServerOptionsFromRequest', () => {
  beforeEach(() => {
    // 重置所有模拟函数的调用记录
    jest.clearAllMocks();
  });

  it('应该成功解析有效的请求参数', () => {
    // 模拟请求对象
    const mockRequest = {
      query: {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        language: 'zh',
        tools: 'tool1,tool2',
      },
    } as unknown as Request;

    // 模拟zod解析结果
    (mcpServerCommonOptionSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: {
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
        language: 'zh',
        tools: ['tool1', 'tool2'],
      },
    });

    // 执行函数
    const result = parseMCPServerOptionsFromRequest(mockRequest);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      language: 'zh',
      tools: ['tool1', 'tool2'],
    });

    // 验证zod schema被调用
    expect(mcpServerCommonOptionSchema.safeParse).toHaveBeenCalledWith(mockRequest.query);
  });

  it('应该处理请求参数解析失败的情况', () => {
    // 模拟请求对象
    const mockRequest = {
      query: {
        appId: 'test-app-id',
        language: 'invalid-language', // 无效的语言值
      },
    } as unknown as Request;

    // 模拟zod解析失败结果
    (mcpServerCommonOptionSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: false,
      error: {
        message: '无效的语言值，必须是 zh 或 en',
      },
    });

    // 执行函数
    const result = parseMCPServerOptionsFromRequest(mockRequest);

    // 验证结果
    expect(result.success).toBe(false);
    expect(result.data).toEqual({});
    expect(result.message).toBe('无效的语言值，必须是 zh 或 en');

    // 验证zod schema被调用
    expect(mcpServerCommonOptionSchema.safeParse).toHaveBeenCalledWith(mockRequest.query);
  });

  it('应该处理空请求参数', () => {
    // 模拟请求对象，没有query参数
    const mockRequest = {
      query: {},
    } as unknown as Request;

    // 模拟zod解析结果 - 空参数也是有效的，因为所有字段都是可选的
    (mcpServerCommonOptionSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: {},
    });

    // 执行函数
    const result = parseMCPServerOptionsFromRequest(mockRequest);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});

    // 验证zod schema被调用
    expect(mcpServerCommonOptionSchema.safeParse).toHaveBeenCalledWith({});
  });

  it('应该处理undefined的请求参数', () => {
    // 模拟请求对象，没有query参数
    const mockRequest = {
      query: undefined,
    } as unknown as Request;

    // 模拟zod解析结果 - 对于undefined也使用空对象
    (mcpServerCommonOptionSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: {},
    });

    // 执行函数
    const result = parseMCPServerOptionsFromRequest(mockRequest);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});

    // 验证zod schema被调用
    expect(mcpServerCommonOptionSchema.safeParse).toHaveBeenCalledWith({});
  });

  it('应该使用zod schema验证需要转换的字段', () => {
    // 模拟请求对象，包含需要由zod转换的字段（如tools字段从字符串转为数组）
    const mockRequest = {
      query: {
        appId: 'test-app-id',
        tools: 'tool1,tool2,tool3', // 字符串格式，zod会负责转换
      },
    } as unknown as Request;

    // 模拟zod转换后的结果
    (mcpServerCommonOptionSchema.safeParse as jest.Mock).mockReturnValueOnce({
      success: true,
      data: {
        appId: 'test-app-id',
        tools: ['tool1', 'tool2', 'tool3'], // 已转换为数组
      },
    });

    // 执行函数
    const result = parseMCPServerOptionsFromRequest(mockRequest);

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      appId: 'test-app-id',
      tools: ['tool1', 'tool2', 'tool3'],
    });

    // 验证zod schema被调用
    expect(mcpServerCommonOptionSchema.safeParse).toHaveBeenCalledWith(mockRequest.query);
  });
});
