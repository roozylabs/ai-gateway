import { HttpClient } from "./client.js";
import { MCPServer } from "./types.js";

export class MCPModule {
  constructor(private client: HttpClient) {}

  public async listServers(): Promise<MCPServer[]> {
    return this.client.request<MCPServer[]>("/api/mcp/servers");
  }

  public async sync(serverId: string): Promise<void> {
    await this.client.request(`/api/mcp/servers/${serverId}/sync`, {
      method: "POST",
    });
  }
}

