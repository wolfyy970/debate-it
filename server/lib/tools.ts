import { searchWeb } from './search';

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean';
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  content: string;
  isError: boolean;
}

export type ToolExecutor = (args: Record<string, any>) => Promise<string>;

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_web',
    description: 'Search the web for factual information, data, studies, or evidence. Use this when you need to verify claims, find statistics, or gather evidence for your argument.',
    parameters: {
      query: {
        type: 'string',
        description: 'A specific, focused search query. Be precise.',
      },
      reason: {
        type: 'string',
        description: 'Briefly explain what factual claim you are verifying or what evidence you need.',
      },
    },
    required: ['query', 'reason'],
  },
  {
    name: 'read_url',
    description: 'Read the full content of a web page to get detailed information from a source. Use this when search results provide a promising URL but the snippet is insufficient.',
    parameters: {
      url: {
        type: 'string',
        description: 'The full URL to read',
      },
      reason: {
        type: 'string',
        description: 'Why you need to read this specific page',
      },
    },
    required: ['url', 'reason'],
  },
];

export async function executeTool(toolCall: ToolCall): Promise<ToolResult> {
  const { id, name, arguments: args } = toolCall;
  
  try {
    let content: string;
    
    switch (name) {
      case 'search_web':
        content = await executeSearch(args);
        break;
      case 'read_url':
        content = await executeReadUrl(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      toolCallId: id,
      toolName: name,
      content,
      isError: false,
    };
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

async function executeSearch(args: Record<string, any>): Promise<string> {
  const query = args.query;
  if (!query || typeof query !== 'string') {
    throw new Error('Missing required parameter: query');
  }
  
  const results = await searchWeb(query, 5);
  
  if (results.length === 0) {
    return 'No search results found. You may need to try a different query or proceed with general knowledge.';
  }
  
  return results
    .map((r, i) => `Result ${i + 1}:\nTitle: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
    .join('\n\n');
}

async function executeReadUrl(args: Record<string, any>): Promise<string> {
  const url = args.url;
  if (!url || typeof url !== 'string') {
    throw new Error('Missing required parameter: url');
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Debater/1.0 (Research Assistant)',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Simple HTML stripping (in production, use a proper HTML parser)
    const text = html
      .replace(/<script[^\u003e]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^\u003e]*>[\s\S]*?<\/style>/gi, '')
      .replace(/\u003c[^\u003e]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit to ~8000 chars to avoid context overflow
    return text.length > 8000 ? text.substring(0, 8000) + '...[truncated]' : text;
  } catch (error) {
    throw new Error(`Failed to read URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}
