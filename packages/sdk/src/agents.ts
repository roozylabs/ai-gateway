import { HttpClient } from "./client.js";
import { Agent, CreateAgentRequest, UpdateAgentRequest } from "./types.js";

export class AgentsModule {
  constructor(private client: HttpClient) {}

  public async list(): Promise<Agent[]> {
    return this.client.request<Agent[]>("/api/agents");
  }

  public async get(id: string): Promise<Agent> {
    return this.client.request<Agent>(`/api/agents/${id}`);
  }

  public async create(data: CreateAgentRequest): Promise<Agent> {
    return this.client.request<Agent>("/api/agents", {
      method: "POST",
      body: data,
    });
  }

  public async update(id: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.client.request<Agent>(`/api/agents/${id}`, {
      method: "PUT",
      body: data,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.client.request(`/api/agents/${id}`, {
      method: "DELETE",
    });
  }
}

