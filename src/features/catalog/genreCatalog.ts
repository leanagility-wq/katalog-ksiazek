export const CORE_GENRES = [
  "Fantasy",
  "Sci-fi",
  "Horror",
  "Edukacja",
  "Proza",
  "Kryminał"
] as const;

const GENRE_ALIASES: Record<string, string[]> = {
  Fantasy: [
    "fantasy",
    "fantastyka",
    "high fantasy",
    "epic fantasy",
    "urban fantasy",
    "dark fantasy",
    "myth",
    "mythology",
    "legend",
    "fairy tale",
    "fairytale",
    "magic",
    "magia",
    "wizard",
    "smok",
    "dragon",
    "romantasy"
  ],
  "Sci-fi": [
    "science fiction",
    "sci fi",
    "sci-fi",
    "scifi",
    "sf",
    "speculative fiction",
    "space opera",
    "cyberpunk",
    "dystopia",
    "dystopian",
    "post ap",
    "postap",
    "post apo",
    "post apocalyptic",
    "postapocalyptic",
    "alternate history",
    "time travel",
    "alien",
    "robot",
    "space",
    "kosmos"
  ],
  Horror: [
    "horror",
    "groza",
    "terror",
    "weird fiction",
    "ghost",
    "haunted",
    "supernatural",
    "occult",
    "paranormal",
    "zombie",
    "monster",
    "gothic horror"
  ],
  Edukacja: [
    "education",
    "edukacja",
    "textbook",
    "podrecznik",
    "podręcznik",
    "school",
    "study",
    "academic",
    "course",
    "manual",
    "guide",
    "reference",
    "self help",
    "self-help",
    "poradnik",
    "business",
    "economics",
    "ekonomia",
    "finance",
    "psychology",
    "psychologia",
    "philosophy",
    "filozofia",
    "history",
    "historia",
    "biography",
    "biografia",
    "autobiography",
    "memoir",
    "memoirs",
    "religion",
    "religia",
    "computer",
    "computers",
    "programming",
    "software",
    "technology",
    "technologia",
    "mathematics",
    "math",
    "science",
    "engineering",
    "medicine",
    "medical",
    "prawo",
    "law",
    "language",
    "linguistics",
    "język",
    "jezyk"
  ],
  Proza: [
    "fiction",
    "literature",
    "literary",
    "novel",
    "novels",
    "classic",
    "classics",
    "contemporary",
    "historical fiction",
    "young adult",
    "juvenile fiction",
    "romance",
    "obyczaj",
    "obyczajowa",
    "poetry",
    "poezja",
    "drama",
    "satire",
    "essays",
    "eseje"
  ],
  "Kryminał": [
    "crime",
    "kryminal",
    "kryminał",
    "mystery",
    "detective",
    "thriller",
    "suspense",
    "noir",
    "sensacja",
    "police procedural",
    "spy",
    "espionage",
    "legal thriller",
    "investigation",
    "murder"
  ]
};

function normalizeGenreText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDisplayGenreLabel(value?: string) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function splitGenreParts(value?: string) {
  return normalizeGenreText(value)
    .split(/[|/,;:&>]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toTokenSet(value?: string) {
  return new Set(
    normalizeGenreText(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );
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

function scoreAliasMatch(source: string, aliases: string[]) {
  let score = 0;

  for (const alias of aliases) {
    if (source === alias) {
      return 1.2;
    }

    if (source.includes(alias) || alias.includes(source)) {
      score = Math.max(score, 0.95);
    }
  }

  return score;
}

function dedupeGenreLabels(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const displayValue = toDisplayGenreLabel(value);
    const normalizedValue = normalizeGenreText(displayValue);

    if (!displayValue || seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    result.push(displayValue);
  }

  return result.sort((left, right) => left.localeCompare(right, "pl"));
}

export function normalizeGenreLabel(
  value?: string,
  availableGenres: string[] = [...CORE_GENRES]
) {
  const displayValue = toDisplayGenreLabel(value);
  const normalizedValue = normalizeGenreText(displayValue);

  if (!normalizedValue) {
    return undefined;
  }

  const candidateGenres = dedupeGenreLabels([...availableGenres, ...CORE_GENRES]);
  const genreParts = [normalizedValue, ...splitGenreParts(displayValue)];

  let bestMatch: { label: string; score: number } | null = null;

  for (const candidate of candidateGenres) {
    const normalizedCandidate = normalizeGenreText(candidate);
    const aliasCandidates = [
      normalizedCandidate,
      ...(GENRE_ALIASES[candidate] ?? []),
      ...(GENRE_ALIASES[
        candidate as keyof typeof GENRE_ALIASES
      ] ?? [])
    ].map(normalizeGenreText);

    let candidateScore = 0;

    for (const part of genreParts) {
      if (!part) {
        continue;
      }

      if (part === normalizedCandidate) {
        candidateScore = Math.max(candidateScore, 2);
      } else if (
        normalizedCandidate.includes(part) ||
        part.includes(normalizedCandidate)
      ) {
        candidateScore = Math.max(candidateScore, 1.4);
      } else {
        candidateScore = Math.max(
          candidateScore,
          scoreTokenOverlap(part, normalizedCandidate)
        );
      }

      candidateScore = Math.max(
        candidateScore,
        scoreAliasMatch(part, aliasCandidates)
      );
    }

    if (!bestMatch || candidateScore > bestMatch.score) {
      bestMatch = { label: candidate, score: candidateScore };
    }
  }

  if (bestMatch && bestMatch.score >= 0.72) {
    return bestMatch.label;
  }

  for (const [coreGenre, aliases] of Object.entries(GENRE_ALIASES)) {
    const aliasScore = Math.max(
      ...genreParts.map((part) => scoreAliasMatch(part, aliases.map(normalizeGenreText)))
    );

    if (aliasScore >= 0.9) {
      return coreGenre;
    }
  }

  return displayValue;
}

export function normalizeGenreValues(
  values: string[],
  options?: { includeCoreGenres?: boolean }
) {
  const includeCoreGenres = options?.includeCoreGenres ?? true;
  const baseGenres = includeCoreGenres ? [...CORE_GENRES, ...values] : [...values];
  const availableGenres = dedupeGenreLabels(baseGenres);

  return dedupeGenreLabels(
    baseGenres
      .map((value) => normalizeGenreLabel(value, availableGenres))
      .filter((value): value is string => Boolean(value))
  );
}

export function mergeGenreCollections(...collections: string[][]) {
  return normalizeGenreValues(collections.flat());
}
