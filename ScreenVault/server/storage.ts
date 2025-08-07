import { type OcrResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  saveOcrResult(result: Omit<OcrResult, "id" | "processedAt">): Promise<OcrResult>;
  getOcrResult(id: string): Promise<OcrResult | undefined>;
  getAllOcrResults(): Promise<OcrResult[]>;
  clearOcrResults(): Promise<void>;
}

export class MemStorage implements IStorage {
  private ocrResults: Map<string, OcrResult>;

  constructor() {
    this.ocrResults = new Map();
  }

  async saveOcrResult(result: Omit<OcrResult, "id" | "processedAt">): Promise<OcrResult> {
    const id = randomUUID();
    const processedAt = new Date();
    const ocrResult: OcrResult = { ...result, id, processedAt };
    this.ocrResults.set(id, ocrResult);
    return ocrResult;
  }

  async getOcrResult(id: string): Promise<OcrResult | undefined> {
    return this.ocrResults.get(id);
  }

  async getAllOcrResults(): Promise<OcrResult[]> {
    return Array.from(this.ocrResults.values());
  }

  async clearOcrResults(): Promise<void> {
    this.ocrResults.clear();
  }
}

export const storage = new MemStorage();
