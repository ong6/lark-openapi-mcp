import { Client } from '@larksuiteoapi/node-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LarkMcpToolOptions, McpTool, ToolNameCase, TokenMode } from './types';
import { AllTools, AllToolsZh } from './tools';
import { defaultToolNames } from './constants';
import { filterTools, larkOapiHandler, caseTransf, getShouldUseUAT } from './utils';
import { LarkAuthHandler, isTokenValid } from '../auth';

/**
 * Feishu/Lark MCP
 */
export class LarkMcpTool {
  // Lark Client
  private client: Client | null = null;

  // User Access Token
  private userAccessToken: string | undefined;

  // Lark User Auth Handler
  private auth: LarkAuthHandler | undefined;

  // Lark MCP Tool Options
  private options: LarkMcpToolOptions;

  // All Tools
  private allTools: McpTool[] = [];

  /**
   * Feishu/Lark MCP
   * @param options Feishu/Lark Client Options
   */
  constructor(options: LarkMcpToolOptions, auth?: LarkAuthHandler) {
    this.options = options;
    this.auth = auth;

    if (options.client) {
      this.client = options.client;
    } else if (options.appId && options.appSecret) {
      this.client = new Client({ appId: options.appId, appSecret: options.appSecret, ...options });
    }

    const isZH = options.toolsOptions?.language === 'zh';

    const filterOptions = {
      allowTools: defaultToolNames,
      tokenMode: this.options.tokenMode || TokenMode.AUTO,
      ...options.toolsOptions,
    };

    this.allTools = filterTools(isZH ? AllToolsZh : AllTools, filterOptions);
  }

  /**
   * Get MCP Tools
   * @returns MCP Tool Definition Array
   */
  getTools(): McpTool[] {
    return this.allTools;
  }

  /**
   * Update User Access Token
   * @param userAccessToken User Access Token
   */
  updateUserAccessToken(userAccessToken: string) {
    this.userAccessToken = userAccessToken;
  }

  async ensureGetUserAccessToken() {
    if (!this.auth) {
      return { userAccessToken: this.userAccessToken };
    }

    const { valid, isExpired, token } = await isTokenValid(this.userAccessToken);
    if (valid) {
      return { userAccessToken: this.userAccessToken };
    }

    try {
      if (isExpired && token?.extra?.refreshToken) {
        // refreshToken
        const newToken = await this.auth.refreshToken(token.token);
        if (newToken?.access_token) {
          this.userAccessToken = newToken.access_token;
          return { userAccessToken: newToken.access_token };
        }
      }
    } catch {
      // refreshToken failed, reAuthorize
    }

    // if not enable oauth mode, return empty object
    if (!this.options.oauth) {
      return {};
    }
    // reAuthorize
    const { authorizeUrl, accessToken } = await this.auth.reAuthorize(this.userAccessToken);

    if (accessToken) {
      this.userAccessToken = accessToken;
      return { userAccessToken: accessToken };
    }

    return { authorizeUrl };
  }

  /**
   * Register Tools to MCP Server
   * @param server MCP Server Instance
   */
  registerMcpServer(server: McpServer, options?: { toolNameCase?: ToolNameCase }): void {
    for (const tool of this.allTools) {
      server.tool(caseTransf(tool.name, options?.toolNameCase), tool.description, tool.schema, async (params: any) => {
        try {
          if (!this.client) {
            return { isError: true, content: [{ type: 'text' as const, text: 'Client not initialized' }] };
          }
          const handler = tool.customHandler || larkOapiHandler;

          const shouldUseUAT = getShouldUseUAT(this.options.tokenMode, params?.useUAT ?? false);

          if (shouldUseUAT) {
            const { userAccessToken, authorizeUrl } = await this.ensureGetUserAccessToken();
            if (!userAccessToken) {
              return {
                isError: true,
                content: [
                  {
                    type: 'text' as const,
                    text: authorizeUrl
                      ? `UserAccessToken is invalid or expired, please authorize at ${authorizeUrl} and then try again. (Link expires in 60s, regenerating a new link will invalidate this one immediately)`
                      : 'UserAccessToken is invalid or expired',
                  },
                ],
              };
            }
            return handler(this.client, { ...params, useUAT: shouldUseUAT }, { userAccessToken, tool });
          }
          return handler(this.client, { ...params, useUAT: shouldUseUAT }, { tool });
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `Error: ${JSON.stringify((error as Error)?.message)}` }],
          };
        }
      });
    }
  }
}
