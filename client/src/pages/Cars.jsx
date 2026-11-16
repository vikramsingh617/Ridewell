import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, RotateCcw, Loader2 } from 'lucide-react';
import api from '../api';
import CarCard from '../components/CarCard';

// 🌍 Reverse Geocode: Coordinates (lat, lng) se City, State, Pincode nikalna
async function fetchLocationDetails(lat, lng) {
  try {
    // 1st Priority: BigDataCloud API (fast & accurate for India)
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (!res.ok) throw new Error('BigDataCloud error');
    const data = await res.json();

    return {
      city: data.city || data.locality || '',
      state: data.principalSubdivision || '',
      pincode: data.postcode || '',
      area: data.locality || ''
    };
  } catch (error) {
    // 2nd Priority Fallback: OpenStreetMap Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      if (!res.ok) throw new Error('Nominatim error');
      const data = await res.json();
      const addr = data.address || {};

      return {
        city: addr.city || addr.town || addr.village || addr.county || addr.state_district || '',
        state: addr.state || '',
        pincode: addr.postcode || '',
        area: addr.suburb || addr.neighbourhood || ''
      };
    } catch (e) {
      console.error('Location geocoding failed:', e);
      return null;
    }
  }
}

export default function Cars() {
  const [params] = useSearchParams();

  // Filters state
  const [filters, setFilters] = useState({
    city: params.get('city') || '',
    state: '',
    pincode: '',
    q: '',
    category: '',
    transmission: '',
    maxPrice: ''
  });

  // GPS / Location state
  const [nearMe, setNearMe] = useState({
    active: false,
    loading: false,
    coords: null, // { lat, lng }
    radius: 15,   // default 15 km radius
    details: null // { city, state, pincode, area }
  });

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Update helper
  const update = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // 1. 📍 GPS Click Handler (Detect Location + Auto-fill City, State, Pincode)
  const handleToggleNearMe = () => {
    // Agar active hai toh toggle OFF karke reset karo
    if (nearMe.active) {
      setNearMe({ active: false, loading: false, coords: null, radius: 15, details: null });
      setFilters((prev) => ({ ...prev, city: '', state: '', pincode: '' }));
      return;
    }

    if (!navigator.geolocation) {
      setError('Aapke browser mein GPS location support nahi hai.');
      return;
    }

    setNearMe((prev) => ({ ...prev, loading: true }));
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Auto-detect City, State, Pincode
        const locDetails = await fetchLocationDetails(latitude, longitude);

        setNearMe({
          active: true,
          loading: false,
          coords: { lat: latitude, lng: longitude },
          radius: 15,
          details: locDetails
        });

        // Form fields mein auto-fill karein
        if (locDetails) {
          setFilters((prev) => ({
            ...prev,
            city: locDetails.city || prev.city,
            state: locDetails.state || prev.state,
            pincode: locDetails.pincode || prev.pincode
          }));
        }
      },
      (geoErr) => {
        setNearMe((prev) => ({ ...prev, loading: false }));
        setError('Location permission allow karein taaki City, State aur PIN code auto-detect ho sake.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 2. Fetch cars (Nearby API ya Standard Filters API)
  const fetchCars = useCallback(() => {
    setLoading(true);
    setError('');

    // A) Agar "Near Me" GPS active hai
    if (nearMe.active && nearMe.coords) {
      api
        .get('/cars/nearby', {
          params: {
            lat: nearMe.coords.lat,
            lng: nearMe.coords.lng,
            maxDistance: nearMe.radius
          }
        })
        .then((res) => {
          let nearbyCars = res.data.cars || [];

          // Extra filters apply karein (category, transmission, price, search)
          if (filters.category) {
            nearbyCars = nearbyCars.filter((c) => c.category === filters.category);
          }
          if (filters.transmission) {
            nearbyCars = nearbyCars.filter((c) => c.transmission === filters.transmission);
          }
          if (filters.maxPrice) {
            nearbyCars = nearbyCars.filter((c) => c.pricePerDay <= Number(filters.maxPrice));
          }
          if (filters.q) {
            const queryLower = filters.q.toLowerCase();
            nearbyCars = nearbyCars.filter(
              (c) =>
                c.title?.toLowerCase().includes(queryLower) ||
                c.brand?.toLowerCase().includes(queryLower) ||
                c.model?.toLowerCase().includes(queryLower)
            );
          }

          setCars(nearbyCars);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Could not load nearby vehicles.');
        })
        .finally(() => setLoading(false));
    } else {
      // B) Normal search query
      const query = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v)
      );

      api
        .get('/cars', { params: query })
        .then((res) => {
          setCars(res.data.cars || []);
        })
        .catch((err) => {
          setError(
            err.response?.data?.message ||
              'Could not load vehicles. Check your API connection.'
          );
        })
        .finally(() => setLoading(false));
    }
  }, [filters, nearMe]);

  // 3. Debounce fetch (350ms taaki lag na ho)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCars();
    }, 350);

    return () => clearTimeout(timer);
  }, [fetchCars]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({ city: '', state: '', pincode: '', q: '', category: '', transmission: '', maxPrice: '' });
    setNearMe({ active: false, loading: false, coords: null, radius: 15, details: null });
  };

  return (
    <section className="page-section container">
      {/* Page Header */}
      <div className="page-intro">
        <div className="eyebrow eyebrow-dark">THE RIDEWELL COLLECTION</div>
        <h1>
          Find the car for
          <br />
          <em>wherever life takes you.</em>
        </h1>
        <p>Compare trusted local listings and choose a ride that fits your plans.</p>
      </div>

      {/* Filter Panel */}
      <div className="filter-panel">
        {/* Search Input */}
        <div className="filter-search">
          <Search size={18} />
          <input
            placeholder="Search make, model or city"
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>

        {/* 📍 GPS Active Button & Radius Selector */}
        <div className="filter-select" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label>GPS Location</label>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleToggleNearMe}
              disabled={nearMe.loading}
              className={`btn ${nearMe.active ? 'btn-primary' : 'btn-outline'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
              title="Click to detect your location, city, state, and pincode"
            >
              {nearMe.loading ? (
                <>
                  <Loader2 size={15} className="spin" /> Locating…
                </>
              ) : (
                <>
                  <MapPin size={15} /> {nearMe.active ? 'GPS Active (On)' : '📍 Detect My Location'}
                </>
              )}
            </button>

            {/* Radius Dropdown */}
            {nearMe.active && (
              <select
                value={nearMe.radius}
                onChange={(e) =>
                  setNearMe((prev) => ({ ...prev, radius: Number(e.target.value) }))
                }
                style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '4px' }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={15}>15 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            )}
          </div>
        </div>

        {/* Auto-filled City */}
        <div className="filter-select">
          <label>City</label>
          <input
            placeholder="City"
            value={filters.city}
            onChange={(e) => update('city', e.target.value)}
          />
        </div>

        {/* Auto-filled State */}
        <div className="filter-select">
          <label>State</label>
          <input
            placeholder="State"
            value={filters.state}
            onChange={(e) => update('state', e.target.value)}
          />
        </div>

        {/* Auto-filled PIN Code */}
        <div className="filter-select">
          <label>PIN Code</label>
          <input
            placeholder="PIN Code"
            value={filters.pincode}
            onChange={(e) => update('pincode', e.target.value)}
          />
        </div>

        {/* Category Select */}
        <div className="filter-select">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value="">All types</option>
            {['Hatchback', 'Sedan', 'SUV', 'Luxury', 'Electric'].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        {/* Transmission Select */}
        <div className="filter-select">
          <label>Transmission</label>
          <select
            value={filters.transmission}
            onChange={(e) => update('transmission', e.target.value)}
          >
            <option value="">Any</option>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
          </select>
        </div>

        {/* Max Price / Day */}
        <div className="filter-select">
          <label>Max / day (₹)</label>
          <input
            type="number"
            min="0"
            placeholder="No limit"
            value={filters.maxPrice}
            onChange={(e) => update('maxPrice', e.target.value)}
          />
        </div>
      </div>

      {/* 📍 Detected Location Info Badge */}
      {nearMe.active && nearMe.details && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '10px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            margin: '15px 0',
            border: '1px solid #bae6fd'
          }}
        >
          <MapPin size={18} />
          <span>
            <strong>Detected Location:</strong>{' '}
            {[nearMe.details.area, nearMe.details.city, nearMe.details.state, nearMe.details.pincode]
              .filter(Boolean)
              .join(', ')}
            {' '}(within {nearMe.radius} km radius)
          </span>
        </div>
      )}

      {/* Results Heading */}
      <div className="results-heading">
        <div>
          <span className="results-count">
            {cars.length} {cars.length === 1 ? 'VEHICLE' : 'VEHICLES'}
          </span>
          <h2>
            {nearMe.active
              ? `Rides near you (${nearMe.details?.city || 'Your Area'})`
              : 'Available rides'}
          </h2>
        </div>
        <span className="sort-note">
          <SlidersHorizontal size={15} /> Live marketplace results
        </span>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-state">Finding your next ride…</div>
      ) : error ? (
        <div className="notice error">{error}</div>
      ) : cars.length ? (
        <div className="car-grid">
          {cars.map((car) => (
            <div key={car._id} style={{ position: 'relative' }}>
              {/* Agar nearby search hai aur distance mila hai toh green badge dikhana */}
              {car.distanceInKm !== undefined && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#16a34a',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MapPin size={12} /> {car.distanceInKm} km away
                </div>
              )}
              <CarCard car={car} />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={30} />
          <h3>No rides match those filters.</h3>
          <p>
            {nearMe.active
              ? `No cars found within ${nearMe.radius} km of your location. Try increasing the radius or clearing filters.`
              : 'Try a different city, category or price range.'}
          </p>
          <button className="btn btn-outline" onClick={handleResetFilters}>
            <RotateCcw size={14} style={{ marginRight: '6px' }} />
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}