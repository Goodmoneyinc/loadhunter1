import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L, { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons in Vite
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LoadMapProps {
  facilityLat: number;
  facilityLong: number;
  facilityName: string;
  driverLat?: number;
  driverLong?: number;
  driverName?: string;
  className?: string;
}

const facilityIcon = new DivIcon({
  className: 'custom-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-size: 16px;
        font-weight: bold;
      ">📍</div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const driverIcon = new DivIcon({
  className: 'custom-icon',
  html: `
    <div style="
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <div style="
        color: white;
        font-size: 18px;
        font-weight: bold;
      ">🚚</div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

export default function LoadMap({
  facilityLat,
  facilityLong,
  facilityName,
  driverLat,
  driverLong,
  driverName,
  className = '',
}: LoadMapProps) {
  const center: [number, number] = [facilityLat, facilityLong];

  console.log('Map rendering with coordinates:', { facilityLat, facilityLong, driverLat, driverLong });

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-container {
        background: #0f172a;
        border-radius: 12px;
      }
      .leaflet-tile-pane {
        filter: grayscale(1) brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
      }
      .leaflet-popup-content-wrapper {
        background: rgba(15, 23, 42, 0.95);
        color: white;
        border-radius: 8px;
        border: 1px solid rgba(100, 116, 139, 0.3);
      }
      .leaflet-popup-tip {
        background: rgba(15, 23, 42, 0.95);
      }
      .leaflet-popup-close-button {
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={driverLat && driverLong ? 14 : 13}
      className={className}
      style={{ height: '100%', width: '100%', minHeight: '300px', zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle
        center={center}
        radius={200}
        pathOptions={{
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        }}
      />

      <Marker position={center} icon={facilityIcon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold text-emerald-400">{facilityName}</p>
            <p className="text-xs text-slate-400 mt-1">Facility Location</p>
          </div>
        </Popup>
      </Marker>

      {driverLat && driverLong && (
        <Marker position={[driverLat, driverLong]} icon={driverIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-sky-400">{driverName || 'Driver'}</p>
              <p className="text-xs text-slate-400 mt-1">Current Location</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
