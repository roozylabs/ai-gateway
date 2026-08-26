import { HttpClient } from "./client.js";
import { ModelListResponse } from "./types.js";

export class ModelsModule {
  constructor(private client: HttpClient) {}

  /**
   * List available OpenAI-compatible models from the Gateway.
   */
  public async list(): Promise<ModelListResponse> {
    return this.client.request<ModelListResponse>("/v1/models");
  }
}

