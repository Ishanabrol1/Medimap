import { haversineKm } from '../utils/geo.js';

export const initialMedicines = [
  { _id: 'med-01', name: 'Paracetamol 500mg', genericName: 'acetaminophen', brandNames: ['Tylenol', 'Crocin', 'Dolo', 'Calpol'], category: 'Analgesic / Antipyretic', dosageForm: 'Tablet', strength: '500 mg', description: 'Pain relief and fever reduction.' },
  { _id: 'med-02', name: 'Ibuprofen 400mg', genericName: 'ibuprofen', brandNames: ['Advil', 'Motrin', 'Brufen', 'Combiflam'], category: 'NSAID', dosageForm: 'Tablet', strength: '400 mg', description: 'Anti-inflammatory for pain, fever and swelling.' },
  { _id: 'med-03', name: 'Amoxicillin 500mg', genericName: 'amoxicillin', brandNames: ['Amoxil', 'Novamox', 'Moxikind'], category: 'Antibiotic', dosageForm: 'Capsule', strength: '500 mg', description: 'Penicillin-type antibiotic.', prescriptionRequired: true },
  { _id: 'med-04', name: 'Cetirizine 10mg', genericName: 'cetirizine', brandNames: ['Zyrtec', 'Cetzine', 'Alerid'], category: 'Antihistamine', dosageForm: 'Tablet', strength: '10 mg', description: 'Relief from allergy symptoms.' },
  { _id: 'med-05', name: 'Omeprazole 20mg', genericName: 'omeprazole', brandNames: ['Prilosec', 'Omez', 'Omee'], category: 'Proton pump inhibitor', dosageForm: 'Capsule', strength: '20 mg', description: 'Reduces stomach acid; used for acidity and GERD.' },
  { _id: 'med-06', name: 'Metformin 500mg', genericName: 'metformin', brandNames: ['Glucophage', 'Glycomet', 'Obimet'], category: 'Antidiabetic', dosageForm: 'Tablet', strength: '500 mg', description: 'First-line medicine for type 2 diabetes.', prescriptionRequired: true },
  { _id: 'med-07', name: 'Atorvastatin 10mg', genericName: 'atorvastatin', brandNames: ['Lipitor', 'Atorva', 'Storvas'], category: 'Statin', dosageForm: 'Tablet', strength: '10 mg', description: 'Lowers cholesterol.', prescriptionRequired: true },
  { _id: 'med-08', name: 'Azithromycin 500mg', genericName: 'azithromycin', brandNames: ['Zithromax', 'Azithral', 'Azee'], category: 'Antibiotic', dosageForm: 'Tablet', strength: '500 mg', description: 'Macrolide antibiotic.', prescriptionRequired: true },
  { _id: 'med-09', name: 'Loratadine 10mg', genericName: 'loratadine', brandNames: ['Claritin', 'Lorfast', 'Alaspan'], category: 'Antihistamine', dosageForm: 'Tablet', strength: '10 mg', description: 'Non-drowsy allergy relief.' },
  { _id: 'med-10', name: 'Aspirin 75mg', genericName: 'aspirin', brandNames: ['Bayer Aspirin', 'Ecosprin', 'Disprin'], category: 'Antiplatelet / NSAID', dosageForm: 'Tablet', strength: '75 mg', description: 'Pain relief; low dose used for blood-clot prevention.' },
];

const pharmacyTemplates = [
  ['HealthPlus Pharmacy', 'Main Market Road', '+91 90000 00001', '8:00 AM - 10:00 PM', 0.004, 0.003],
  ['CityCare Chemist', 'Station Road', '+91 90000 00002', '24 hours', -0.006, 0.005],
  ['Wellness Medico', 'Civil Lines', '+91 90000 00003', '9:00 AM - 9:00 PM', 0.009, -0.004],
  ['LifeLine Drug Store', 'Hospital Chowk', '+91 90000 00004', '24 hours', -0.012, -0.008],
  ['Apna Medical Hall', 'Old Bazaar', '+91 90000 00005', '8:30 AM - 9:30 PM', 0.015, 0.011],
  ['Sanjeevani Pharmacy', 'Park Avenue', '+91 90000 00006', '9:00 AM - 8:00 PM', -0.02, 0.014],
];

export class InMemoryStore {
  constructor() {
    this.medicines = [...initialMedicines];
    this.pharmacies = [];
    this.seededCoords = null;
  }

  ensurePharmacies(lat, lng) {
    if (this.pharmacies.length > 0 && this.seededCoords) {
      const dist = haversineKm(lat, lng, this.seededCoords.lat, this.seededCoords.lng);
      if (dist < 40) return; // Already seeded near this area
    }

    this.seededCoords = { lat, lng };
    this.pharmacies = pharmacyTemplates.map(([name, address, phone, openingHours, dLat, dLng], idx) => {
      const pLat = lat + dLat;
      const pLng = lng + dLng;
      return {
        _id: `pharm-${idx + 1}`,
        name,
        address,
        phone,
        openingHours,
        lat: pLat,
        lng: pLng,
        location: { type: 'Point', coordinates: [pLng, pLat] },
        inventory: this.medicines.map((med, mIdx) => ({
          medicine: { _id: med._id, name: med.name, genericName: med.genericName, strength: med.strength },
          quantity: (mIdx + idx) % 5 === 0 ? 0 : 15 + ((mIdx * 17 + idx * 7) % 85),
          price: 25 + ((mIdx * 31 + idx * 13) % 250),
        })),
      };
    });
  }

  searchMedicines(query, limit = 20) {
    if (!query || !query.trim()) return this.medicines.slice(0, limit);
    const q = query.toLowerCase().trim();
    return this.medicines
      .filter((m) =>
        m.name.toLowerCase().includes(q) ||
        (m.genericName && m.genericName.toLowerCase().includes(q)) ||
        (m.brandNames && m.brandNames.some((b) => b.toLowerCase().includes(q)))
      )
      .slice(0, limit);
  }

  getMedicineById(id) {
    return this.medicines.find((m) => String(m._id) === String(id));
  }

  getAlternatives(id) {
    const med = this.getMedicineById(id);
    if (!med || !med.genericName) return [];
    return this.medicines.filter((m) => m.genericName === med.genericName && String(m._id) !== String(id));
  }

  getNearbyPharmacies(lat, lng, radiusKm = 5, medicineId = null) {
    this.ensurePharmacies(lat, lng);

    return this.pharmacies
      .map((p) => {
        const distanceKm = Number(haversineKm(lat, lng, p.lat, p.lng).toFixed(2));
        const stockItem = medicineId
          ? p.inventory.find((i) => String(i.medicine?._id) === String(medicineId))
          : undefined;

        return {
          _id: p._id,
          name: p.name,
          address: p.address,
          phone: p.phone,
          openingHours: p.openingHours,
          lat: p.lat,
          lng: p.lng,
          distanceKm,
          stock: stockItem ? { quantity: stockItem.quantity, price: stockItem.price } : null,
          inventoryCount: p.inventory.length,
          _rawInventory: p.inventory,
        };
      })
      .filter((p) => {
        if (p.distanceKm > radiusKm) return false;
        if (medicineId) {
          const item = p._rawInventory.find((i) => String(i.medicine?._id) === String(medicineId));
          return item && item.quantity > 0;
        }
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export const inMemoryStore = new InMemoryStore();
