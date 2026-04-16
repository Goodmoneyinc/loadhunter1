import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L, { DivIcon } from 'leaflet';
import { Crosshair } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { supabase } from '../lib/supabase';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Load {
  id: string;
  facility_address: string;
  facility_lat: number;
  facility_long: number;
  status: string;
  load_number?: string | null;
  driver_id?: string | null;
}

interface Driver {
  id: string;
  name: string;
  current_lat: number;
  current_long: number;
}

interface DashboardMapProps {
  loads: Load[];
  center: [number, number];
  dispatcherLocation: { lat: number; lng: number } | null;
}

const facilityIcon = new DivIcon({
  className: 'custom-icon',
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="
        background: #FF6B00;
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 16px rgba(255, 107, 0, 0.6), 0 0 30px rgba(255, 107, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 18px;
          font-weight: bold;
        ">&#x1F4CD;</div>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const dispatcherIcon = new DivIcon({
  className: 'custom-icon',
  html: `
    <div style="
      background: #FF6B00;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(255, 107, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <div style="
        color: white;
        font-size: 18px;
        font-weight: bold;
      ">&#x1F3AF;</div>
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

const driverIcon = new DivIcon({
  className: 'custom-icon',
  html: `
    <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
      <div class="radar-ring" style="
        position: absolute;
        width: 80px;
        height: 80px;
        border: 2px solid rgba(255, 107, 0, 0.6);
        border-radius: 50%;
        animation: radarScan 2s ease-out infinite;
      "></div>
      <div class="radar-ring" style="
        position: absolute;
        width: 80px;
        height: 80px;
        border: 2px solid rgba(255, 107, 0, 0.4);
        border-radius: 50%;
        animation: radarScan 2s ease-out infinite 0.5s;
      "></div>
      <div style="
        background: #FF6B00;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        border: 3px solid white;
        box-shadow: 0 4px 20px rgba(255, 107, 0, 0.8), 0 0 30px rgba(255, 107, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: driverPulse 2s infinite;
        position: relative;
        z-index: 10;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes driverPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes radarScan {
        0% {
          transform: scale(0.5);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }
    </style>
  `,
  iconSize: [80, 80],
  iconAnchor: [40, 40],
  popupAnchor: [0, -40],
});

function MapSizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function RecenterButton() {
  const map = useMap();

  const recenterFleet = () => {
    const bounds = map.getBounds();
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  };

  return (
    <button
      onClick={recenterFleet}
      className="absolute top-4 right-4 z-[1000] bg-[#1A1A1A] border border-white/10 p-3 rounded-xl shadow-xl hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/30 transition-all hover:scale-105 group"
      title="Recenter Fleet View"
    >
      <Crosshair className="w-5 h-5 text-[#FF6B00] group-hover:rotate-90 transition-transform duration-300" />
    </button>
  );
}

export default function DashboardMap({ loads, center, dispatcherLocation }: DashboardMapProps) {
  const [realtimeDrivers, setRealtimeDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    fetchDrivers();

    const channel = supabase
      .channel('map-driver-gps')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers' },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          if (updated.current_lat && updated.current_long && updated.is_tracking) {
            setRealtimeDrivers(prev => {
              const idx = prev.findIndex(d => d.id === updated.id);
              const driver: Driver = {
                id: updated.id as string,
                name: updated.name as string,
                current_lat: updated.current_lat as number,
                current_long: updated.current_long as number,
              };
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = driver;
                return next;
              }
              return [...prev, driver];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDrivers() {
    const { data } = await supabase
      .from('drivers')
      .select('id, name, current_lat, current_long')
      .eq('is_tracking', true)
      .not('current_lat', 'is', null)
      .not('current_long', 'is', null);

    if (data) setRealtimeDrivers(data as Driver[]);
  }

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-container {
        background: #0F0F0F;
        border-radius: 0;
      }
      .leaflet-tile-pane {
        opacity: 0.85;
      }
      .leaflet-popup-content-wrapper {
        background: rgba(15, 15, 15, 0.97);
        backdrop-filter: blur(16px);
        color: white;
        border-radius: 12px;
        border: 1px solid rgba(255, 107, 0, 0.3);
        box-shadow: 0 8px 32px rgba(255, 107, 0, 0.2);
      }
      .leaflet-popup-tip {
        background: rgba(15, 15, 15, 0.97);
      }
      .leaflet-popup-close-button {
        color: white !important;
      }
      .leaflet-control-attribution {
        background: rgba(15, 15, 15, 0.7) !important;
        color: rgba(255, 255, 255, 0.5) !important;
      }
      .leaflet-control-attribution a {
        color: rgba(255, 107, 0, 0.8) !important;
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
      zoom={5}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      scrollWheelZoom={false}
      zoomSnap={0.5}
      zoomDelta={0.5}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapSizeInvalidator />
      <RecenterButton />

      {loads.map((load) => (
        <div key={load.id}>
          <Circle
            center={[load.facility_lat, load.facility_long]}
            radius={200}
            pathOptions={{
              color: '#FF6B00',
              fillColor: '#FF6B00',
              fillOpacity: 0.15,
              weight: 2,
              opacity: 0.7,
            }}
            className={load.status === 'at_facility' ? 'map-pulse' : ''}
          />
          <Marker
            position={[load.facility_lat, load.facility_long]}
            icon={facilityIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold" style={{color:'#FF6B00'}}>{load.facility_address}</p>
                {load.load_number && (
                  <p className="text-xs mt-1 font-mono" style={{color:'#aaa'}}>Load: {load.load_number}</p>
                )}
                <p className="text-xs mt-1" style={{color:'#888'}}>Status: {load.status}</p>
                <p className="text-xs mt-1" style={{color:'#FF6B00', opacity:0.8}}>Geofence: 200m radius</p>
              </div>
            </Popup>
          </Marker>
        </div>
      ))}

      {realtimeDrivers.map((driver) => (
        <Marker
          key={`driver-${driver.id}`}
          position={[driver.current_lat, driver.current_long]}
          icon={driverIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold" style={{color:'#FF6B00'}}>{driver.name}</p>
              <p className="text-xs mt-1" style={{color:'#aaa'}}>Driver - Tracking Active</p>
              <p className="text-xs mt-1" style={{color:'#888'}}>
                GPS: {driver.current_lat.toFixed(4)}, {driver.current_long.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {dispatcherLocation && (
        <Marker
          position={[dispatcherLocation.lat, dispatcherLocation.lng]}
          icon={dispatcherIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold" style={{color:'#FF6B00'}}>Dispatcher Location</p>
              <p className="text-xs mt-1" style={{color:'#aaa'}}>Command Center</p>
              <p className="text-xs mt-1" style={{color:'#888'}}>
                GPS: {dispatcherLocation.lat.toFixed(4)}, {dispatcherLocation.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
