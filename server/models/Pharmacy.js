import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
    quantity: { type: Number, default: 0, min: 0 },
    price: { type: Number, min: 0 },
  },
  { _id: false }
);

const pharmacySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    openingHours: { type: String, trim: true },
    // GeoJSON Point: coordinates are [longitude, latitude]
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    inventory: [inventorySchema],
  },
  { timestamps: true }
);

pharmacySchema.index({ location: '2dsphere' });

export default mongoose.model('Pharmacy', pharmacySchema);
