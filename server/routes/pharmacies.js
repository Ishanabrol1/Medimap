import { Router } from 'express';
import Pharmacy from '../models/Pharmacy.js';
import { asyncHandler } from '../middleware/error.js';
import { haversineKm } from '../utils/geo.js';
import { isMongoConnected } from '../config/db.js';
import { inMemoryStore } from '../config/inMemoryStore.js';

const router = Router();

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// GET /api/pharmacies/nearby?lat=..&lng=..&radius=5&medicine=<medicineId>
// Pharmacies from our DB within `radius` km, nearest first.
// If `medicine` is given, only pharmacies that have it in stock are returned.
router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(parseFloat(req.query.radius) || 5, 50);
    const { medicine } = req.query;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat and lng query params are required' });
    }

    if (!isMongoConnected) {
      return res.json(inMemoryStore.getNearbyPharmacies(lat, lng, radiusKm, medicine));
    }

    const filter = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    };
    if (medicine) filter.inventory = { $elemMatch: { medicine, quantity: { $gt: 0 } } };

    const pharmacies = await Pharmacy.find(filter)
      .populate('inventory.medicine', 'name genericName strength')
      .lean();

    const result = pharmacies.map((p) => {
      const [pLng, pLat] = p.location.coordinates;
      const stockItem = medicine
        ? p.inventory.find((i) => String(i.medicine?._id) === String(medicine))
        : undefined;
      return {
        _id: p._id,
        name: p.name,
        address: p.address,
        phone: p.phone,
        openingHours: p.openingHours,
        lat: pLat,
        lng: pLng,
        distanceKm: Number(haversineKm(lat, lng, pLat, pLng).toFixed(2)),
        stock: stockItem ? { quantity: stockItem.quantity, price: stockItem.price } : null,
        inventoryCount: p.inventory.length,
      };
    });

    res.json(result);
  })
);

// GET /api/pharmacies/osm?lat=..&lng=..&radius=3
// Real pharmacies around the user from OpenStreetMap (Overpass API).
router.get(
  '/osm',
  asyncHandler(async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusM = Math.min(parseFloat(req.query.radius) || 3, 20) * 1000;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat and lng query params are required' });
    }

    const query = `[out:json][timeout:25];(node["amenity"="pharmacy"](around:${radiusM},${lat},${lng});way["amenity"="pharmacy"](around:${radiusM},${lat},${lng}););out center 50;`;
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }),
    });
    if (!response.ok) {
      const err = new Error(`Overpass request failed (${response.status})`);
      err.status = 502;
      throw err;
    }
    const json = await response.json();

    const places = (json.elements || [])
      .map((el) => {
        const pLat = el.lat ?? el.center?.lat;
        const pLng = el.lon ?? el.center?.lon;
        if (pLat == null || pLng == null) return null;
        const t = el.tags || {};
        const address = [t['addr:housenumber'], t['addr:street'], t['addr:city']]
          .filter(Boolean)
          .join(' ');
        return {
          id: `${el.type}/${el.id}`,
          name: t.name || 'Pharmacy',
          address: address || undefined,
          phone: t.phone || t['contact:phone'],
          openingHours: t.opening_hours,
          lat: pLat,
          lng: pLng,
          distanceKm: Number(haversineKm(lat, lng, pLat, pLng).toFixed(2)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(places);
  })
);

// GET /api/pharmacies
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      return res.json(inMemoryStore.pharmacies);
    }
    const pharmacies = await Pharmacy.find().populate('inventory.medicine', 'name genericName');
    res.json(pharmacies);
  })
);

// GET /api/pharmacies/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      const pharmacy = inMemoryStore.pharmacies.find((p) => String(p._id) === String(req.params.id));
      if (!pharmacy) return res.status(404).json({ message: 'Pharmacy not found' });
      return res.json(pharmacy);
    }
    const pharmacy = await Pharmacy.findById(req.params.id).populate('inventory.medicine');
    if (!pharmacy) return res.status(404).json({ message: 'Pharmacy not found' });
    res.json(pharmacy);
  })
);

// POST /api/pharmacies   body: { name, address, phone, openingHours, lat, lng }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { lat, lng, ...rest } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'lat and lng (numbers) are required' });
    }
    if (!isMongoConnected) {
      const newPharmacy = {
        _id: `pharm-${Date.now()}`,
        ...rest,
        lat,
        lng,
        location: { type: 'Point', coordinates: [lng, lat] },
        inventory: [],
      };
      inMemoryStore.pharmacies.push(newPharmacy);
      return res.status(201).json(newPharmacy);
    }
    const pharmacy = await Pharmacy.create({
      ...rest,
      location: { type: 'Point', coordinates: [lng, lat] },
    });
    res.status(201).json(pharmacy);
  })
);

// PUT /api/pharmacies/:id/inventory   body: { medicine, quantity, price }
router.put(
  '/:id/inventory',
  asyncHandler(async (req, res) => {
    const { medicine, quantity, price } = req.body;
    if (!medicine) return res.status(400).json({ message: 'medicine id is required' });

    if (!isMongoConnected) {
      const pharmacy = inMemoryStore.pharmacies.find((p) => String(p._id) === String(req.params.id));
      if (!pharmacy) return res.status(404).json({ message: 'Pharmacy not found' });
      const item = pharmacy.inventory.find((i) => String(i.medicine?._id || i.medicine) === String(medicine));
      if (item) {
        if (quantity !== undefined) item.quantity = quantity;
        if (price !== undefined) item.price = price;
      } else {
        pharmacy.inventory.push({ medicine, quantity: quantity ?? 0, price });
      }
      return res.json(pharmacy);
    }

    const pharmacy = await Pharmacy.findById(req.params.id);
    if (!pharmacy) return res.status(404).json({ message: 'Pharmacy not found' });

    const item = pharmacy.inventory.find((i) => String(i.medicine) === String(medicine));
    if (item) {
      if (quantity !== undefined) item.quantity = quantity;
      if (price !== undefined) item.price = price;
    } else {
      pharmacy.inventory.push({ medicine, quantity: quantity ?? 0, price });
    }
    await pharmacy.save();
    res.json(pharmacy);
  })
);

// DELETE /api/pharmacies/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isMongoConnected) {
      const idx = inMemoryStore.pharmacies.findIndex((p) => String(p._id) === String(req.params.id));
      if (idx === -1) return res.status(404).json({ message: 'Pharmacy not found' });
      inMemoryStore.pharmacies.splice(idx, 1);
      return res.json({ message: 'Pharmacy deleted' });
    }
    const pharmacy = await Pharmacy.findByIdAndDelete(req.params.id);
    if (!pharmacy) return res.status(404).json({ message: 'Pharmacy not found' });
    res.json({ message: 'Pharmacy deleted' });
  })
);

export default router;
