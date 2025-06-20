import express from 'express';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { InitTransportServerFunction } from '../shared';
import { authStore } from '../../auth';
import { LarkAuthHandlerLocal } from '../../auth';

export const initStdioServer: InitTransportServerFunction = async (getNewServer, options) => {
  const { userAccessToken, appId } = options;

  let authHandler: LarkAuthHandlerLocal | undefined;

  if (!userAccessToken) {
    const app = express();
    app.use(express.json());
    authHandler = new LarkAuthHandlerLocal(app, options);
  }

  const transport = new StdioServerTransport();

  const userAccessTokenValue = userAccessToken
    ? userAccessToken
    : appId
      ? { getter: async () => await authStore.getLocalAccessToken(appId) }
      : undefined;

  const mcpServer = getNewServer({ ...options, userAccessToken: userAccessTokenValue }, authHandler);

  mcpServer.connect(transport).catch((error) => {
    console.error('MCP Connect Error:', error);
    process.exit(1);
  });
};
