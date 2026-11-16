import mongoose from 'mongoose';
const bookingSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true }, endDate: { type: Date, required: true },
  days: { type: Number, required: true }, dailyRateSnapshot: { type: Number, required: true }, depositSnapshot: { type: Number, required: true },
  rentalTotal: { type: Number, required: true }, totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'PICKUP_PENDING', 'ACTIVE', 'RETURN_PENDING', 'COMPLETED', 'CANCELLED', 'REJECTED'], default: 'PENDING', index: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'REFUNDED'], default: 'UNPAID' }
}, { timestamps: true });
bookingSchema.index({ car: 1, startDate: 1, endDate: 1, status: 1 });
export default mongoose.model('Booking', bookingSchema);
