import { Prism } from "@roozylabs/prism";
import Table from "cli-table3";
import { Command } from "commander";
import { loadConfig } from "../config.js";

export function registerCredentialsCommand(program: Command) {
  const credCmd = program.command("credential").description("Manage provider credentials");

  credCmd
    .command("list")
    .description("List all upstream API credentials")
    .action(async () => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const creds = await prism.credentials.list();
        const table = new Table({
          head: ["ID", "Name", "Provider ID", "Status", "Health Score"],
          style: { head: ["cyan"] },
        });

        for (const c of creds) {
          table.push([c.id, c.name, c.provider_id, c.status, `${c.health_score ?? 100}/100`]);
        }

        console.log(table.toString());
      } catch (err) {
        console.error("Failed to list credentials:", (err as Error).message);
        process.exit(1);
      }
    });

  credCmd
    .command("reset-cooldown <id>")
    .description("Reset cooldown status for a credential")
    .action(async (id: string) => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        await prism.credentials.resetCooldown(id);
        console.log(`Successfully reset cooldown for credential ${id}`);
      } catch (err) {
        console.error("Failed to reset cooldown:", (err as Error).message);
        process.exit(1);
      }
    });
}

