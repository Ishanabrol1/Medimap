import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, trim: true, lowercase: true, index: true },
    brandNames: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    dosageForm: { type: String, trim: true },
    strength: { type: String, trim: true },
    description: { type: String, trim: true },
    prescriptionRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Medicine', medicineSchema);
