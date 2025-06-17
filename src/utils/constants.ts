import { cleanEnvArgs } from './clean-env-args';
import { currentVersion } from './version';

export const USER_AGENT = `oapi-sdk-mcp/${currentVersion}`;

export const OAPI_MCP_DEFAULT_ARGS = {
  domain: 'https://open.feishu.cn',
  toolNameCase: 'snake',
  language: 'en',
  tokenMode: 'auto',
  mode: 'stdio',
  host: 'localhost',
  port: '3000',
};

export const OAPI_MCP_ENV_ARGS = cleanEnvArgs({
  appId: process.env.APP_ID,
  appSecret: process.env.APP_SECRET,
  userAccessToken: process.env.USER_ACCESS_TOKEN,
  tokenMode: process.env.LARK_TOKEN_MODE,
  tools: process.env.LARK_TOOLS,
  domain: process.env.LARK_DOMAIN,
});
