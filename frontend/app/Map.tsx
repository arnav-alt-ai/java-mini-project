"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const emergencyLocations = [
  {
    name: "Nearest Hospital",
    type: "🏥 Emergency Medical Assistance",
    position: [21.1458, 79.0882] as [number, number],
  },
  {
    name: "Police Station",
    type: "👮 Police & Emergency Response",
    position: [21.149, 79.094] as [number, number],
  },
  {
    name: "Fire Station",
    type: "🚒 Fire & Rescue Services",
    position: [21.138, 79.082] as [number, number],
  },
  {
    name: "Emergency Shelter",
    type: "🏠 Temporary Safe Location",
    position: [21.153, 79.078] as [number, number],
  },
];

const emergencyIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function EmergencyMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([21.1458, 79.0882], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    emergencyLocations.forEach((place) => {
      L.marker(place.position, { icon: emergencyIcon })
        .bindPopup(`<strong>${place.name}</strong><br />${place.type}`)
        .addTo(map);
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div ref={mapContainerRef} className="h-[420px] w-full overflow-hidden rounded-2xl border border-white/10" />
  );
}