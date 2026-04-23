import type { ToolCall, ToolResult } from './types';
import { runSearchWeb } from './executors/search';
import { runReadUrl } from './executors/readUrl';
import { SearchHttpError, SearchTimeoutError, SearchUnavailableError } from '../search';

export type {
  ToolParameter,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ToolExecutor,
} from './types';

export { TOOL_DEFINITIONS } from './definitions';

export async function executeTool(
  toolCall: ToolCall,
  opts?: { signal?: AbortSignal },
): Promise<ToolResult> {
  const { id, name, arguments: args } = toolCall;
  const signal = opts?.signal;

  try {
    switch (name) {
      case 'search_web': {
        const { content, sources } = await runSearchWeb(args, signal);
        return {
          toolCallId: id,
          toolName: name,
          content,
          isError: false,
          sources,
        };
      }
      case 'read_url': {
        const content = await runReadUrl(args, signal);
        return {
          toolCallId: id,
          toolName: name,
          content,
          isError: false,
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let errorCode: string | undefined;
    if (name === 'search_web') {
      if (error instanceof SearchUnavailableError) errorCode = 'search_unavailable';
      else if (error instanceof SearchTimeoutError) errorCode = 'search_timeout';
      else if (error instanceof SearchHttpError) errorCode = 'search_http';
      else errorCode = 'search_error';
    }
    return {
      toolCallId: id,
      toolName: name,
      content: `Error: ${message}`,
      isError: true,
      ...(errorCode ? { errorCode } : {}),
    };
  }
}
