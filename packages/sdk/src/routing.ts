import { HttpClient } from "./client.js";
import { RoutingDecision, RoutingSimulateRequest } from "./types.js";

export class RoutingModule {
  constructor(private client: HttpClient) {}

  /**
   * Run a dry-run routing simulation to evaluate which model/provider Prism will select.
   */
  public async simulate(request: RoutingSimulateRequest): Promise<RoutingDecision> {
    let prompt = request.prompt;
    if (!prompt && request.messages && request.messages.length > 0) {
      const last = request.messages[request.messages.length - 1];
      prompt = typeof last.content === "string" ? last.content : JSON.stringify(last.content);
    }

    const payload = {
      prompt: prompt || "Explain Server-Sent Events (SSE) streaming in 2 paragraphs.",
      policyId: request.policyId || request.policy,
      customWeights: request.customWeights,
      budgetStatus: request.budgetStatus || "healthy",
      providerId: request.providerId,
    };

    const res = await this.client.request<RoutingDecision>("/api/routing/simulate", {
      method: "POST",
      body: payload,
    });

    // Populate legacy aliases for backwards compatibility
    res.requested_model = request.model || "prism-auto";
    res.selected_model = res.selectedModel;
    res.selected_provider = res.selectedProvider;
    res.routing_policy = res.policyName;
    if (res.candidates && res.candidates.length > 0) {
      res.score = res.candidates[0].score;
    }

    return res;
  }
}

