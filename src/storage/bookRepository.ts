import { mockBooks } from "@/data/mockBooks";
import { Book } from "@/types/book";

export interface BookRepository {
  list(): Promise<Book[]>;
  save(book: Book): Promise<void>;
}

class InMemoryBookRepository implements BookRepository {
  private books = [...mockBooks];

  async list() {
    return this.books;
  }

  async save(book: Book) {
    const index = this.books.findIndex((entry) => entry.id === book.id);

    if (index >= 0) {
      this.books[index] = book;
      return;
    }

    this.books.unshift(book);
  }
}

export const bookRepository: BookRepository = new InMemoryBookRepository();
