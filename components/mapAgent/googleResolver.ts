"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { Coordinates } from "./data";

export type ResolvedMapSelection = {
  projectName: string;
  location: string;
  placeId?: string;
  formattedAddress?: string;
  error?: string;
};

let optionsSet = false;
let librariesPromise: Promise<{
  geocoding: google.maps.GeocodingLibrary;
  places: google.maps.PlacesLibrary;
}> | null = null;

function getGoogleLibraries() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured"));
  }

  if (!optionsSet) {
    setOptions({ key: apiKey, v: "weekly" });
    optionsSet = true;
  }

  if (!librariesPromise) {
    librariesPromise = Promise.all([
      importLibrary("geocoding"),
      importLibrary("places"),
    ]).then(([geocoding, places]) => ({ geocoding, places }));
  }

  return librariesPromise;
}

function pickLocationName(result: google.maps.GeocoderResult | undefined): string {
  if (!result) return "";

  const components = result.address_components || [];
  const byType = (type: string) => components.find((component) => component.types.includes(type))?.long_name || "";
  const locality = byType("sublocality_level_1") || byType("sublocality") || byType("locality");
  const city = byType("administrative_area_level_3") || byType("administrative_area_level_2");
  const state = byType("administrative_area_level_1");

  return [locality, city, state].filter(Boolean).join(", ") || result.formatted_address || "";
}

function getNearbyPlace(
  places: google.maps.PlacesLibrary,
  coordinates: Coordinates,
): Promise<google.maps.places.PlaceResult | null> {
  const container = document.createElement("div");
  const service = new places.PlacesService(container);

  return new Promise((resolve) => {
    service.nearbySearch(
      {
        location: { lat: coordinates.lat, lng: coordinates.lng },
        radius: 250,
      },
      (results, status) => {
        if (status !== places.PlacesServiceStatus.OK || !results?.length) {
          resolve(null);
          return;
        }

        const best = results
          .filter((place) => place.name && place.place_id)
          .sort((a, b) => {
            const aRating = a.rating || 0;
            const bRating = b.rating || 0;
            const aReviews = a.user_ratings_total || 0;
            const bReviews = b.user_ratings_total || 0;
            return bReviews + bRating * 10 - (aReviews + aRating * 10);
          })[0];

        resolve(best || null);
      },
    );
  });
}

export async function resolveClickedLocation(coordinates: Coordinates): Promise<ResolvedMapSelection> {
  try {
    const { geocoding, places } = await getGoogleLibraries();
    const geocoder = new geocoding.Geocoder();
    const geocodeResponse = await geocoder.geocode({
      location: { lat: coordinates.lat, lng: coordinates.lng },
    });
    const primaryResult = geocodeResponse.results[0];
    const nearbyPlace = await getNearbyPlace(places, coordinates);

    return {
      projectName: nearbyPlace?.name || "",
      location: pickLocationName(primaryResult),
      placeId: nearbyPlace?.place_id,
      formattedAddress: primaryResult?.formatted_address,
    };
  } catch (error) {
    return {
      projectName: "",
      location: "",
      error: error instanceof Error ? error.message : "Unable to resolve selected location",
    };
  }
}
