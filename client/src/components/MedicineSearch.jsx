import { useState } from 'react';

export default function MedicineSearch({ onSearch, results, selectedId, onSelect, loading }) {
  const [query, setQuery] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <section className="card">
      <form onSubmit={submit} className="search-form">
        <input
          type="text"
          placeholder="Search medicine (e.g. ibuprofen, Dolo, cetirizine)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Medicine name"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="chips">
          {results.map((m) => (
            <li key={m._id}>
              <button
                type="button"
                className={`chip ${m._id === selectedId ? 'active' : ''}`}
                onClick={() => onSelect(m)}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
