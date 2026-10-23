import { Router } from 'express';
import Medicine from '../models/Medicine.js';
import { asyncHandler } from '../middleware/error.js';
import { escapeRegex } from '../utils/geo.js';
import { isMongoConnected } from '../config/db.js';
import { inMemoryStore } from '../config/inMemoryStore.js';

const router = Router();

// GET /api/medicines?search=para&limit=20
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search = '' } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    if (!isMongoConnected) {
      return res.json(inMemoryStore.searchMedicines(search, limit));
    }

    const filter = {};
    if (search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: rx }, { genericName: rx }, { brandNames: rx }];
    }
    const medicines = await Medicine.find(filter).sort({ name: 1 }).limit(limit);
    res.json(medicines);
  })
);

// GET /api/medicines/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      const med = inMemoryStore.getMedicineById(req.params.id);
      if (!med) return res.status(404).json({ message: 'Medicine not found' });
      return res.json(med);
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(medicine);
  })
);

// GET /api/medicines/:id/alternatives  -> other local medicines with the same generic name
router.get(
  '/:id/alternatives',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      return res.json(inMemoryStore.getAlternatives(req.params.id));
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (!medicine.genericName) return res.json([]);
    const alternatives = await Medicine.find({
      genericName: medicine.genericName,
      _id: { $ne: medicine._id },
    }).sort({ name: 1 });
    res.json(alternatives);
  })
);

// POST /api/medicines
router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      const newMed = { _id: `med-${Date.now()}`, ...req.body };
      inMemoryStore.medicines.push(newMed);
      return res.status(201).json(newMed);
    }
    const medicine = await Medicine.create(req.body);
    res.status(201).json(medicine);
  })
);

// PUT /api/medicines/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      const idx = inMemoryStore.medicines.findIndex((m) => String(m._id) === String(req.params.id));
      if (idx === -1) return res.status(404).json({ message: 'Medicine not found' });
      inMemoryStore.medicines[idx] = { ...inMemoryStore.medicines[idx], ...req.body };
      return res.json(inMemoryStore.medicines[idx]);
    }
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json(medicine);
  })
);

// DELETE /api/medicines/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      const idx = inMemoryStore.medicines.findIndex((m) => String(m._id) === String(req.params.id));
      if (idx === -1) return res.status(404).json({ message: 'Medicine not found' });
      inMemoryStore.medicines.splice(idx, 1);
      return res.json({ message: 'Medicine deleted' });
    }
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ message: 'Medicine deleted' });
  })
);

export default router;
