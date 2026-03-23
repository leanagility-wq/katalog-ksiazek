import { BookStatus } from "@/types/book";

export type SortKey = "updated_desc" | "title_asc" | "author_asc" | "status_asc";

export const STATUS_LABELS: Record<BookStatus, string> = {
  available: "Dostępna",
  borrowed: "Pożyczona",
  for_sale: "Na sprzedaż",
  sold: "Sprzedana",
  needs_review: "Do poprawy"
};

export const STATUS_OPTIONS: Array<{ key: BookStatus; label: string }> = [
  { key: "available", label: STATUS_LABELS.available },
  { key: "borrowed", label: STATUS_LABELS.borrowed },
  { key: "for_sale", label: STATUS_LABELS.for_sale },
  { key: "sold", label: STATUS_LABELS.sold },
  { key: "needs_review", label: STATUS_LABELS.needs_review }
];

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "updated_desc", label: "Ostatnio zmienione" },
  { key: "title_asc", label: "Tytuł A-Z" },
  { key: "author_asc", label: "Autor A-Z" },
  { key: "status_asc", label: "Status" }
];
