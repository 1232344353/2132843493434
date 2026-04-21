import { describe, expect, it } from "vitest";
import {
  getRequiredOpenAiApiKey,
  isPlaceholderOpenAiApiKey,
  toClientFacingOpenAiError,
} from "@/lib/openai";

describe("OpenAI helpers", () => {
  it("accepts a valid API key", () => {
    expect(getRequiredOpenAiApiKey("  sk-proj-valid_key_123  ")).toBe(
      "sk-proj-valid_key_123"
    );
  });

  it("rejects missing API keys", () => {
    expect(() => getRequiredOpenAiApiKey("")).toThrow(
      "OpenAI API key is not configured on the server."
    );
  });

  it("rejects placeholder or malformed API keys", () => {
    expect(isPlaceholderOpenAiApiKey("your_api_key_here")).toBe(true);
    expect(isPlaceholderOpenAiApiKey("sk-your_api_key_here")).toBe(true);
    expect(() => getRequiredOpenAiApiKey("your_api_key_here")).toThrow(
      "OpenAI API key is not configured correctly on the server."
    );
    expect(() => getRequiredOpenAiApiKey("not-a-real-key")).toThrow(
      "OpenAI API key is not configured correctly on the server."
    );
  });

  it("sanitizes invalid key errors", () => {
    expect(
      toClientFacingOpenAiError(
        new Error(
          'OpenAI API error 401: {"error":{"message":"Incorrect API key provided: your_api_key_here","code":"invalid_api_key"}}'
        )
      )
    ).toBe(
      "AI is not configured correctly on the server. Update OPENAI_API_KEY and try again."
    );
  });

  it("sanitizes rate limit errors", () => {
    expect(
      toClientFacingOpenAiError(new Error("OpenAI API error 429: rate limit exceeded"))
    ).toBe("OpenAI is rate-limited right now. Please try again shortly.");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(toClientFacingOpenAiError(new Error("socket hang up"))).toBe(
      "Failed to generate AI response. Please try again."
    );
  });
});
