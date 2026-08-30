export interface ApiModel {
  id: string;
  providerId: string;
  name: string;
  slug: string;
  displayName: string;
  enabled: boolean;
  providerName?: string;
  contextWindow?: number;
  maxTokens?: number;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  inputPricePer1M?: number;
  outputPricePer1M?: number;
  qualityScore?: number;
  speedScore?: number;
  codingScore?: number;
  capabilities?: {
    streaming?: boolean;
    functionCalling?: boolean;
    vision?: boolean;
    reasoning?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
