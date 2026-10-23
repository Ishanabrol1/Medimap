import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Vite doesn't resolve Leaflet's default marker image paths, so set them explicitly.
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export const hasMapbox = Boolean(MAPBOX_TOKEN);

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom());
  }, [center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Tiles({ provider }) {
  if (provider === 'mapbox' && MAPBOX_TOKEN) {
    return (
      <TileLayer
        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`}
        tileSize={512}
        zoomOffset={-1}
        attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap contributors'
      />
    );
  }
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
  );
}

export default function PharmacyMap({ position, radiusKm, pharmacies, osmPharmacies, provider, focus }) {
  const center = focus ? [focus.lat, focus.lng] : [position.lat, position.lng];

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom className="map">
      <Tiles provider={provider} />
      <Recenter center={center} zoom={focus ? 16 : undefined} />

      <Circle
        center={[position.lat, position.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#0ea5a4', weight: 1, fillOpacity: 0.05 }}
      />
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={8}
        pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
      >
        <Popup>You are here</Popup>
      </CircleMarker>

      {pharmacies.map((p) => (
        <Marker key={p._id} position={[p.lat, p.lng]} icon={DefaultIcon}>
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.address}
            <br />
            {p.distanceKm} km away
            {p.stock && (
              <>
                <br />
                In stock: {p.stock.quantity}
                {p.stock.price != null && ` · ₹${p.stock.price}`}
              </>
            )}
          </Popup>
        </Marker>
      ))}

      {osmPharmacies.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <br />
            {p.address}
            <br />
            {p.distanceKm} km away · OpenStreetMap
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
