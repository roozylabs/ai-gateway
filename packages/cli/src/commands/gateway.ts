import { Prism } from "@roozylabs/prism";
import { Command } from "commander";
import { loadConfig } from "../config.js";

export function registerGatewayCommand(program: Command) {
  const gwCmd = program.command("gateway").description("Inspect Gateway operational status");

  gwCmd
    .command("status")
    .description("Display operational summary of Gateway services")
    .action(async () => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const health = await prism.health.check();
        const models = await prism.models.list();

        console.log("\n=== Prism Gateway Operational Summary ===");
        console.log(`Gateway URL     : ${config.baseURL || "http://localhost:8080"}`);
        console.log(`System Status   : ${health.status.toUpperCase()}`);
        console.log(`Active Models   : ${models.data.length}`);
        console.log(`Database        : ${health.database}`);
        console.log(`Cache / Redis   : ${health.redis}`);
        console.log("=========================================\n");
      } catch (err) {
        console.error("Failed to fetch gateway status:", (err as Error).message);
        process.exit(1);
      }
    });
}

