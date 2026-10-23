import { useCallback, useEffect, useState } from 'react';
import MedicineSearch from './components/MedicineSearch.jsx';
import MedicineInfo from './components/MedicineInfo.jsx';
import PharmacyList from './components/PharmacyList.jsx';
import PharmacyMap, { hasMapbox } from './components/PharmacyMap.jsx';
import {
  searchMedicines,
  getLocalAlternatives,
  getFdaInfo,
  getNearbyPharmacies,
  getOsmPharmacies,
} from './api.js';

// Fallback if the browser denies geolocation (New Delhi)
const DEFAULT_POSITION = { lat: 28.6139, lng: 77.209 };

export default function App() {
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [locationNote, setLocationNote] = useState('');
  const [radius, setRadius] = useState(5);

  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [localAlternatives, setLocalAlternatives] = useState([]);
  const [searching, setSearching] = useState(false);

  const [fda, setFda] = useState(null);
  const [fdaLoading, setFdaLoading] = useState(false);
  const [fdaError, setFdaError] = useState('');

  const [pharmacies, setPharmacies] = useState([]);
  const [osmPharmacies, setOsmPharmacies] = useState([]);
  const [showOsm, setShowOsm] = useState(false);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);

  const [provider, setProvider] = useState('osm');
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState('');

  // ---- HTML5 Geolocation ----
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationNote('Geolocation not supported — showing default area.');
      return;
    }
    setLocationNote('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationNote('Using your current location.');
        setFocus(null);
      },
      () => setLocationNote('Location denied — showing default area. Allow location access to see pharmacies near you.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  // ---- Nearby pharmacies from our DB (re-run on location / radius / medicine change) ----
  useEffect(() => {
    let cancelled = false;
    setLoadingPharmacies(true);
    getNearbyPharmacies({ lat: position.lat, lng: position.lng, radius, medicine: selected?._id })
      .then((data) => !cancelled && (setPharmacies(data), setError('')))
      .catch((e) => !cancelled && (setPharmacies([]), setError(e.message)))
      .finally(() => !cancelled && setLoadingPharmacies(false));
    return () => {
      cancelled = true;
    };
  }, [position, radius, selected]);

  // ---- Real-world pharmacies from OpenStreetMap (optional toggle) ----
  useEffect(() => {
    if (!showOsm) {
      setOsmPharmacies([]);
      return undefined;
    }
    let cancelled = false;
    getOsmPharmacies({ lat: position.lat, lng: position.lng, radius })
      .then((data) => !cancelled && setOsmPharmacies(data))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [showOsm, position, radius]);

  const loadFda = useCallback(async (name) => {
    setFdaLoading(true);
    setFdaError('');
    setFda(null);
    try {
      setFda(await getFdaInfo(name));
    } catch (e) {
      setFdaError(e.message);
    } finally {
      setFdaLoading(false);
    }
  }, []);

  const selectMedicine = useCallback(
    (medicine) => {
      setSelected(medicine);
      setFocus(null);
      loadFda(medicine.genericName || medicine.name);
      getLocalAlternatives(medicine._id)
        .then(setLocalAlternatives)
        .catch(() => setLocalAlternatives([]));
    },
    [loadFda]
  );

  useEffect(() => {
    searchMedicines('')
      .then((data) => {
        if (data && data.length) {
          setMatches(data);
          selectMedicine(data[0]);
        }
      })
      .catch(() => {});
  }, [selectMedicine]);

  const handleSearch = async (query) => {
    setSearching(true);
    setError('');
    try {
      const results = await searchMedicines(query);
      setMatches(results);
      if (results.length) {
        selectMedicine(results[0]);
      } else {
        // Not in our DB — still try OpenFDA for general info
        setSelected(null);
        setLocalAlternatives([]);
        loadFda(query);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>💊 MediMap</h1>
          <p className="muted">Smart Pharmacy & Availability Tracker</p>
        </div>
        <div className="controls">
          <button type="button" className="ghost" onClick={locate}>
            📍 Use my location
          </button>
          <label>
            Radius
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[1, 2, 5, 10, 20].map((r) => (
                <option key={r} value={r}>
                  {r} km
                </option>
              ))}
            </select>
          </label>
          <label>
            Map
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="osm">OpenStreetMap</option>
              {hasMapbox && <option value="mapbox">Mapbox</option>}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={showOsm} onChange={(e) => setShowOsm(e.target.checked)} />
            Show OSM pharmacies
          </label>
        </div>
      </header>

      {locationNote && <div className="note">{locationNote}</div>}
      {error && <div className="note error">{error}</div>}

      <main className="layout">
        <div className="panel">
          <MedicineSearch
            onSearch={handleSearch}
            results={matches}
            selectedId={selected?._id}
            onSelect={selectMedicine}
            loading={searching}
          />
          <MedicineInfo
            medicine={selected}
            fda={fda}
            fdaLoading={fdaLoading}
            fdaError={fdaError}
            localAlternatives={localAlternatives}
            onPickAlternative={selectMedicine}
          />
          <PharmacyList
            pharmacies={pharmacies}
            osmPharmacies={osmPharmacies}
            position={position}
            medicine={selected}
            loading={loadingPharmacies}
            onFocus={setFocus}
          />
        </div>
        <div className="map-wrap">
          <PharmacyMap
            position={position}
            radiusKm={radius}
            pharmacies={pharmacies}
            osmPharmacies={osmPharmacies}
            provider={provider}
            focus={focus}
          />
        </div>
      </main>
    </div>
  );
}
