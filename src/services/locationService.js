// Reads the device GPS position, falling back to DEFAULT_LOCATION when the
// browser has no geolocation or the user denies permission.
import { simulateDelay } from "../utils/helpers";
import { DEFAULT_LOCATION } from "../utils/constants";

export const getCurrentLocation = async () => {
  await simulateDelay(400);
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "Current Live Location"
          });
        },
        () => {
          // Fallback to default location on error or permission denied
          resolve(DEFAULT_LOCATION);
        },
        { timeout: 5000 }
      );
    } else {
      resolve(DEFAULT_LOCATION);
    }
  });
};

// NOTE: distance maths lives in haversineKm() in src/utils/helpers.js.
