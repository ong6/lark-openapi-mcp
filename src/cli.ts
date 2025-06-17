#!/usr/bin/env node

import fs from 'fs';
import dotenv from 'dotenv';
import { Command } from 'commander';
import { currentVersion } from './utils/version';
import { initMcpServerWithTransport } from './mcp-server';
import { OAPI_MCP_DEFAULT_ARGS, OAPI_MCP_ENV_ARGS } from './utils/constants';
import { LoginHandler } from './cli/login-handler';

dotenv.config();

const program = new Command();

program.name('lark-mcp').description('Feishu/Lark MCP Tool').version(currentVersion);

program
  .command('login')
  .description('Login using OAuth and get user access token')
  .option('-a, --app-id <appId>', 'Feishu/Lark App ID')
  .option('-s, --app-secret <appSecret>', 'Feishu/Lark App Secret')
  .option('-d, --domain <domain>', 'Feishu/Lark Domain (default: "https://open.feishu.cn")')
  .option('--host <host>', 'Host to listen (default: "localhost")')
  .option('-p, --port <port>', 'Port to listen (default: "3000")')
  .option('--scope <scope>', 'Specify OAuth scope, if not specified, all permissions will be authorized by default')
  .action(async (options) => {
    await LoginHandler.handleLogin({ ...OAPI_MCP_DEFAULT_ARGS, ...OAPI_MCP_ENV_ARGS, ...options });
  });

program
  .command('logout')
  .description('Logout and clear stored user access token')
  .option('-a, --app-id <appId>', 'Feishu/Lark App ID')
  .action(async (options) => {
    await LoginHandler.handleLogout(options.appId);
  });

program
  .command('mcp')
  .description('Start Feishu/Lark MCP Service')
  .option('-a, --app-id <appId>', 'Feishu/Lark App ID')
  .option('-s, --app-secret <appSecret>', 'Feishu/Lark App Secret')
  .option('-d, --domain <domain>', 'Feishu/Lark Domain (default: "https://open.feishu.cn")')
  .option('-t, --tools <tools>', 'Allowed Tools List, separated by commas')
  .option('-c, --tool-name-case <toolNameCase>', 'Tool Name Case, snake or camel or kebab or dot (default: "snake")')
  .option('-l, --language <language>', 'Tools Language, zh or en (default: "en")')
  .option('--token-mode <tokenMode>', 'Token Mode, auto or user_access_token or tenant_access_token (default: "auto")')
  .option('-u, --user-access-token <userAccessToken>', 'User Access Token (beta)')
  .option(
    '--oauth',
    'Enable MCP Auth Server to get user_access_token and auto request user login when token expires (Beta) (default: false)',
  )
  .option('--scope <scope>', 'Specify OAuth scope, if not specified, all permissions will be authorized by default')
  .option('-m, --mode <mode>', 'Transport Mode, stdio or sse or streamable (default: "stdio")')
  .option('--host <host>', 'Host to listen (default: "localhost")')
  .option('-p, --port <port>', 'Port to listen (default: "3000")')
  .option('--config <configPath>', 'Config file path (JSON)')
  .action(async (options) => {
    let fileOptions = {};
    if (options.config) {
      try {
        const configContent = fs.readFileSync(options.config, 'utf-8');
        fileOptions = JSON.parse(configContent);
      } catch (err) {
        console.error('Failed to read config file:', err);
        process.exit(1);
      }
    }
    const mergedOptions = { ...OAPI_MCP_DEFAULT_ARGS, ...OAPI_MCP_ENV_ARGS, ...fileOptions, ...options };
    await initMcpServerWithTransport('oapi', mergedOptions);
  });

program
  .command('recall-developer-documents')
  .description('Start Feishu/Lark Open Platform Recall MCP Service')
  .option('-d, --domain <domain>', 'Feishu Open Platform Domain', 'https://open.feishu.cn')
  .option('-m, --mode <mode>', 'Transport Mode, stdio or sse or streamable', 'stdio')
  .option('--host <host>', 'Host to listen', 'localhost')
  .option('-p, --port <port>', 'Port to listen in sse mode', '3001')
  .action(async (options) => {
    await initMcpServerWithTransport('recall', options);
  });

if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);

export { program };
