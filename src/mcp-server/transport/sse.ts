import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpServerCommonOptions, McpServerTransportOptions } from '../shared';
import { parseMCPServerOptionsFromRequest } from './utils';

export function initSSEServer(
  getNewServer: (options?: McpServerCommonOptions) => McpServer,
  options: McpServerTransportOptions,
) {
  const app = express();
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  app.get('/sse', async (req: Request, res: Response) => {
    try {
      const options = parseMCPServerOptionsFromRequest(req);
      if (!options.success) {
        console.log('Error handling SSE request:', options.message);
        res.status(400).send('Error handling SSE request' + options.message);
        return;
      }
      const mcpServer = getNewServer(options.data);
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => {
        transport.close();
        mcpServer.close();
        delete transports[transport.sessionId];
      });
      await mcpServer.connect(transport);
    } catch (error) {
      console.error('Error handling SSE request:', error);
      if (!res.headersSent) {
        res.status(500).send('Error handling SSE request');
      }
    }
  });

  app.post('/messages', async (req: Request, res: Response) => {
    console.log('Received POST messages request');
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (!transport) {
      res.status(400).send('No transport found for sessionId');
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(options.port, options.host, (error) => {
    if (error) {
      console.error('Server error:', error);
      process.exit(1);
    }
    console.log(`Server is running on port ${options.port}`);
    console.log(`SSE endpoint: http://${options.host}:${options.port}/sse`);
  });
}
