import { HttpClient } from "./client.js";
import {
  APIError,
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "./types.js";

export class ChatModule {
  constructor(private client: HttpClient) {}

  /**
   * Create a chat completion request to the Prism AI Gateway.
   */
  public async create(
    request: ChatCompletionRequest & { stream?: false }
  ): Promise<ChatCompletionResponse>;
  public async create(
    request: ChatCompletionRequest & { stream: true }
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
  public async create(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk>>;
  public async create(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionChunk>> {
    if (request.stream) {
      return this.stream(request);
    }

    return this.client.request<ChatCompletionResponse>("/v1/chat/completions", {
      method: "POST",
      body: request,
    });
  }

  /**
   * Stream a chat completion request yielding SSE chunks.
   */
  public async *stream(
    request: ChatCompletionRequest
  ): AsyncIterable<ChatCompletionChunk> {
    const payload = { ...request, stream: true };
    const response = await this.client.fetchRaw("/v1/chat/completions", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      let message = response.statusText;
      try {
        const errorJson = (await response.json()) as { error?: { message?: string } | string };
        if (typeof errorJson.error === "string") {
          message = errorJson.error;
        } else if (errorJson.error?.message) {
          message = errorJson.error.message;
        }
      } catch {
        // Ignore json parse error
      }
      throw new APIError(response.status, message);
    }

    if (!response.body) {
      throw new APIError(500, "Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") {
              return;
            }

            try {
              const chunk = JSON.parse(dataStr) as ChatCompletionChunk;
              yield chunk;
            } catch {
              // Ignore malformed JSON chunks in stream
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

