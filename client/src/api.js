const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, params) {
  const qs = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    : '';
  const res = await fetch(`${BASE}${path}${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export const searchMedicines = (search) => request('/medicines', { search });
export const getLocalAlternatives = (id) => request(`/medicines/${id}/alternatives`);
export const getFdaInfo = (name) => request(`/openfda/${encodeURIComponent(name)}`);
export const getNearbyPharmacies = (params) => request('/pharmacies/nearby', params);
export const getOsmPharmacies = (params) => request('/pharmacies/osm', params);
