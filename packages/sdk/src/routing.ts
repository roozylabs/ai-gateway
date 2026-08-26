import { HttpClient } from "./client.js";
import { RoutingDecision, RoutingSimulateRequest } from "./types.js";

export class RoutingModule {
  constructor(private client: HttpClient) {}

  /**
   * Run a dry-run routing simulation to evaluate which model/provider Prism will select.
   */
  public async simulate(request: RoutingSimulateRequest): Promise<RoutingDecision> {
    return this.client.request<RoutingDecision>("/api/routing/simulate", {
      method: "POST",
      body: request,
    });
  }
}

