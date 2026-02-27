import { useState, useEffect } from 'react';
import Constants from 'expo-constants';


const key = Constants.expoConfig?.extra?.googlePlacesApiKey;
console.log("Google key loaded:", !!key);

interface Coords {
  latitude: number;
  longitude: number;
}

export interface KosherPlace {
  id: string;
  name: string;
  address: string;
  distance: number; // in meters
  distanceText: string; // e.g., "0.5 mi"
  rating?: number;
  userRatingsTotal?: number;
  types: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  isOpen?: boolean;
  priceLevel?: number;
  mapsUrl?: string;
  weekdayText?: string[]; // e.g., ["Monday: 9:00 AM – 6:00 PM", ...]
}

interface KosherData {
  places: KosherPlace[];
  isLoading: boolean;
  error: string | null;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function useKosherData(
  coords: Coords | null,
  searchType: 'all' | 'restaurant' | 'grocery' | 'bakery' = 'all'
): KosherData {
  const [data, setData] = useState<KosherData>({
    places: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!coords) {
      setData({
        places: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    fetchKosherPlaces();

    async function fetchKosherPlaces() {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
        
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
          throw new Error('Google Places API key not configured');
        }

        // Build search query based on type
        let query = 'kosher';
        if (searchType === 'restaurant') {
          query = 'kosher restaurant';
        } else if (searchType === 'grocery') {
          query = 'kosher grocery OR kosher market OR kosher supermarket';
        } else if (searchType === 'bakery') {
          query = 'kosher bakery';
        }

        // Use Google Places Text Search API
        const response = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": [
                  "places.id",
                  "places.displayName",
                  "places.formattedAddress",
                  "places.location",
                  "places.rating",
                  "places.userRatingCount",
                  "places.googleMapsUri",
                  "places.regularOpeningHours",
                  "places.regularOpeningHours.weekdayDescriptions",
                  "places.types",
                  "places.priceLevel",
                ].join(","),
              },
              body: JSON.stringify({
                textQuery: query,
                locationBias: {
                  circle: {
                    center: {
                      latitude: coords!.latitude,
                      longitude: coords!.longitude,
                    },
                    radius: 8000,
                  },
                },
              }),
            }
          );
          
          if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Places API error ${response.status}: ${txt}`);
          }
          
          const data = await response.json();

          const places: KosherPlace[] = (data.places ?? [])
            .map((place: any) => {
              const lat = place.location?.latitude;
              const lon = place.location?.longitude;

              // Skip results without coordinates
              if (typeof lat !== "number" || typeof lon !== "number") return null;

              const placeId = String(place.id ?? "");
              if (!placeId) return null;

              const distance = calculateDistance(
                coords!.latitude,
                coords!.longitude,
                lat,
                lon
              );

              const distanceText = formatDistance(distance);

              return {
                id: placeId,
                name: place.displayName?.text ?? "Unknown",
                address: place.formattedAddress ?? "Address not available",
                distance,
                distanceText,
                rating: typeof place.rating === "number" ? place.rating : undefined,
                userRatingsTotal:
                  typeof place.userRatingCount === "number"
                    ? place.userRatingCount
                    : undefined,
                types: Array.isArray(place.types) ? place.types : [],
                location: {
                  latitude: lat,
                  longitude: lon,
                },
                isOpen: place.regularOpeningHours?.openNow ?? undefined,
                weekdayText: Array.isArray(place.regularOpeningHours?.weekdayDescriptions)
                  ? place.regularOpeningHours.weekdayDescriptions
                  : undefined,
                priceLevel:
                  typeof place.priceLevel === "number" ? place.priceLevel : undefined,
                mapsUrl: place.googleMapsUri ?? undefined,
              } as KosherPlace;
            })
            .filter(Boolean)
            .sort((a: KosherPlace, b: KosherPlace) => a.distance - b.distance);

        setData({
          places,
          isLoading: false,
          error: null,
        });

      } catch (err) {
        console.error('Error fetching kosher places:', err);
        setData({
          places: [],
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }, [coords, searchType]);

  return data;
}