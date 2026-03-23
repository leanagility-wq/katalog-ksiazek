export interface RemoteBookMatch {
  key: string;
  title: string;
  author: string;
  isbn?: string;
  publishYear?: number;
  coverId?: number;
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  first_publish_year?: number;
  cover_i?: number;
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDoc[];
}

const OPEN_LIBRARY_BASE_URL = "https://openlibrary.org/search.json";

function buildSearchUrl(title: string, author: string) {
  const params = new URLSearchParams();

  if (title.trim()) {
    params.set("title", title.trim());
  }

  if (author.trim()) {
    params.set("author", author.trim());
  }

  params.set("language", "pol");
  params.set("limit", "8");

  return `${OPEN_LIBRARY_BASE_URL}?${params.toString()}`;
}

export async function searchBooksOnline(
  title: string,
  author: string
): Promise<RemoteBookMatch[]> {
  if (!title.trim() && !author.trim()) {
    return [];
  }

  const response = await fetch(buildSearchUrl(title, author), {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Wyszukiwanie online nie powiodlo sie (${response.status}).`);
  }

  const payload = (await response.json()) as OpenLibrarySearchResponse;

  return (payload.docs ?? [])
    .filter((doc) => doc.title && (doc.author_name?.length ?? 0) > 0)
    .map((doc) => ({
      key: doc.key ?? `${doc.title}-${doc.author_name?.[0] ?? "unknown"}`,
      title: doc.title ?? "",
      author: doc.author_name?.[0] ?? "",
      isbn: doc.isbn?.[0],
      publishYear: doc.first_publish_year,
      coverId: doc.cover_i
    }));
}
