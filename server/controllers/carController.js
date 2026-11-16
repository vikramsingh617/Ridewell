const Car = require('../models/Car');

// @route  GET /api/cars/nearby?lat=...&lng=...&maxDistance=10
// @desc   Find cars within radius (default 10 km)
exports.getNearbyCars = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide latitude and longitude" 
      });
    }

    // Convert km to meters for MongoDB
    const maxDistanceInMeters = parseFloat(maxDistance) * 1000;

    const nearbyCars = await Car.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // [lng, lat]
          },
          distanceField: "distance", // Adds calculated distance (in meters) to each car object
          maxDistance: maxDistanceInMeters,
          spherical: true,
          query: { isAvailable: true } // only show available cars
        }
      },
      {
        // Convert distance to kilometers and format to 1 decimal place
        $addFields: {
          distanceInKm: { $round: [{ $divide: ["$distance", 1000] }, 1] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: nearbyCars.length,
      data: nearbyCars
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};