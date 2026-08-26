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
        const prompt = options.prompt || "Explain Server-Sent Events (SSE) streaming in 2 paragraphs.";
        const result = await prism.routing.simulate({
          prompt: prompt,
          model: options.model,
          policy: options.policy,
        });

        console.log("\n=== Routing Decision Simulation Result ===");
        console.log(`Prompt Preview   : ${result.promptPreview || prompt}`);
        console.log(`Task Type        : ${result.taskType || "N/A"}`);
        console.log(`Complexity       : ${result.complexity || "N/A"}`);
        console.log(`Routing Policy   : ${result.policyName || options.policy}`);
        console.log(`Selected Model   : ${result.selectedModel || result.selected_model || "N/A"}`);
        console.log(`Selected Provider: ${result.selectedProvider || result.selected_provider || "N/A"}`);
        if (result.candidates && result.candidates.length > 0) {
          const top = result.candidates[0];
          console.log(`Top Score        : ${top.score ? top.score.toFixed(4) : "N/A"} (${top.displayName || top.slug})`);
        }
        if (result.downgradeReason) {
          console.log(`Downgrade Reason : ${result.downgradeReason}`);
        }
        console.log("===========================================\n");
      } catch (err) {
        console.error("Routing simulation failed:", (err as Error).message);
        process.exit(1);
      }
    });
}

