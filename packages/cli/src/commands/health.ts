import { Prism } from "@roozylabs/prism";
import { Command } from "commander";
import { loadConfig } from "../config.js";

export function registerHealthCommand(program: Command) {
  program
    .command("health")
    .description("Check API Gateway health status")
    .action(async () => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const health = await prism.health.check();
        console.log("\n=== Prism Gateway Health Status ===");
        console.log(`Status   : ${health.status}`);
        console.log(`Database : ${health.database}`);
        console.log(`Redis    : ${health.redis}`);
        console.log(`Version  : ${health.version}`);
        console.log(`Timestamp: ${health.timestamp}`);
        console.log("===================================\n");
      } catch (err) {
        console.error("Health check failed:", (err as Error).message);
        process.exit(1);
      }
    });
}

