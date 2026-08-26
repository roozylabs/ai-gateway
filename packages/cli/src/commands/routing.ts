import { Prism } from "@roozylabs/prism";
import { Command } from "commander";
import { loadConfig } from "../config.js";

export function registerRoutingCommand(program: Command) {
  const routingCmd = program.command("routing").description("Test and simulate intelligent routing");

  routingCmd
    .command("simulate")
    .alias("test")
    .description("Simulate routing decision for a given prompt and model request")
    .option("-m, --model <model>", "Requested model name", "prism-auto")
    .option("-p, --prompt <prompt>", "Test prompt message", "Hello Prism")
    .option("-pol, --policy <policy>", "Routing policy (balanced, cheap, quality)", "balanced")
    .action(async (options) => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const result = await prism.routing.simulate({
          model: options.model,
          messages: [{ role: "user", content: options.prompt }],
          policy: options.policy,
        });

        console.log("\n=== Routing Decision Simulation Result ===");
        console.log(`Requested Model  : ${result.requested_model}`);
        console.log(`Selected Model   : ${result.selected_model}`);
        console.log(`Selected Provider: ${result.selected_provider}`);
        console.log(`Routing Policy   : ${result.routing_policy || options.policy}`);
        console.log(`Score            : ${result.score ?? "N/A"}`);
        console.log(`Est. Cost (USD)  : $${result.estimated_cost_usd ?? 0}`);
        console.log(`Expected Latency : ${result.expected_latency_ms ?? 0} ms`);
        if (result.fallback_models && result.fallback_models.length > 0) {
          console.log(`Fallback Models  : ${result.fallback_models.join(", ")}`);
        }
        console.log("===========================================\n");
      } catch (err) {
        console.error("Routing simulation failed:", (err as Error).message);
        process.exit(1);
      }
    });
}

