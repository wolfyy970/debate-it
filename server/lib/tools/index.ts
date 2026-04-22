import type { ToolCall, ToolResult } from './types';
import { runSearchWeb } from './executors/search';
import { runReadUrl } from './executors/readUrl';

export type {
  ToolParameter,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ToolExecutor,
} from './types';

export { TOOL_DEFINITIONS } from './definitions';

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { id, name, arguments: args } = toolCall;

  try {
    switch (name) {
      case 'search_web': {
        const { content, sources } = await runSearchWeb(args);
        return {
          toolCallId: id,
          toolName: name,
          content,
          isError: false,
          sources,
        };
      }
      case 'read_url': {
        const content = await runReadUrl(args);
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
    return {
      toolCallId: id,
      toolName: name,
      content: `Error: ${message}`,
      isError: true,
    };
  }
}
