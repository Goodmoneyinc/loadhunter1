// Geocoding service using Nominatim (OpenStreetMap's free geocoding API)

interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
}

/**
 * Geocode an address to GPS coordinates using Nominatim API
 * @param address - The address to geocode
 * @returns Promise with latitude and longitude, or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Clean and encode the address
    const encodedAddress = encodeURIComponent(address.trim());

    // Use Nominatim API with proper headers
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LogisticsDispatchApp/1.0'
      }
    });

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0] as { lat: string; lon: string; display_name: string };
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };
    }

    console.warn('No geocoding results found for address:', address);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two GPS points using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a point is within a geofence radius
 * @param currentLat - Current latitude
 * @param currentLng - Current longitude
 * @param targetLat - Target latitude
 * @param targetLng - Target longitude
 * @param radiusMeters - Geofence radius in meters
 * @returns true if inside geofence
 */
export function isInsideGeofence(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number = 200
): boolean {
  const distance = calculateDistance(currentLat, currentLng, targetLat, targetLng);
  return distance <= radiusMeters;
}
