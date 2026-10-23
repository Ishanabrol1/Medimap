const Field = ({ label, value }) =>
  value ? (
    <div className="field">
      <h4>{label}</h4>
      <p>{value}</p>
    </div>
  ) : null;

export default function MedicineInfo({ medicine, fda, fdaLoading, fdaError, localAlternatives, onPickAlternative }) {
  if (!medicine && !fda && !fdaLoading && !fdaError) return null;

  const info = fda?.info;
  const alternatives = fda?.alternatives || [];

  return (
    <section className="card">
      <h2>{medicine ? medicine.name : info?.brandName || 'Medicine info'}</h2>

      {medicine && (
        <p className="muted">
          {[medicine.genericName && `Generic: ${medicine.genericName}`, medicine.category, medicine.dosageForm]
            .filter(Boolean)
            .join(' · ')}
          {medicine.prescriptionRequired && <span className="badge rx">Rx</span>}
        </p>
      )}
      {medicine?.description && <p>{medicine.description}</p>}

      {localAlternatives.length > 0 && (
        <div className="field">
          <h4>Generic alternatives in our database</h4>
          <ul className="chips">
            {localAlternatives.map((a) => (
              <li key={a._id}>
                <button type="button" className="chip" onClick={() => onPickAlternative(a)}>
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <hr />
      <h3>OpenFDA label</h3>
      {fdaLoading && <p className="muted">Loading from OpenFDA…</p>}
      {fdaError && <p className="muted">{fdaError}</p>}

      {info && (
        <>
          <p className="muted">
            {[info.brandName, info.genericName && `(${info.genericName})`, info.manufacturer]
              .filter(Boolean)
              .join(' ')}
          </p>
          <Field label="Purpose" value={info.purpose} />
          <Field label="Indications & usage" value={info.indications} />
          <Field label="Dosage" value={info.dosage} />
          <Field label="Warnings" value={info.warnings} />
          <Field label="Adverse reactions" value={info.adverseReactions} />

          {alternatives.length > 0 && (
            <div className="field">
              <h4>Other brands with the same active ingredient</h4>
              <ul className="chips">
                {alternatives.map((a) => (
                  <li key={a.brandName} className="chip static" title={a.manufacturer}>
                    {a.brandName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="disclaimer">
        Informational only — not medical advice. Always consult a doctor or pharmacist.
      </p>
    </section>
  );
}
