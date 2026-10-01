import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

// Product search: tolerant of typos, plurals, word order, product codes,
// synonyms (cup/mug/pyala, katori/bowl…), Hindi-script words and simple price
// phrases ("plates under 500"). It runs over an in-memory index of the visible
// catalogue, so a search never needs a database round trip.

export type SearchEntry = {
  id: string;
  slug: string;
  name: string;
  code: string;
  category: string;
  description: string;
  price: number;
  mrp: number | null;
  stock: number;
  isFeatured: boolean;
  reviewCount: number;
  rating: number | null;
  createdAt: number;
  image: string;
};

export type SearchFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
};

export type SearchResult = {
  ids: string[];
  /** Entries in ranked order (same order as ids). */
  entries: SearchEntry[];
  total: number;
  /** Not every word matched; these are the closest products. */
  partial: boolean;
  /** The query with obvious typos fixed, when a fix was needed. */
  corrected: string | null;
  /** Price limits taken from the wording of the query ("under 500"). */
  priceHint: { min?: number; max?: number } | null;
  /** Preferred ordering implied by the query ("cheap", "premium", "best"). */
  sortHint: "price-asc" | "price-desc" | "popular" | null;
};

// ---------------------------------------------------------------- text helpers

export function normalize(input: string) {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Very small English stemmer: plates → plate, glasses → glass, cities → city. */
export function stem(word: string) {
  if (word.length <= 3 || /[^a-z]/.test(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (/(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Edit distance counting a swap of two neighbouring letters as one edit; gives up above `max`. */
export function editDistance(a: string, b: string, max: number) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prev2[j - 2] ?? 99) + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2.length = 0;
    prev2.push(...prev);
    prev = cur;
  }
  return prev[b.length];
}

// ---------------------------------------------------------------- vocabulary

// Words that mean (almost) the same thing for a shopper, including common
// Hindi/Hinglish. Matching a synonym counts a little less than the exact word.
const SYNONYM_GROUPS: string[][] = [
  ["cup", "mug", "pyala", "pyali", "kulhad", "kulhar", "kullad", "glass", "tumbler"],
  ["bowl", "katori", "katora", "kati", "bawl"],
  ["plate", "thali", "dish", "platter", "plater"],
  ["tea", "chai", "chaai"],
  ["teapot", "kettle", "kettel", "chaidani"],
  ["vase", "phooldan", "guldasta", "flowervase"],
  ["planter", "pot", "gamla", "gamle", "plantpot"],
  ["jar", "canister", "container", "barni", "storage", "dabba"],
  ["serve", "serving", "server"],
  ["set", "pair", "collection", "combo", "kit"],
  ["blue", "neel", "nila", "indigo", "cobalt"],
  ["white", "safed", "safaid", "ivory", "cream"],
  ["green", "hara", "olive", "mint"],
  ["pink", "gulabi", "rose", "blush"],
  ["red", "lal"],
  ["black", "kala", "kali", "midnight"],
  ["yellow", "peela", "mustard"],
  ["small", "mini", "tiny", "chhota", "chota", "little"],
  ["large", "big", "jumbo", "bada", "xl"],
  ["decor", "decoration", "decorative", "decorate", "showpiece"],
  ["hotel", "restaurant", "hospitality", "cafe", "horeca"],
  ["dinner", "dinnerware", "dining"],
  ["butter", "makhan"],
  ["oil", "tel"],
  ["khurja", "khurjapottery"],
];

const HINDI_WORDS: Record<string, string> = {
  "प्लेट": "plate", "थाली": "thali", "कप": "cup", "प्याला": "pyala", "कुल्हड़": "kulhad", "मग": "mug", "ग्लास": "glass",
  "कटोरी": "katori", "कटोरा": "katora", "बाउल": "bowl", "गमला": "gamla", "फूलदान": "vase", "गुलदस्ता": "guldasta",
  "चाय": "chai", "केतली": "kettle", "जार": "jar", "डिनर": "dinner", "सेट": "set", "नीला": "neel", "सफेद": "safed", "सफ़ेद": "safed",
  "खुर्जा": "khurja", "सिरेमिक": "ceramic", "बर्तन": "crockery", "लाल": "lal", "हरा": "hara", "काला": "kala", "गुलाबी": "gulabi",
};

// "Show me everything" words: they never have to match a product.
const GENERIC = new Set([
  "crockery", "tableware", "kitchenware", "ceramic", "ceramics", "pottery", "product", "item", "utensil", "bartan", "bartan", "homeware",
  "home", "online", "shop", "buy", "purchase", "gift", "present", "gifting", "new", "latest",
]);
const STOPWORDS = new Set(["a", "an", "the", "for", "of", "in", "on", "with", "and", "to", "my", "me", "i", "want", "need", "get", "show", "find", "looking", "please", "pcs", "pc", "piece", "or", "any", "some", "good", "nice"]);
const SORT_WORDS: Record<string, SearchResult["sortHint"]> = {
  cheap: "price-asc", cheapest: "price-asc", budget: "price-asc", affordable: "price-asc", sasta: "price-asc", lowest: "price-asc",
  premium: "price-desc", luxury: "price-desc", expensive: "price-desc",
  best: "popular", popular: "popular", bestseller: "popular", trending: "popular", top: "popular",
};

const synonymsOf = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const stems = group.map((w) => stem(w));
  for (const s of stems) {
    const set = synonymsOf.get(s) ?? new Set<string>();
    for (const o of stems) if (o !== s) set.add(o);
    synonymsOf.set(s, set);
  }
}

// ---------------------------------------------------------------- prepared index

type Prepared = {
  entry: SearchEntry;
  nameStems: string[];
  nameFull: string;
  joined: string[];
  codeTokens: string[];
  codeCompact: string;
  catStems: string[];
  descStems: Set<string>;
};

export type SearchIndex = { items: Prepared[]; vocab: Set<string> };

const words = (text: string) => normalize(text).split(" ").filter(Boolean);

export function buildIndex(entries: SearchEntry[]): SearchIndex {
  const vocab = new Set<string>();
  const items = entries.map((entry): Prepared => {
    const nameWords = words(entry.name);
    const nameStems = nameWords.map(stem);
    const catStems = words(entry.category).map(stem);
    const joined: string[] = [];
    for (let i = 0; i < nameStems.length - 1; i++) joined.push(nameStems[i] + nameStems[i + 1]);
    for (const w of [...nameStems, ...catStems]) if (w.length >= 3 && /^[a-z]+$/.test(w)) vocab.add(w);
    return {
      entry,
      nameStems,
      nameFull: nameWords.join(" "),
      joined,
      codeTokens: words(entry.code),
      codeCompact: entry.code.toLowerCase().replace(/[^a-z0-9]/g, ""),
      catStems,
      descStems: new Set(words(entry.description).map(stem)),
    };
  });
  return { items, vocab };
}

// ---------------------------------------------------------------- query parsing

type Token = { text: string; optional: boolean; alts: string[] };

function parseQuery(raw: string) {
  let q = normalize(raw.slice(0, 120));
  let priceHint: SearchResult["priceHint"] = null;
  let sortHint: SearchResult["sortHint"] = null;

  const under = q.match(/\b(?:under|below|upto|up to|within|less than|max|maximum|budget|around)\s*(?:rs|inr|rupees)?\s*(\d{2,6})\b/);
  if (under) {
    priceHint = { ...(priceHint ?? {}), max: Number(under[1]) };
    q = q.replace(under[0], " ");
  }
  const over = q.match(/\b(?:above|over|more than|min|minimum|from)\s*(?:rs|inr|rupees)?\s*(\d{2,6})\b/);
  if (over) {
    priceHint = { ...(priceHint ?? {}), min: Number(over[1]) };
    q = q.replace(over[0], " ");
  }

  const tokens: Token[] = [];
  for (const rawWord of q.split(" ").filter(Boolean)) {
    const mapped = HINDI_WORDS[rawWord] ?? rawWord;
    if (STOPWORDS.has(mapped)) continue;
    if (SORT_WORDS[mapped]) {
      sortHint ??= SORT_WORDS[mapped];
      continue;
    }
    if (GENERIC.has(mapped)) continue;
    const s = stem(mapped);
    const optional = /^\d{1,3}$/.test(s);
    const alts = [...(synonymsOf.get(s) ?? [])];
    tokens.push({ text: s, optional, alts });
  }
  return { tokens, priceHint, sortHint, normalized: q.replace(/\s+/g, " ").trim() };
}

// ---------------------------------------------------------------- scoring

/** How well one word (or one of its synonyms) matches a product; 0 = not at all. */
function scoreWord(p: Prepared, word: string): number {
  let best = 0;
  if (p.nameStems.includes(word)) best = 10;
  else if (word.length >= 2 && p.nameStems.some((w) => w.startsWith(word))) best = word.length >= 3 ? 7 : 4;
  else if (p.joined.includes(word)) best = 8;
  else if (word.length >= 3 && p.nameStems.some((w) => w.includes(word))) best = 4;
  if (best < 6 && p.codeTokens.includes(word)) best = Math.max(best, 6);
  if (best < 5 && p.catStems.includes(word)) best = Math.max(best, 5);
  else if (best < 3.5 && word.length >= 3 && p.catStems.some((w) => w.startsWith(word))) best = Math.max(best, 3.5);
  if (best < 1.5 && p.descStems.has(word)) best = 1.5;
  return best;
}

function fuzzyScore(p: Prepared, word: string): number {
  if (word.length < 4 || !/^[a-z]+$/.test(word)) return 0;
  // One slip in short words, two in long ones ("burger" must not become "butter").
  const max = word.length <= 6 ? 1 : 2;
  let best = 0;
  const consider = (w: string, base: number) => {
    if (w.length < 3 || Math.abs(w.length - word.length) > max) return;
    const d = editDistance(word, w, max);
    if (d > max) return;
    // Same first letter, or a single slip in a longer word.
    if (w[0] !== word[0] && !(word.length >= 6 && d === 1)) return;
    best = Math.max(best, base - 1.5 * d);
  };
  for (const w of p.nameStems) consider(w, 6.5);
  for (const w of p.joined) consider(w, 6.5);
  for (const w of p.catStems) consider(w, 4.5);
  return best;
}

function tokenScore(p: Prepared, token: Token): { score: number; exact: boolean; fuzzy: boolean } {
  const direct = scoreWord(p, token.text);
  let best = direct;
  let viaSynonym = false;
  for (const alt of token.alts) {
    const s = scoreWord(p, alt) * 0.85;
    if (s > best) {
      best = s;
      viaSynonym = true;
    }
  }
  let fuzzy = false;
  if (best < 5) {
    const f = fuzzyScore(p, token.text);
    if (f > best) {
      best = f;
      fuzzy = true;
    }
  }
  return { score: best, exact: !viaSynonym && !fuzzy && direct >= 7, fuzzy };
}

function codeMatches(index: SearchIndex, compact: string): Prepared[] {
  if (compact.length < 4 || !/\d|^[a-z]{4,}$/.test(compact)) return [];
  return index.items.filter((p) => p.codeCompact === compact || (compact.length >= 5 && p.codeCompact.startsWith(compact)));
}

function correctWord(index: SearchIndex, word: string): string | null {
  if (word.length < 4 || !/^[a-z]+$/.test(word) || index.vocab.has(word) || synonymsOf.has(word)) return null;
  // One slip in short words, two in long ones ("burger" must not become "butter").
  const max = word.length <= 6 ? 1 : 2;
  let best: string | null = null;
  let bestD = max + 1;
  for (const v of index.vocab) {
    if (Math.abs(v.length - word.length) > max) continue;
    const d = editDistance(word, v, max);
    if (d < bestD && (v[0] === word[0] || (word.length >= 6 && d === 1))) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

export function searchIndex(index: SearchIndex, rawQuery: string, filters: SearchFilters = {}): SearchResult {
  const { tokens, priceHint, sortHint, normalized } = parseQuery(rawQuery);
  const empty: SearchResult = { ids: [], entries: [], total: 0, partial: false, corrected: null, priceHint, sortHint };

  const passes = (e: SearchEntry) => {
    if (filters.category && filters.category !== "All Products" && e.category !== filters.category) return false;
    const min = Math.max(filters.minPrice ?? 0, priceHint?.min ?? 0);
    const max = Math.min(filters.maxPrice ?? Infinity, priceHint?.max ?? Infinity);
    if (e.price < min || e.price > max) return false;
    if (filters.inStock && e.stock <= 0) return false;
    return true;
  };

  const finish = (scored: { p: Prepared; score: number }[], partial: boolean, corrected: string | null): SearchResult => {
    const hint = sortHint;
    scored.sort((a, b) => {
      if (hint === "price-asc") return a.p.entry.price - b.p.entry.price || b.score - a.score;
      if (hint === "price-desc") return b.p.entry.price - a.p.entry.price || b.score - a.score;
      return b.score - a.score || b.p.entry.createdAt - a.p.entry.createdAt || (a.p.entry.id < b.p.entry.id ? -1 : 1);
    });
    const entries = scored.map((s) => s.p.entry);
    return { ids: entries.map((e) => e.id), entries, total: entries.length, partial, corrected, priceHint, sortHint };
  };

  // Product codes ("AC-BL-001", "acbl001").
  const compact = rawQuery.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
  const byCode = codeMatches(index, compact).filter((p) => passes(p.entry));
  if (byCode.length > 0) return finish(byCode.map((p) => ({ p, score: p.codeCompact === compact ? 1000 : 500 })), false, null);

  const candidates = index.items.filter((p) => passes(p.entry));
  const required = tokens.filter((t) => !t.optional);

  // Nothing to match on ("crockery", "gift", "cheap", "plates under 500"): show the best of everything.
  if (required.length === 0) {
    return finish(
      candidates.map((p) => ({
        p,
        score: (p.entry.isFeatured ? 3 : 0) + Math.min(2, p.entry.reviewCount / 5) + (p.entry.stock > 0 ? 1 : -3),
      })),
      false,
      null
    );
  }

  const phrase = tokens.map((t) => t.text).join(" ");
  const scoreAll = (mode: "and" | "or") => {
    const out: { p: Prepared; score: number }[] = [];
    for (const p of candidates) {
      let total = 0;
      let matched = 0;
      let exactAll = true;
      for (const t of tokens) {
        const r = tokenScore(p, t);
        if (r.score > 0) {
          total += r.score;
          if (!t.optional) matched++;
          if (!r.exact) exactAll = false;
        } else if (!t.optional) exactAll = false;
      }
      if (mode === "and" ? matched < required.length : matched === 0) continue;
      let score = total;
      if (phrase.length >= 3 && p.nameFull.includes(phrase)) score += 6;
      if (phrase.length >= 3 && p.nameFull.startsWith(phrase)) score += 3;
      if (exactAll) score += 2;
      if (mode === "or") score *= matched / required.length;
      score += (p.entry.stock > 0 ? 1.5 : -3) + (p.entry.isFeatured ? 0.5 : 0) + Math.min(1, p.entry.reviewCount / 10);
      out.push({ p, score });
    }
    return out;
  };

  let scored = scoreAll("and");
  let partial = false;
  if (scored.length === 0) {
    scored = scoreAll("or");
    partial = scored.length > 0;
  }
  if (scored.length === 0) return empty;

  // Report a fixed-up query when a word only matched through typo tolerance.
  let corrected: string | null = null;
  const fixes = tokens.map((t) => correctWord(index, t.text));
  if (fixes.some(Boolean)) {
    corrected = tokens.map((t, i) => fixes[i] ?? t.text).join(" ");
    if (corrected === normalized) corrected = null;
  }
  return finish(scored, partial, corrected);
}

// ---------------------------------------------------------------- data access

const loadEntries = unstable_cache(
  async (): Promise<SearchEntry[]> => {
    const rows = await prisma.product.findMany({
      where: { isActive: true, category: { isActive: true } },
      select: {
        id: true,
        slug: true,
        name: true,
        code: true,
        description: true,
        price: true,
        mrp: true,
        stock: true,
        isFeatured: true,
        reviewCount: true,
        rating: true,
        createdAt: true,
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      code: row.code,
      category: row.category.name,
      description: (row.description ?? "").slice(0, 500),
      price: Number(row.price),
      mrp: row.mrp ? Number(row.mrp) : null,
      stock: row.stock,
      isFeatured: row.isFeatured,
      reviewCount: row.reviewCount,
      rating: row.rating ? Number(row.rating) : null,
      createdAt: row.createdAt.getTime(),
      image: row.images[0]?.url ?? "/placeholder-product.svg",
    }));
  },
  ["search-entries"],
  { revalidate: 300, tags: ["products"] }
);

// The prepared index is kept in memory for a short while so most searches don't
// even re-read the cache; admin edits still show up within about half a minute.
let memo: { at: number; index: SearchIndex } | null = null;

export async function getSearchIndex(): Promise<SearchIndex> {
  if (memo && Date.now() - memo.at < 30_000) return memo.index;
  const index = buildIndex(await loadEntries());
  memo = { at: Date.now(), index };
  return index;
}

export async function searchProducts(query: string, filters: SearchFilters = {}) {
  return searchIndex(await getSearchIndex(), query, filters);
}
