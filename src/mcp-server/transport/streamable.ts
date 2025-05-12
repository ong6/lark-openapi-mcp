import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerCommonOptions, McpServerTransportOptions } from '../shared';
import { parseMCPServerOptionsFromRequest } from './utils';

export function initStreamableServer(
  getNewServer: (options?: McpServerCommonOptions) => McpServer,
  options: McpServerTransportOptions,
) {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      console.log('Received POST MCP request');
      const options = parseMCPServerOptionsFromRequest(req);
      if (!options.success) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Error handling MCP request:' + options.message },
          id: null,
        });
        return;
      }
      const server = getNewServer(options.data);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }),
    );
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }),
    );
  });

  // Start the server
  app.listen(options.port, options.host, (error) => {
    if (error) {
      console.error('Server error:', error);
      process.exit(1);
    }
    console.log(`Server is running on port ${options.port}`);
    console.log(`Streamable endpoint: http://${options.host}:${options.port}/mcp`);
  });
}
