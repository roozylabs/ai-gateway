import { Prism } from "@roozylabs/prism";
import Table from "cli-table3";
import { Command } from "commander";
import { loadConfig } from "../config.js";

export function registerModelsCommand(program: Command) {
  const modelCmd = program.command("model").description("Manage and inspect models");

  modelCmd
    .command("list")
    .description("List all available models in the Gateway")
    .action(async () => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const res = await prism.models.list();
        const table = new Table({
          head: ["Model ID", "Owned By", "Object", "Created"],
          style: { head: ["cyan"] },
        });

        for (const item of res.data) {
          table.push([
            item.id,
            item.owned_by || "prism",
            item.object,
            new Date(item.created * 1000).toLocaleString(),
          ]);
        }

        console.log(table.toString());
      } catch (err) {
        console.error("Failed to list models:", (err as Error).message);
        process.exit(1);
      }
    });
}

