export interface RemoteBookMatch {
  key: string;
  title: string;
  author: string;
  genre?: string;
  isbn?: string;
  publishYear?: number;
  thumbnailUrl?: string;
}

interface GoogleBooksIndustryIdentifier {
  type?: string;
  identifier?: string;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  categories?: string[];
  publishedDate?: string;
  industryIdentifiers?: GoogleBooksIndustryIdentifier[];
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
}

interface GoogleBooksItem {
  id?: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

interface GoogleBooksSearchResponse {
  items?: GoogleBooksItem[];
}

interface MatchContext {
  title?: string;
  author?: string;
  genre?: string;
}

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const GENRE_TRANSLATIONS: Record<string, string> = {
  fiction: "Proza",
  "science fiction": "Science fiction",
  fantasy: "Fantastyka",
  horror: "Horror",
  mystery: "Kryminał",
  thriller: "Thriller",
  suspense: "Thriller",
  detective: "Kryminał",
  crime: "Kryminał",
  romance: "Romans",
  poetry: "Poezja",
  drama: "Dramat",
  classics: "Klasyka",
  classic: "Klasyka",
  history: "Historia",
  historical: "Powieść historyczna",
  biography: "Biografia",
  autobiography: "Autobiografia",
  memoir: "Wspomnienia",
  philosophy: "Filozofia",
  psychology: "Psychologia",
  religion: "Religia",
  spirituality: "Duchowość",
  education: "Edukacja",
  study: "Edukacja",
  school: "Edukacja",
  textbook: "Podręcznik",
  technology: "Technologia",
  computers: "Informatyka",
  programming: "Programowanie",
  business: "Biznes",
  economics: "Ekonomia",
  self: "Rozwój osobisty",
  cooking: "Kuchnia",
  travel: "Podróże",
  art: "Sztuka",
  music: "Muzyka",
  comics: "Komiks",
  juvenile: "Literatura młodzieżowa",
  children: "Literatura dziecięca",
  young: "Literatura młodzieżowa"
};

function normalizeIsbn(value?: string) {
  return (value ?? "").replace(/[^0-9Xx]/g, "").toUpperCase();
}

function normalizeSearchText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokenSet(value?: string) {
  return new Set(
    normalizeSearchText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );
}

function parsePublishYear(value?: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : undefined;
}

function toPolishGenreLabel(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  const normalizedValue = value.trim();
  const lowerValue = normalizedValue.toLowerCase();

  if (GENRE_TRANSLATIONS[lowerValue]) {
    return GENRE_TRANSLATIONS[lowerValue];
  }

  const translatedParts = normalizedValue
    .split(/[/:,;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lowered = part.toLowerCase();
      return GENRE_TRANSLATIONS[lowered] ?? part;
    });

  return translatedParts.join(" / ");
}

function pickPreferredIsbn(
  identifiers?: GoogleBooksIndustryIdentifier[]
) {
  if (!identifiers?.length) {
    return undefined;
  }

  const isbn13 = identifiers.find((item) => item.type === "ISBN_13")?.identifier;
  const isbn10 = identifiers.find((item) => item.type === "ISBN_10")?.identifier;

  return isbn13 ?? isbn10 ?? identifiers[0]?.identifier;
}

function buildGoogleBooksQuery(
  title: string,
  author: string,
  isbn?: string,
  genre?: string
) {
  const tokens: string[] = [];
  const normalizedIsbn = normalizeIsbn(isbn);

  if (normalizedIsbn) {
    tokens.push(`isbn:${normalizedIsbn}`);
  }

  if (title.trim()) {
    tokens.push(`intitle:${title.trim()}`);
  }

  if (author.trim()) {
    tokens.push(`inauthor:${author.trim()}`);
  }

  if (genre?.trim()) {
    tokens.push(`subject:${genre.trim()}`);
  }

  return tokens.join(" ");
}

function buildBroadQuery(title: string, author: string, genre?: string) {
  return [title.trim(), author.trim(), genre?.trim()].filter(Boolean).join(" ");
}

function buildSearchUrl(query: string, langRestrict?: string) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("printType", "books");
  params.set("orderBy", "relevance");
  params.set("maxResults", "10");
  params.set(
    "fields",
    "items(id,volumeInfo(title,subtitle,authors,categories,publishedDate,industryIdentifiers,imageLinks))"
  );

  if (langRestrict) {
    params.set("langRestrict", langRestrict);
  }

  return `${GOOGLE_BOOKS_BASE_URL}?${params.toString()}`;
}

async function fetchGoogleBooks(query: string, langRestrict?: string) {
  const response = await fetch(buildSearchUrl(query, langRestrict), {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Wyszukiwanie online nie powiodlo sie (${response.status}).`);
  }

  return (await response.json()) as GoogleBooksSearchResponse;
}

function mapGoogleBooksItems(items?: GoogleBooksItem[]) {
  return (items ?? [])
    .filter((item) => item.volumeInfo?.title)
    .map<RemoteBookMatch>((item) => {
      const volumeInfo = item.volumeInfo ?? {};
      const preferredIsbn = pickPreferredIsbn(volumeInfo.industryIdentifiers);
      const title = [volumeInfo.title, volumeInfo.subtitle].filter(Boolean).join(": ");

      return {
        key:
          item.id ??
          `${volumeInfo.title ?? "unknown"}-${volumeInfo.authors?.[0] ?? "unknown"}`,
        title,
        author: volumeInfo.authors?.join(", ") ?? "",
        genre: toPolishGenreLabel(volumeInfo.categories?.[0]),
        isbn: preferredIsbn,
        publishYear: parsePublishYear(volumeInfo.publishedDate),
        thumbnailUrl:
          volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail
      };
    })
    .filter((item) => item.title && item.author);
}

function scoreTokenOverlap(left?: string, right?: string) {
  const leftTokens = toTokenSet(left);
  const rightTokens = toTokenSet(right);

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

export function pickBestRemoteBookMatch(
  matches: RemoteBookMatch[],
  context: MatchContext
) {
  if (!matches.length) {
    return null;
  }

  const scoredMatches = matches.map((match) => {
    const titleScore = scoreTokenOverlap(match.title, context.title);
    const authorScore = scoreTokenOverlap(match.author, context.author);
    const genreScore = scoreTokenOverlap(match.genre, context.genre);
    const isbnBoost = match.isbn ? 0.25 : 0;

    return {
      match,
      score: titleScore * 0.55 + authorScore * 0.3 + genreScore * 0.1 + isbnBoost
    };
  });

  scoredMatches.sort((left, right) => right.score - left.score);

  return scoredMatches[0]?.match ?? null;
}

export async function searchBooksOnline(
  title: string,
  author: string,
  isbn?: string,
  genre?: string
): Promise<RemoteBookMatch[]> {
  const preciseQuery = buildGoogleBooksQuery(title, author, isbn, genre);
  const broadQuery = buildBroadQuery(title, author, genre);

  if (!preciseQuery && !broadQuery) {
    return [];
  }

  const seenKeys = new Set<string>();
  const appendUniqueResults = (results: RemoteBookMatch[]) =>
    results.filter((result) => {
      const dedupeKey = `${result.title}|${result.author}|${result.isbn ?? ""}`.toLowerCase();

      if (seenKeys.has(dedupeKey)) {
        return false;
      }

      seenKeys.add(dedupeKey);
      return true;
    });

  const searchPlans = [
    preciseQuery ? { query: preciseQuery, langRestrict: "pl" } : null,
    preciseQuery ? { query: preciseQuery, langRestrict: undefined } : null,
    broadQuery && broadQuery !== preciseQuery
      ? { query: broadQuery, langRestrict: "pl" }
      : null,
    broadQuery && broadQuery !== preciseQuery
      ? { query: broadQuery, langRestrict: undefined }
      : null
  ].filter(Boolean) as Array<{ query: string; langRestrict?: string }>;

  const collectedResults: RemoteBookMatch[] = [];

  for (const plan of searchPlans) {
    const payload = await fetchGoogleBooks(plan.query, plan.langRestrict);
    const mappedResults = appendUniqueResults(mapGoogleBooksItems(payload.items));
    collectedResults.push(...mappedResults);

    if (collectedResults.length >= 8) {
      return collectedResults.slice(0, 8);
    }
  }

  return collectedResults.slice(0, 8);
}
