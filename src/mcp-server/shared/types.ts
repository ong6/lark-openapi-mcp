import * as larkmcp from '../../mcp-tool';
import { z } from 'zod';

export type McpServerType = 'oapi' | 'recall';
export type McpServerTransport = 'stdio' | 'sse' | 'streamable';

export interface McpServerCommonOptions {
  appId?: string;
  appSecret?: string;
  domain?: string;
  tools?: string | string[];
  userAccessToken?: string;
  language?: 'zh' | 'en';
  toolNameCase?: larkmcp.ToolNameCase;
  tokenMode?: larkmcp.TokenMode;
}

export const mcpServerCommonOptionSchema = z.object({
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  domain: z.string().optional(),
  tools: z.union([z.string(), z.array(z.string())]).optional(),
  userAccessToken: z.string().optional(),
  language: z.enum(['zh', 'en']).optional(),
  toolNameCase: z.enum(['snake', 'camel']).optional(),
  tokenMode: z.enum(['auto', 'user_access_token', 'tenant_access_token']).optional(),
});

export interface McpServerTransportOptions {
  mode?: McpServerTransport;
  host: string;
  port: number;
}

export type McpServerOptions = McpServerCommonOptions & McpServerTransportOptions;
