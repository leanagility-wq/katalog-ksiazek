import { Book } from "@/types/book";

export const mockBooks: Book[] = [
  {
    id: "1",
    title: "Solaris",
    author: "Stanislaw Lem",
    isbn: "9788374803660",
    shelfLocation: "Salon / Regal A / Polka 2",
    ocrText: "LEM SOLARIS",
    status: "available",
    createdAt: "2026-03-23T09:00:00.000Z",
    updatedAt: "2026-03-23T09:00:00.000Z"
  },
  {
    id: "2",
    title: "Mistrz i Malgorzata",
    author: "Michail Bulgakow",
    shelfLocation: "Salon / Regal A / Polka 2",
    ocrText: "BULGAKOW MISTRZ I MALGORZATA",
    status: "for_sale",
    price: 25,
    createdAt: "2026-03-23T10:00:00.000Z",
    updatedAt: "2026-03-23T10:00:00.000Z"
  }
];
