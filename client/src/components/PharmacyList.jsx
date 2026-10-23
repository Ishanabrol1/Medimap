const directionsUrl = (from, to) =>
  `https://www.openstreetmap.org/directions?route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`;

export default function PharmacyList({ pharmacies, osmPharmacies, position, medicine, loading, onFocus }) {
  return (
    <section className="card">
      <h2>
        Nearby pharmacies{' '}
        <span className="muted small">
          {medicine ? `with ${medicine.name} in stock` : 'all'}
        </span>
      </h2>

      {loading && <p className="muted">Looking for pharmacies…</p>}
      {!loading && pharmacies.length === 0 && (
        <p className="muted">
          {medicine
            ? 'No pharmacy in range has this medicine in stock. Try a bigger radius.'
            : 'No pharmacies found in this radius. Try a bigger radius or run the seed script.'}
        </p>
      )}

      <ul className="pharmacy-list">
        {pharmacies.map((p) => (
          <li key={p._id} onClick={() => onFocus(p)}>
            <div className="row">
              <strong>{p.name}</strong>
              <span className="muted small">{p.distanceKm} km</span>
            </div>
            {p.address && <div className="muted small">{p.address}</div>}
            {p.openingHours && <div className="muted small">🕒 {p.openingHours}</div>}
            <div className="row">
              {p.stock ? (
                <span className="badge ok">
                  In stock: {p.stock.quantity}
                  {p.stock.price != null && ` · ₹${p.stock.price}`}
                </span>
              ) : (
                <span className="badge">{p.inventoryCount} medicines listed</span>
              )}
              <span className="links">
                {p.phone && <a href={`tel:${p.phone.replace(/\s/g, '')}`}>Call</a>}
                <a href={directionsUrl(position, p)} target="_blank" rel="noreferrer">
                  Directions
                </a>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {osmPharmacies.length > 0 && (
        <>
          <h3>From OpenStreetMap ({osmPharmacies.length})</h3>
          <ul className="pharmacy-list osm">
            {osmPharmacies.slice(0, 15).map((p) => (
              <li key={p.id} onClick={() => onFocus(p)}>
                <div className="row">
                  <strong>{p.name}</strong>
                  <span className="muted small">{p.distanceKm} km</span>
                </div>
                {p.address && <div className="muted small">{p.address}</div>}
                <div className="row">
                  <span className="badge">Availability unknown</span>
                  <span className="links">
                    <a href={directionsUrl(position, p)} target="_blank" rel="noreferrer">
                      Directions
                    </a>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
