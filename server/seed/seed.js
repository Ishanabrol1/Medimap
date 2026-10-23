import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';

// genericName values match OpenFDA generic names so label lookups work.
const medicines = [
  { name: 'Paracetamol 500mg', genericName: 'acetaminophen', brandNames: ['Tylenol', 'Crocin', 'Dolo'], category: 'Analgesic / Antipyretic', dosageForm: 'Tablet', strength: '500 mg', description: 'Pain relief and fever reduction.' },
  { name: 'Ibuprofen 400mg', genericName: 'ibuprofen', brandNames: ['Advil', 'Motrin', 'Brufen'], category: 'NSAID', dosageForm: 'Tablet', strength: '400 mg', description: 'Anti-inflammatory for pain, fever and swelling.' },
  { name: 'Amoxicillin 500mg', genericName: 'amoxicillin', brandNames: ['Amoxil', 'Novamox'], category: 'Antibiotic', dosageForm: 'Capsule', strength: '500 mg', description: 'Penicillin-type antibiotic.', prescriptionRequired: true },
  { name: 'Cetirizine 10mg', genericName: 'cetirizine', brandNames: ['Zyrtec', 'Cetzine'], category: 'Antihistamine', dosageForm: 'Tablet', strength: '10 mg', description: 'Relief from allergy symptoms.' },
  { name: 'Omeprazole 20mg', genericName: 'omeprazole', brandNames: ['Prilosec', 'Omez'], category: 'Proton pump inhibitor', dosageForm: 'Capsule', strength: '20 mg', description: 'Reduces stomach acid; used for acidity and GERD.' },
  { name: 'Metformin 500mg', genericName: 'metformin', brandNames: ['Glucophage', 'Glycomet'], category: 'Antidiabetic', dosageForm: 'Tablet', strength: '500 mg', description: 'First-line medicine for type 2 diabetes.', prescriptionRequired: true },
  { name: 'Atorvastatin 10mg', genericName: 'atorvastatin', brandNames: ['Lipitor', 'Atorva'], category: 'Statin', dosageForm: 'Tablet', strength: '10 mg', description: 'Lowers cholesterol.', prescriptionRequired: true },
  { name: 'Azithromycin 500mg', genericName: 'azithromycin', brandNames: ['Zithromax', 'Azithral'], category: 'Antibiotic', dosageForm: 'Tablet', strength: '500 mg', description: 'Macrolide antibiotic.', prescriptionRequired: true },
  { name: 'Loratadine 10mg', genericName: 'loratadine', brandNames: ['Claritin', 'Lorfast'], category: 'Antihistamine', dosageForm: 'Tablet', strength: '10 mg', description: 'Non-drowsy allergy relief.' },
  { name: 'Aspirin 75mg', genericName: 'aspirin', brandNames: ['Bayer Aspirin', 'Ecosprin'], category: 'Antiplatelet / NSAID', dosageForm: 'Tablet', strength: '75 mg', description: 'Pain relief; low dose used for blood-clot prevention.' },
];

// Demo pharmacies as [name, address, phone, hours, dLat, dLng] offsets from SEED_LAT/SEED_LNG
const pharmacyTemplates = [
  ['HealthPlus Pharmacy', 'Main Market Road', '+91 90000 00001', '8:00 AM - 10:00 PM', 0.004, 0.003],
  ['CityCare Chemist', 'Station Road', '+91 90000 00002', '24 hours', -0.006, 0.005],
  ['Wellness Medico', 'Civil Lines', '+91 90000 00003', '9:00 AM - 9:00 PM', 0.009, -0.004],
  ['LifeLine Drug Store', 'Hospital Chowk', '+91 90000 00004', '24 hours', -0.012, -0.008],
  ['Apna Medical Hall', 'Old Bazaar', '+91 90000 00005', '8:30 AM - 9:30 PM', 0.015, 0.011],
  ['Sanjeevani Pharmacy', 'Park Avenue', '+91 90000 00006', '9:00 AM - 8:00 PM', -0.02, 0.014],
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const run = async () => {
  await connectDB();
  const baseLat = parseFloat(process.env.SEED_LAT) || 28.6139;
  const baseLng = parseFloat(process.env.SEED_LNG) || 77.209;

  await Promise.all([Medicine.deleteMany({}), Pharmacy.deleteMany({})]);
  const createdMedicines = await Medicine.insertMany(medicines);

  const pharmacies = pharmacyTemplates.map(([name, address, phone, openingHours, dLat, dLng]) => ({
    name,
    address,
    phone,
    openingHours,
    location: { type: 'Point', coordinates: [baseLng + dLng, baseLat + dLat] },
    // each pharmacy stocks ~70% of medicines, some with zero (out of stock)
    inventory: createdMedicines
      .filter(() => Math.random() < 0.7)
      .map((m) => ({
        medicine: m._id,
        quantity: Math.random() < 0.2 ? 0 : rand(5, 120),
        price: rand(15, 450),
      })),
  }));
  await Pharmacy.insertMany(pharmacies);

  console.log(`Seeded ${createdMedicines.length} medicines and ${pharmacies.length} pharmacies around (${baseLat}, ${baseLng}).`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
