import { INDIAN_STATES } from "./indian-states";

// City and state from an Indian PIN code, to fill in the checkout address.
// Uses India Post's data through the free api.postalpincode.in service (no
// key). It is best effort: when the lookup fails the customer simply types
// the city and state themselves.

export type PincodeInfo = { city: string; state: string };

type PostOffice = { District?: string; State?: string; Block?: string };
type ApiResponse = { Status?: string; PostOffice?: PostOffice[] | null }[];

// India Post spellings that differ from our state list.
const STATE_ALIASES: Record<string, string> = {
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "jammu & kashmir": "Jammu and Kashmir",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "the dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "pondicherry": "Puducherry",
  "orissa": "Odisha",
  "uttaranchal": "Uttarakhand",
  "chattisgarh": "Chhattisgarh",
  "new delhi": "Delhi",
};

/** Our state name for an India Post state name, or null if it isn't one. */
export function normaliseState(name: string) {
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (STATE_ALIASES[key]) return STATE_ALIASES[key];
  const plain = key.replace(/&/g, "and");
  return INDIAN_STATES.find((state) => state.toLowerCase() === plain) ?? null;
}

/** Picks a city and state from the API's post offices for one PIN code. */
export function parsePincodeResponse(data: unknown): PincodeInfo | null {
  const result = (data as ApiResponse)?.[0];
  if (result?.Status !== "Success" || !Array.isArray(result.PostOffice)) return null;

  for (const office of result.PostOffice) {
    const state = office.State ? normaliseState(office.State) : null;
    const city = (office.District || office.Block || "").trim();
    if (state && city) return { city, state };
  }
  return null;
}

// PIN data barely changes; remember answers for the life of the server instance.
const cache = new Map<string, PincodeInfo | null>();
const MAX_CACHE = 5000;

/**
 * City and state for `pin`, null when India Post has no such PIN code, or
 * "unavailable" when the lookup service couldn't be reached.
 */
export async function lookupPincode(pin: string): Promise<PincodeInfo | null | "unavailable"> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  if (cache.has(pin)) return cache.get(pin)!;

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return "unavailable";
    const info = parsePincodeResponse(await response.json());
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(pin, info);
    return info;
  } catch {
    // Network error or timeout: don't cache, the next try may work.
    return "unavailable";
  }
}
