import mongoose from 'mongoose';

const carSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true,
      index: true
    },

    // 📍 GeoJSON Location: enables nearby distance calculation
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      },
      address: {
        type: String, // e.g., "Sector 14, MG Road"
        default: ''
      }
    },

    category: {
      type: String,
      enum: ['Hatchback', 'Sedan', 'SUV', 'Luxury', 'Electric'],
      default: 'Sedan'
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      default: 'Manual'
    },
    fuel: {
      type: String,
      default: 'Petrol'
    },
    seats: {
      type: Number,
      default: 5
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 1
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: 0
    },
    image: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    features: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'INACTIVE'],
      default: 'PENDING',
      index: true
    },
    rating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// 🔍 Existing compound index for search & filter queries
carSchema.index({ city: 1, category: 1, pricePerDay: 1, status: 1 });

// 🚀 Geospatial index for $geoNear nearby queries
carSchema.index({ location: '2dsphere' });

export default mongoose.model('Car', carSchema);