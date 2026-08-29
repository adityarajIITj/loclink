import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLink, getLinkLocations, type LinkResponse, type LocationResponse } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import QRModal from '../components/QRModal';
import { getToken } from '../services/api';

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function LinkDetail() {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<LinkResponse | null>(null);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchData = () => {
    if (!id) return;
    Promise.all([getLink(Number(id)), getLinkLocations(Number(id))])
      .then(([linkData, locData]) => {
        setLink(linkData);
        setLocations(locData.locations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();

    // WebSocket for real-time updates
    const token = getToken();
    if (!token) return;

    const wsBase = import.meta.env.VITE_WS_URL;
    const wsUrl = wsBase
      ? `${wsBase}/ws?token=${token}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'location_created' && data.link_id === Number(id)) {
          setLocations((prev) => [data.location, ...prev]);
        }
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [id]);

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(`${window.location.origin}/l/${link.token}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!link) {
    return <div className="text-slate-400 text-center mt-12">Link not found.</div>;
  }

  const center: [number, number] = locations.length > 0
    ? [locations[0].latitude, locations[0].longitude]
    : [20, 0];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard/links" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{link.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              link.is_active
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {link.is_active ? 'Active' : 'Disabled'}
            </span>
            <span className="text-xs text-slate-500">{link.visit_count} visits</span>
            <span className="text-xs text-slate-500">{locations.length} locations</span>
          </div>
        </div>
        <button onClick={copyLink} className="bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 px-4 py-2 rounded-xl border border-slate-700 transition-all">
          {copiedLink ? 'Copied!' : 'Copy Link'}
        </button>
        <button onClick={() => setShowQR(true)} className="bg-indigo-600 hover:bg-indigo-500 text-sm text-white px-4 py-2 rounded-xl transition-all">
          QR Code
        </button>
      </div>

      {/* Map */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden mb-6" style={{ height: '400px' }}>
        {locations.length > 0 ? (
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map((loc) => (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                <Popup>
                  <div className="text-xs">
                    <p><strong>Lat:</strong> {loc.latitude.toFixed(6)}</p>
                    <p><strong>Lng:</strong> {loc.longitude.toFixed(6)}</p>
                    {loc.accuracy && <p><strong>Accuracy:</strong> {loc.accuracy.toFixed(0)}m</p>}
                    <p><strong>Time:</strong> {new Date(loc.captured_at).toLocaleString()}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-2 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <p className="text-sm">No locations received yet.</p>
              <p className="text-xs text-slate-600 mt-1">Share your link to start tracking.</p>
            </div>
          </div>
        )}
      </div>

      {/* Locations list */}
      {locations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4">Location History</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between bg-slate-900/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-white">{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</p>
                  {loc.accuracy && <p className="text-xs text-slate-500">Accuracy: {loc.accuracy.toFixed(0)}m</p>}
                </div>
                <p className="text-xs text-slate-500">{new Date(loc.captured_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showQR && <QRModal link={link} onClose={() => setShowQR(false)} />}
    </div>
  );
}
