export type BookStatus =
  | "available"
  | "borrowed"
  | "for_sale"
  | "sold"
  | "needs_review";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  shelfLocation?: string;
  imageUri?: string;
  ocrText: string;
  price?: number;
  borrowedTo?: string;
  notes?: string;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScanCandidate {
  id: string;
  rawText: string;
  titleSuggestion: string;
  authorSuggestion?: string;
  confidence?: number;
  needsAttention?: boolean;
  reviewReason?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
