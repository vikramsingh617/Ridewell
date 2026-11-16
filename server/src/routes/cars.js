import { Router } from 'express';
import { z } from 'zod';
import Car from '../models/Car.js';
import { protect, allow } from '../middleware/auth.js';

const router = Router();

// Validation schema for creating a car
const carInput = z.object({
  title: z.string().min(3),
  brand: z.string().min(2),
  model: z.string().min(1),
  city: z.string().min(2),
  location: z.string().optional(), // Address or location name
  lat: z.coerce.number().optional(), // Latitude for nearby search
  lng: z.coerce.number().optional(), // Longitude for nearby search
  category: z.enum(['Hatchback', 'Sedan', 'SUV', 'Luxury', 'Electric']),
  transmission: z.enum(['Manual', 'Automatic']),
  fuel: z.string(),
  seats: z.coerce.number().int().min(2).max(12),
  pricePerDay: z.coerce.number().positive(),
  securityDeposit: z.coerce.number().min(0).default(0),
  image: z.string().url().optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  features: z.array(z.string()).optional()
});

// ============================================================================
// 1. GET ALL CARS (With search & filters)
// ============================================================================
router.get('/', async (req, res, next) => {
  try {
    const { city, category, transmission, minPrice, maxPrice, seats, q } = req.query;
    const filter = { status: 'APPROVED' };

    if (city) filter.city = { $regex: String(city), $options: 'i' };
    if (category) filter.category = category;
    if (transmission) filter.transmission = transmission;
    if (seats) filter.seats = { $gte: Number(seats) };

    if (minPrice || maxPrice) {
      filter.pricePerDay = {
        ...(minPrice ? { $gte: Number(minPrice) } : {}),
        ...(maxPrice ? { $lte: Number(maxPrice) } : {})
      };
    }

    if (q) {
      filter.$or = ['title', 'brand', 'model', 'city'].map((field) => ({
        [field]: { $regex: String(q), $options: 'i' }
      }));
    }

    const cars = await Car.find(filter)
      .populate('host', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ cars });
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// 2. GET NEARBY CARS (By User's Shared GPS Coordinates)
//    Example: GET /api/cars/nearby?lat=28.6139&lng=77.2090&maxDistance=15
// ============================================================================
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lng, maxDistance = 15 } = req.query; // maxDistance in km (default 15km)

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and Longitude are required' });
    }

    const cars = await Car.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)] // GeoJSON uses [lng, lat]
          },
          distanceField: 'distanceInMeters',
          maxDistance: parseFloat(maxDistance) * 1000, // convert km to meters
          spherical: true,
          query: { status: 'APPROVED' }
        }
      },
      {
        $addFields: {
          distanceInKm: { $round: [{ $divide: ['$distanceInMeters', 1000] }, 1] }
        }
      },
      {
        // Populate host info
        $lookup: {
          from: 'users',
          localField: 'host',
          foreignField: '_id',
          as: 'host'
        }
      },
      {
        $unwind: { path: '$host', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          'host.password': 0
        }
      }
    ]);

    res.json({ count: cars.length, cars });
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// 3. GET HOST'S OWN CARS
//    IMPORTANT: Must be placed BEFORE /:id so Express doesn't treat 'host' as an ID
// ============================================================================
router.get('/host/mine', protect, allow('host', 'admin'), async (req, res, next) => {
  try {
    const cars = await Car.find({ host: req.user._id }).sort({ createdAt: -1 });
    res.json({ cars });
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// 4. GET SINGLE CAR BY ID
// ============================================================================
router.get('/:id', async (req, res, next) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, status: 'APPROVED' }).populate('host', 'name');
    if (!car) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json({ car });
  } catch (e) {
    next(e);
  }
});

// ============================================================================
// 5. CREATE A NEW CAR (Supports GPS Coordinates for Location)
// ============================================================================
router.post('/', protect, allow('host', 'admin'), async (req, res, next) => {
  try {
    const data = carInput.parse(req.body);

    const carData = {
      ...data,
      host: req.user._id,
      status: 'APPROVED' // For simplicity, auto-approve; in real apps, consider admin approval
    };

    // If host provided coordinates, format into GeoJSON for MongoDB
    if (data.lat !== undefined && data.lng !== undefined) {
      carData.location = {
        type: 'Point',
        coordinates: [Number(data.lng), Number(data.lat)],
        address: data.location || data.city
      };
      delete carData.lat;
      delete carData.lng;
    }

    const car = await Car.create(carData);
    res.status(201).json({ car, message: 'Vehicle submitted for admin approval' });
  } catch (e) {
    next(e);
  }
});

export default router;