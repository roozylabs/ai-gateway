import { AgentsModule } from "./agents.js";
import { ChatModule } from "./chat.js";
import { HttpClient } from "./client.js";
import { CredentialsModule } from "./credentials.js";
import { HealthModule } from "./health.js";
import { MCPModule } from "./mcp.js";
import { ModelsModule } from "./models.js";
import { ResourcesModule } from "./resources.js";
import { RoutingModule } from "./routing.js";
import { ToolsModule } from "./tools.js";
import { PrismClientOptions } from "./types.js";

export class Prism {
  public readonly client: HttpClient;
  public readonly chat: ChatModule;
  public readonly models: ModelsModule;
  public readonly agents: AgentsModule;
  public readonly credentials: CredentialsModule;
  public readonly tools: ToolsModule;
  public readonly resources: ResourcesModule;
  public readonly mcp: MCPModule;
  public readonly routing: RoutingModule;
  public readonly health: HealthModule;

  constructor(options: PrismClientOptions = {}) {
    this.client = new HttpClient(options);
    this.chat = new ChatModule(this.client);
    this.models = new ModelsModule(this.client);
    this.agents = new AgentsModule(this.client);
    this.credentials = new CredentialsModule(this.client);
    this.tools = new ToolsModule(this.client);
    this.resources = new ResourcesModule(this.client);
    this.mcp = new MCPModule(this.client);
    this.routing = new RoutingModule(this.client);
    this.health = new HealthModule(this.client);
  }
}

export * from "./types.js";
export { HttpClient };
export default Prism;

