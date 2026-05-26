import maxmind, { type CityResponse, type Reader } from "maxmind";

let reader: Reader<CityResponse> | null = null;
let tried = false;

// lazy-loaded so the worker still boots if the mmdb file isn't mounted.
// the lookup itself is in-memory once the file is loaded — cheap to call per click.
export async function geoLookup(ip: string | null) {
  if (!ip) return { country: null, city: null };

  if (!tried) {
    tried = true;
    const path = process.env.GEOIP_DB_PATH;
    if (path) {
      try { reader = await maxmind.open<CityResponse>(path); }
      catch (e) { console.warn("[geoip] mmdb not loaded:", (e as Error).message); }
    }
  }
  if (!reader) return { country: null, city: null };

  try {
    const r = reader.get(ip);
    return {
      country: r?.country?.iso_code ?? null,
      city: r?.city?.names?.en ?? null,
    };
  } catch {
    return { country: null, city: null };
  }
}
