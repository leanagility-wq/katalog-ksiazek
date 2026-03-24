export const CORE_GENRES = [
  "Fantasy",
  "Sci-fi",
  "Horror",
  "Edukacja",
  "Proza",
  "Kryminał"
] as const;

function normalizeGenreText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyToken(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

export function normalizeGenreLabel(value?: string) {
  const normalized = normalizeGenreText(value);

  if (!normalized) {
    return undefined;
  }

  if (
    hasAnyToken(normalized, [
      "science fiction",
      "sci fi",
      "scifi",
      "sf",
      "space opera",
      "cyberpunk",
      "dystopia",
      "postap",
      "post-ap"
    ])
  ) {
    return "Sci-fi";
  }

  if (
    hasAnyToken(normalized, [
      "fantasy",
      "fantastyka",
      "urban fantasy",
      "high fantasy",
      "epic fantasy",
      "dark fantasy"
    ])
  ) {
    return "Fantasy";
  }

  if (
    hasAnyToken(normalized, ["horror", "groza", "terror", "weird fiction"])
  ) {
    return "Horror";
  }

  if (
    hasAnyToken(normalized, [
      "kryminal",
      "crime",
      "mystery",
      "detective",
      "thriller",
      "suspense",
      "noir",
      "sensacja"
    ])
  ) {
    return "Kryminał";
  }

  if (
    hasAnyToken(normalized, [
      "education",
      "edukacja",
      "textbook",
      "podrecznik",
      "school",
      "study",
      "academic",
      "programming",
      "informatyka",
      "technologia",
      "technology",
      "business",
      "economics",
      "ekonomia",
      "psychology",
      "psychologia",
      "philosophy",
      "filozofia",
      "history",
      "historia",
      "biography",
      "biografia",
      "autobiography",
      "religia",
      "religion",
      "self help",
      "rozwoj osobisty"
    ])
  ) {
    return "Edukacja";
  }

  return "Proza";
}
