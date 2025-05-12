import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerCommonOptions } from '../shared';

export function initStdioServer(getNewServer: (options?: McpServerCommonOptions) => McpServer) {
  try {
    const transport = new StdioServerTransport();
    const mcpServer = getNewServer();
    mcpServer.connect(transport).catch((error) => {
      console.error('MCP Connect Error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    process.exit(1);
  }
}
