// OpenFDA drug label lookup + generic-alternative recommendations.
// Docs: https://open.fda.gov/apis/drug/label/
const BASE = 'https://api.fda.gov/drug/label.json';
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

const first = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : undefined);
const clip = (text, max = 900) => {
  if (!text) return undefined;
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

const buildUrl = (searchExpr, limit) => {
  const key = process.env.OPENFDA_API_KEY;
  return `${BASE}?search=${searchExpr}&limit=${limit}${key ? `&api_key=${key}` : ''}`;
};

const quoted = (field, value) => `${field}:%22${encodeURIComponent(value)}%22`;

// OpenFDA answers 404 when nothing matches; treat that as an empty result.
const fetchLabels = async (searchExpr, limit) => {
  const url = buildUrl(searchExpr, limit);
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return [];
    if (!res.ok) {
      console.warn(`OpenFDA response status: ${res.status}`);
      return [];
    }
    const json = await res.json();
    const data = json.results || [];
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.warn(`OpenFDA request failed (${err.message}). Continuing gracefully.`);
    return [];
  }
};

export const getMedicineInfo = async (name) => {
  const term = name.trim();
  const labels = await fetchLabels(
    `${quoted('openfda.brand_name', term)}+${quoted('openfda.generic_name', term)}`,
    1
  );
  const label = labels[0];
  if (!label) return null;

  const openfda = label.openfda || {};
  const genericName = first(openfda.generic_name);

  return {
    brandName: first(openfda.brand_name),
    genericName,
    manufacturer: first(openfda.manufacturer_name),
    route: openfda.route || [],
    substances: openfda.substance_name || [],
    purpose: clip(first(label.purpose), 300),
    indications: clip(first(label.indications_and_usage)),
    dosage: clip(first(label.dosage_and_administration)),
    warnings: clip(first(label.warnings) || first(label.warnings_and_cautions)),
    adverseReactions: clip(first(label.adverse_reactions)),
  };
};

// Other brand names that share the same generic (active) ingredient
export const getGenericAlternatives = async (genericName, excludeName = '') => {
  if (!genericName) return [];
  const labels = await fetchLabels(quoted('openfda.generic_name', genericName), 50);
  const seen = new Set([excludeName.toLowerCase()]);
  const alternatives = [];

  for (const label of labels) {
    const brand = first(label.openfda?.brand_name);
    if (!brand || seen.has(brand.toLowerCase())) continue;
    seen.add(brand.toLowerCase());
    alternatives.push({
      brandName: brand,
      manufacturer: first(label.openfda?.manufacturer_name),
    });
    if (alternatives.length >= 10) break;
  }
  return alternatives;
};
