import { HttpClient } from "./client.js";
import { Resource, ResourceQueryRequest, ResourceQueryResponse } from "./types.js";

export class ResourcesModule {
  constructor(private client: HttpClient) {}

  public async list(): Promise<Resource[]> {
    return this.client.request<Resource[]>("/api/resources");
  }

  public async query(
    resourceName: string,
    action: string,
    params?: Record<string, unknown>
  ): Promise<ResourceQueryResponse> {
    return this.client.request<ResourceQueryResponse>(`/v1/resources/${resourceName}/query`, {
      method: "POST",
      body: { resource_name: resourceName, action, params },
    });
  }
}

