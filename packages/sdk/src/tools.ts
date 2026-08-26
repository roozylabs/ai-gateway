import { HttpClient } from "./client.js";
import { Tool, ToolExecutionRequest, ToolExecutionResponse } from "./types.js";

export class ToolsModule {
  constructor(private client: HttpClient) {}

  public async list(): Promise<Tool[]> {
    return this.client.request<Tool[]>("/api/tools");
  }

  public async execute(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolExecutionResponse> {
    return this.client.request<ToolExecutionResponse>(`/v1/tools/${toolName}/execute`, {
      method: "POST",
      body: { tool_name: toolName, input },
    });
  }
}

