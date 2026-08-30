import { HttpClient } from "./client.js";
import { MCPServer, MCPTool, MCPServerWithTools, MCPServerEdit, CreateMCPServerRequest, MCPServerStats } from "./types.js";

export class MCPModule {
  constructor(private client: HttpClient) {}

  public async listServers(): Promise<MCPServer[]> {
    return this.client.request<MCPServer[]>("/api/mcp/servers");
  }

  public async getServer(serverId: string): Promise<MCPServerEdit> {
    return this.client.request<MCPServerEdit>(`/api/mcp/servers/${serverId}`);
  }

  public async createServer(data: CreateMCPServerRequest): Promise<MCPServerWithTools> {
    return this.client.request<MCPServerWithTools>("/api/mcp/servers", {
      method: "POST",
      body: data,
    });
  }

  public async updateServer(serverId: string, data: Partial<CreateMCPServerRequest>): Promise<MCPServerWithTools> {
    return this.client.request<MCPServerWithTools>(`/api/mcp/servers/${serverId}`, {
      method: "PUT",
      body: data,
    });
  }

  public async deleteServer(serverId: string): Promise<void> {
    await this.client.request(`/api/mcp/servers/${serverId}`, {
      method: "DELETE",
    });
  }

  public async sync(serverId: string): Promise<MCPServerWithTools> {
    return this.client.request<MCPServerWithTools>(`/api/mcp/servers/${serverId}/sync`, {
      method: "POST",
    });
  }

  public async getTools(serverId: string): Promise<MCPTool[]> {
    return this.client.request<MCPTool[]>(`/api/mcp/servers/${serverId}/tools`);
  }

  public async getServerStats(serverId: string, days?: number): Promise<MCPServerStats> {
    const params = days && days > 0 ? `?days=${days}` : "";
    const res = await this.client.request<{ data: MCPServerStats }>(`/api/mcp/servers/${serverId}/stats${params}`);
    return res.data;
  }
}
