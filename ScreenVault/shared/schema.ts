import { z } from "zod";

export const ocrResultSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  extractedText: z.string(),
  confidence: z.number(),
  wordCount: z.number(),
  processedAt: z.date(),
});

export const structuredDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  detectedPattern: z.string(),
  sourceFiles: z.array(z.string()),
});

export const uploadFileSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  buffer: z.instanceof(Buffer),
});

export const processFilesRequestSchema = z.object({
  files: z.array(uploadFileSchema),
});

export const downloadRequestSchema = z.object({
  format: z.enum(["csv", "json"]).optional(),
  results: z.array(ocrResultSchema.omit({ processedAt: true }).extend({
    processedAt: z.string()
  })),
});

export type OcrResult = z.infer<typeof ocrResultSchema>;
export type UploadFile = z.infer<typeof uploadFileSchema>;
export type ProcessFilesRequest = z.infer<typeof processFilesRequestSchema>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
export type StructuredData = z.infer<typeof structuredDataSchema>;
