import { Book, ScanCandidate } from "@/types/book";

function createBookId() {
  return `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface MapCandidateToBookOptions {
  imageUri?: string;
}

export function mapCandidateToBook(
  candidate: ScanCandidate,
  options?: MapCandidateToBookOptions
): Book {
  const timestamp = new Date().toISOString();

  return {
    id: createBookId(),
    title: candidate.titleSuggestion.trim() || "Tytul do uzupelnienia",
    author: candidate.authorSuggestion?.trim() || "Autor do uzupelnienia",
    ocrText: candidate.rawText,
    imageUri: options?.imageUri,
    status: "needs_review",
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
