import { Request } from 'express';
import { McpServerCommonOptions, mcpServerCommonOptionSchema } from '../shared';
export function parseMCPServerOptionsFromRequest(req: Request): {
  data: McpServerCommonOptions;
  success: boolean;
  message?: string;
} {
  const result = mcpServerCommonOptionSchema.safeParse(req.query || {});
  if (!result.success) {
    return { data: {}, success: false, message: result.error.message };
  }
  return { data: result.data as McpServerCommonOptions, success: true };
}
