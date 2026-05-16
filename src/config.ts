import { z, type ZodIssue } from "zod";

export const SUPPORTED_FORMATS = ["openai", "anthropic", "gemini"] as const;
export type ProviderFormat = (typeof SUPPORTED_FORMATS)[number];

export type ServerConfig = {
  baseUrl: string;
  format: ProviderFormat;
  apiKey: string;
  model: string;
};

const envSchema = z.object({
  BASE_URL: z.string().trim().min(1, "BASE_URL is required"),
  FORMAT: z.enum(SUPPORTED_FORMATS, {
    errorMap: () => ({ message: "FORMAT must be one of openai, anthropic, or gemini" }),
  }),
  API_KEY: z.string().trim().min(1, "API_KEY is required"),
  MODEL: z.string().trim().min(1, "MODEL is required"),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const message = parsed.error.issues.map(formatConfigIssue).join("; ");
    throw new Error(message);
  }
  return {
    baseUrl: parsed.data.BASE_URL.replace(/\/+$/, ""),
    format: parsed.data.FORMAT,
    apiKey: parsed.data.API_KEY,
    model: parsed.data.MODEL,
  };
}

function formatConfigIssue(issue: ZodIssue): string {
  const name = issue.path.join(".");
  return name ? `${name}: ${issue.message}` : issue.message;
}
