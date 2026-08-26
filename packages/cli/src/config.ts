import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ConfigData {
  baseURL?: string;
  apiKey?: string;
  orgId?: string;
  workspaceId?: string;
  agentId?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".prism");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function loadConfig(): ConfigData {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content) as ConfigData;
    }
  } catch {
    // Ignore error and return defaults
  }
  return {
    baseURL: process.env.PRISM_API_URL || "http://localhost:8080",
    apiKey: process.env.PRISM_API_KEY,
  };
}

export function saveConfig(data: Partial<ConfigData>): ConfigData {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const existing = loadConfig();
    const updated = { ...existing, ...data };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (err) {
    throw new Error(`Failed to save config to ${CONFIG_FILE}: ${(err as Error).message}`);
  }
}

