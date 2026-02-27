import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { useAppState } from "../state/AppState";

export function useTravelLocation() {
  const { locationMode, setTravelCoords } = useAppState();
  const watcher = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      // Stop any existing watcher if we're not in TRAVEL mode
      watcher.current?.remove();
      watcher.current = null;

      if (locationMode !== "TRAVEL") return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // leave coords as-is; screens can show prompt
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (mounted) {
        setTravelCoords({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      }

      watcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 150, // updates more responsively
        },
        (pos) => {
          setTravelCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      );
    }

    start();

    return () => {
      mounted = false;
      watcher.current?.remove();
      watcher.current = null;
    };
  }, [locationMode, setTravelCoords]);
}