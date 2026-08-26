import { Command } from "commander";
import { registerAgentsCommand } from "./commands/agents.js";
import { registerCredentialsCommand } from "./commands/credentials.js";
import { registerGatewayCommand } from "./commands/gateway.js";
import { registerHealthCommand } from "./commands/health.js";
import { registerLoginCommand } from "./commands/login.js";
import { registerModelsCommand } from "./commands/models.js";
import { registerRoutingCommand } from "./commands/routing.js";

const program = new Command();

program
  .name("prism")
  .description("Official CLI for RoozyLabs Prism AI Control Plane & Gateway")
  .version("2.1.0");

registerLoginCommand(program);
registerModelsCommand(program);
registerAgentsCommand(program);
registerCredentialsCommand(program);
registerRoutingCommand(program);
registerHealthCommand(program);
registerGatewayCommand(program);

program.parse(process.argv);

