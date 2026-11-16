import { Router } from 'express';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import { protect, allow } from '../middleware/auth.js';
const router = Router();
const createSchema = z.object({ carId: z.string().length(24), startDate: z.string().datetime(), endDate: z.string().datetime() });
const activeStatuses = ['PENDING','CONFIRMED','PICKUP_PENDING','ACTIVE','RETURN_PENDING'];
router.post('/', protect, allow('customer'), async (req, res, next) => { try {
 const { carId, startDate, endDate } = createSchema.parse(req.body); const start = new Date(startDate), end = new Date(endDate);
 if (end <= start || start < new Date(Date.now() - 60_000)) return res.status(400).json({ message: 'Choose a valid future rental period' });
 const car = await Car.findOne({ _id: carId, status: 'APPROVED' }).populate('host'); if (!car || !car.host?.isActive) return res.status(404).json({ message: 'Vehicle is unavailable' });
 if (String(car.host._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot book your own vehicle' });
 const conflict = await Booking.exists({ car: carId, status: { $in: activeStatuses }, startDate: { $lt: end }, endDate: { $gt: start } });
 if (conflict) return res.status(409).json({ message: 'Vehicle is already booked for those dates' });
 const days = Math.max(1, Math.ceil((end - start) / 86400000)); const rentalTotal = days * car.pricePerDay;
 const booking = await Booking.create({ car: car._id, customer: req.user._id, host: car.host._id, startDate: start, endDate: end, days, dailyRateSnapshot: car.pricePerDay, depositSnapshot: car.securityDeposit, rentalTotal, totalAmount: rentalTotal + car.securityDeposit });
 res.status(201).json({ booking });
} catch(e) { next(e); } });
router.get('/mine', protect, async (req, res, next) => { try { const filter = req.user.role === 'admin' ? {} : req.user.role === 'host' ? { host: req.user._id } : { customer: req.user._id }; const bookings = await Booking.find(filter).populate('car').populate('customer','name email').populate('host','name email').sort({ createdAt: -1 }); res.json({ bookings }); } catch(e) { next(e); } });
router.patch('/:id/status', protect, async (req, res, next) => { try {
 const booking = await Booking.findById(req.params.id); if (!booking) return res.status(404).json({ message: 'Booking not found' });
 const nextStatus = req.body.status; const transitions = { PENDING: ['CONFIRMED','REJECTED','CANCELLED'], CONFIRMED: ['PICKUP_PENDING','CANCELLED'], PICKUP_PENDING: ['ACTIVE'], ACTIVE: ['RETURN_PENDING'], RETURN_PENDING: ['COMPLETED'] };
 const isAdmin = req.user.role === 'admin'; const isHost = String(booking.host) === String(req.user._id); const isCustomer = String(booking.customer) === String(req.user._id);
 if (!isAdmin && !(isHost && ['CONFIRMED','REJECTED','PICKUP_PENDING','ACTIVE','COMPLETED'].includes(nextStatus)) && !(isCustomer && ['CANCELLED','RETURN_PENDING'].includes(nextStatus))) return res.status(403).json({ message: 'Not allowed to update this booking' });
 if (!transitions[booking.status]?.includes(nextStatus)) return res.status(400).json({ message: `Invalid transition from ${booking.status} to ${nextStatus}` });
 booking.status = nextStatus; await booking.save(); res.json({ booking });
} catch(e) { next(e); } });
export default router;
