export const DEFAULT_TIMEOUT_SECONDS = 120;

export async function withTimeout<T>(timeoutSeconds: number, operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted || isAbortError(error)) {
      throw new Error(`timeout after ${timeoutSeconds} seconds`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
