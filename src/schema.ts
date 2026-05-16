import { z } from "zod";

export const DEFAULT_PROMPT = "请详细描述这张图片";

export const analyzeImageInputShape = {
  image_path: z.string().optional(),
  image_base64: z.string().optional(),
  mime_type: z.string().optional(),
  prompt: z.string().optional(),
  timeout_seconds: z.number().positive().optional(),
};

export const analyzeImageInputSchema = z
  .object(analyzeImageInputShape)
  .strict()
  .superRefine((value, ctx) => {
    const hasPath = typeof value.image_path === "string" && value.image_path.length > 0;
    const hasBase64 = typeof value.image_base64 === "string" && value.image_base64.length > 0;

    if (hasPath === hasBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of image_path or image_base64 must be provided",
        path: ["image_path"],
      });
    }

    if (hasPath && /^https?:\/\//i.test(value.image_path ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "image_path must be a local file path, not an HTTP or HTTPS URL",
        path: ["image_path"],
      });
    }
  });

export type AnalyzeImageInput = z.infer<typeof analyzeImageInputSchema>;

export function parseAnalyzeImageInput(input: unknown): AnalyzeImageInput {
  const parsed = analyzeImageInputSchema.safeParse(input);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(message);
  }

  return parsed.data;
}
