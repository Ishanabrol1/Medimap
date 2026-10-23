import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { getMedicineInfo, getGenericAlternatives } from '../services/openfda.js';

const router = Router();

// GET /api/openfda/:name
// -> { info, alternatives } where `info` comes from the OpenFDA drug label
//    and `alternatives` are other brands sharing the same generic ingredient.
router.get(
  '/:name',
  asyncHandler(async (req, res) => {
    try {
      const info = await getMedicineInfo(req.params.name);
      if (!info) {
        return res.status(404).json({ message: `No OpenFDA label found for "${req.params.name}"` });
      }
      const alternatives = await getGenericAlternatives(
        info.genericName,
        info.brandName || req.params.name
      );
      res.json({ info, alternatives });
    } catch (e) {
      res.status(404).json({ message: `OpenFDA information currently unavailable (${e.message})` });
    }
  })
);

export default router;
