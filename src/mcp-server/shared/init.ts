import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { initStdioServer, initSSEServer, initStreamableServer } from '../transport';
import { McpServerCommonOptions, McpServerOptions, McpServerType } from './types';
import * as larkmcp from '../../mcp-tool';
import { noop } from '../../utils/noop';
import { currentVersion } from '../../utils/version';
import { oapiHttpInstance } from '../../utils/http-instance';

export function initOAPIMcpServer(options: McpServerOptions) {
  const { appId, appSecret, userAccessToken } = options;

  if (!appId || !appSecret) {
    console.error('Error: Missing App Credentials');
    throw new Error('Missing App Credentials');
  }

  let allowTools = Array.isArray(options.tools) ? options.tools : options.tools?.split(',') || [];

  for (const [presetName, presetTools] of Object.entries(larkmcp.presetTools)) {
    if (allowTools.includes(presetName)) {
      allowTools = [...presetTools, ...allowTools];
    }
  }

  // Unique
  allowTools = Array.from(new Set(allowTools));

  // Create MCP Server
  const mcpServer = new McpServer({ id: 'lark-mcp-server', name: 'Feishu/Lark MCP Server', version: currentVersion });

  const larkClient = new larkmcp.LarkMcpTool({
    appId,
    appSecret,
    logger: { warn: noop, error: noop, debug: noop, info: noop, trace: noop },
    httpInstance: oapiHttpInstance,
    domain: options.domain,
    toolsOptions: allowTools.length
      ? { allowTools: allowTools as larkmcp.ToolName[], language: options.language }
      : { language: options.language },
    tokenMode: options.tokenMode,
  });

  if (userAccessToken) {
    larkClient.updateUserAccessToken(userAccessToken);
  }

  larkClient.registerMcpServer(mcpServer, { toolNameCase: options.toolNameCase });

  return { mcpServer, larkClient };
}

export function initRecallMcpServer(options: McpServerOptions) {
  const server = new McpServer({
    id: 'lark-recall-mcp-server',
    name: 'Lark Recall MCP Service',
    version: currentVersion,
  });
  server.tool(larkmcp.RecallTool.name, larkmcp.RecallTool.description, larkmcp.RecallTool.schema, (params) =>
    larkmcp.RecallTool.handler(params, options),
  );
  return server;
}

export function initMcpServerWithTransport(serverType: McpServerType, options: McpServerOptions) {
  const { mode } = options;

  const getNewServer = (commonOptions?: McpServerCommonOptions) => {
    if (serverType === 'oapi') {
      const { mcpServer } = initOAPIMcpServer({ ...options, ...commonOptions });
      return mcpServer;
    } else if (serverType === 'recall') {
      return initRecallMcpServer({ ...options, ...commonOptions });
    }
    throw new Error('Invalid server type');
  };

  switch (mode) {
    case 'stdio':
      initStdioServer(getNewServer);
      break;
    case 'sse':
      initSSEServer(getNewServer, options);
      break;
    case 'streamable':
      initStreamableServer(getNewServer, options);
      break;
    default:
      throw new Error('Invalid mode:' + mode);
  }
}
