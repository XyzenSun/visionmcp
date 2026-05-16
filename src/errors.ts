const UPSTREAM_SUMMARY_LIMIT = 500;

export class UpstreamError extends Error {
  constructor(status: number, body: string) {
    super(`Upstream request failed with status ${status}: ${truncateSummary(body)}`);
    this.name = "UpstreamError";
  }
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!response.ok) {
    throw new UpstreamError(response.status, text);
  }

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Upstream response was not valid JSON");
  }
}

export function truncateSummary(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > UPSTREAM_SUMMARY_LIMIT
    ? `${normalized.slice(0, UPSTREAM_SUMMARY_LIMIT)}...`
    : normalized;
}

export function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
