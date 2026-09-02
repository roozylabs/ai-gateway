import { Prism } from "@roozylabs/prism";
import Table from "cli-table3";
import { Command } from "commander";
import { loadConfig } from "../config.js";

export function registerAgentsCommand(program: Command) {
  const agentCmd = program.command("agent").description("Manage agent identities and policies");

  agentCmd
    .command("list")
    .description("List registered agents")
    .action(async () => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const agents = await prism.agents.list();
        const table = new Table({
          head: ["Agent ID", "Name", "Description", "Status", "Workspace"],
          style: { head: ["cyan"] },
        });

        for (const a of agents) {
          table.push([a.id, a.name, a.description || "-", a.status, a.workspace_id || "default"]);
        }

        console.log(table.toString());
      } catch (err) {
        console.error("Failed to list agents:", (err as Error).message);
        process.exit(1);
      }
    });

  agentCmd
    .command("create")
    .description("Create a new agent identity")
    .requiredOption("-n, --name <name>", "Agent name")
    .option("-d, --description <desc>", "Agent description")
    .action(async (options) => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const agent = await prism.agents.create({
          name: options.name,
          description: options.description,
        });

        console.log(`Agent created successfully! ID: ${agent.id}`);
      } catch (err) {
        console.error("Failed to create agent:", (err as Error).message);
        process.exit(1);
      }
    });

  agentCmd
    .command("inspect <id>")
    .description("Inspect agent details and policy")
    .action(async (id: string) => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const agent = await prism.agents.get(id);
        console.log(JSON.stringify(agent, null, 2));
      } catch (err) {
        console.error("Failed to inspect agent:", (err as Error).message);
        process.exit(1);
      }
    });

  agentCmd
    .command("stats <id>")
    .description("Show usage stats for an agent")
    .option("-d, --days <days>", "Number of days to aggregate (max 90)", "30")
    .action(async (id: string, options) => {
      const config = loadConfig();
      const prism = new Prism({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      try {
        const stats = await prism.agents.stats(id, parseInt(options.days, 10));
        const table = new Table({
          head: ["Metric", "Value"],
          style: { head: ["cyan"] },
        });
        table.push(
          ["Total Requests", stats.totalRequests],
          ["Total Tokens", stats.totalTokens],
          ["Total Cost (USD)", `$${stats.totalCostUSD.toFixed(4)}`],
          ["Avg Latency (ms)", stats.avgLatencyMs],
          ["Success Rate", `${(stats.successRate * 100).toFixed(2)}%`],
          ["Tool Calls", stats.toolCallsCount]
        );
        console.log(table.toString());
      } catch (err) {
        console.error("Failed to load agent stats:", (err as Error).message);
        process.exit(1);
      }
    });
}

