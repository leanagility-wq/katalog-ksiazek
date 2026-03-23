import { ScanCandidate } from "@/types/book";

export interface ScanSession {
  id: string;
  source: "camera" | "mock-camera" | "openai";
  createdAt: string;
  imageLabel: string;
  imageUri?: string;
  candidates: ScanCandidate[];
}
