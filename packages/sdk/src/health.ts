import { HttpClient } from "./client.js";
import { HealthCheckResponse } from "./types.js";

export class HealthModule {
  constructor(private client: HttpClient) {}

  public async check(): Promise<HealthCheckResponse> {
    return this.client.request<HealthCheckResponse>("/health");
  }
}

