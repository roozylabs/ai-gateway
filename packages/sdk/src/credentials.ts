import { HttpClient } from "./client.js";
import { Credential, CredentialHealth } from "./types.js";

export class CredentialsModule {
  constructor(private client: HttpClient) {}

  public async list(): Promise<Credential[]> {
    return this.client.request<Credential[]>("/api/credentials");
  }

  public async delete(id: string): Promise<void> {
    await this.client.request(`/api/credentials/${id}`, {
      method: "DELETE",
    });
  }

  public async resetCooldown(id: string): Promise<void> {
    await this.client.request(`/api/credentials/${id}/reset-cooldown`, {
      method: "POST",
    });
  }
}

