import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import {
  FaCamera, FaTimes, FaMapMarkerAlt, FaRobot,
  FaCheckCircle, FaArrowLeft, FaSpinner,
  FaBolt, FaTint, FaRoad, FaTrash, FaLightbulb, FaShieldAlt, FaLocationArrow,
} from 'react-icons/fa';
import { ButtonSpinner } from '../components/LoadingSpinner';
import { useLang } from '../contexts/LangContext';

const CAT_ICONS = {
  electricity: FaBolt, water: FaTint, road: FaRoad, garbage: FaTrash,
  streetlight: FaLightbulb, sewage: FaShieldAlt, park: FaShieldAlt,
  noise: FaShieldAlt, encroachment: FaShieldAlt, other: FaShieldAlt,
};

const CAT_COLORS = {
  electricity:  'bg-amber-100 text-amber-700 border-amber-300',
  water:        'bg-sky-100 text-sky-700 border-sky-300',
  road:         'bg-slate-100 text-slate-700 border-slate-300',
  garbage:      'bg-emerald-100 text-emerald-700 border-emerald-300',
  streetlight:  'bg-cyan-100 text-cyan-700 border-cyan-300',
  sewage:       'bg-indigo-100 text-indigo-700 border-indigo-300',
  park:         'bg-teal-100 text-teal-700 border-teal-300',
  noise:        'bg-violet-100 text-violet-700 border-violet-300',
  encroachment: 'bg-rose-100 text-rose-700 border-rose-300',
  other:        'bg-gray-100 text-gray-600 border-gray-300',
};

const DEFAULT_MAP_CENTER = [12.9716, 77.5946];

function MapCenter({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);

  return null;
}

function MapPin({ position, onSelect }) {
  useMapEvents({
    click(event) {
      onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });

  return position ? (
    <CircleMarker center={position} radius={10} pathOptions={{ color: '#6d28d9', fillColor: '#8b5cf6', fillOpacity: 0.8 }} />
  ) : null;
}

export default function SubmitGrievance() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSource, setLocationSource] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();

  const [form, setForm] = useState({
    title: '', description: '', address: '', pincode: '', latitude: '', longitude: '',
  });

  const getCurrentPosition = (options) => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

  const reverseGeocode = async (latitude, longitude) => {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'jsonv2',
        lat: latitude,
        lon: longitude,
        zoom: 18,
        addressdetails: 1,
      },
      timeout: 8000,
    });
    const pincode = response.data.address?.postcode || '';
    return {
      address: response.data.display_name || '',
      pincode: /^\d{6}$/.test(pincode) ? pincode : '',
    };
  };

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Location services are not supported by this browser');
      return;
    }

    setLocationLoading(true);
    try {
      const position = await getCurrentPosition({
        // Do not reuse a cached or network-estimated position for a complaint.
        enableHighAccuracy: true, timeout: 30000, maximumAge: 0,
      });
      if (position.coords.accuracy > 100) {
        throw new Error('LOW_ACCURACY');
      }

      const latitude = position.coords.latitude.toFixed(6);
      const longitude = position.coords.longitude.toFixed(6);
      let location = { address: '', pincode: '' };
      try {
        location = await reverseGeocode(latitude, longitude);
      } catch (_) {
        // The precise coordinates are still retained if address lookup is unavailable.
      }
      setForm(previous => ({
        ...previous,
        latitude,
        longitude,
        address: previous.address || location.address || 'Current GPS location',
        pincode: previous.pincode || location.pincode,
      }));
      setMapCenter([Number(latitude), Number(longitude)]);
      setLocationSource('gps');
      toast.success('Current location added');
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        toast.error('Location access was denied. Allow location access in your browser settings, then try again.');
        return;
      }

      setShowMap(true);
      let message = 'Unable to get an accurate GPS location. Choose your exact spot on the map.';
      if (error.message === 'LOW_ACCURACY') {
        message = 'Your location reading is too imprecise for a complaint. Choose your exact spot on the map.';
      } else if (error.code === error.TIMEOUT) {
        message = 'Accurate GPS timed out. Choose your exact spot on the map.';
      }
      toast.error(message);
    } finally {
      setLocationLoading(false);
    }
  };

  const selectMapLocation = async ([latitude, longitude]) => {
    const formattedLatitude = latitude.toFixed(6);
    const formattedLongitude = longitude.toFixed(6);
    const toastId = 'reverse-geocode';
    toast.loading('Finding the address for this map pin…', { id: toastId });
    let location = { address: '', pincode: '' };
    try {
      location = await reverseGeocode(formattedLatitude, formattedLongitude);
    } catch (_) {
      // The selected map coordinates remain usable without an address lookup.
    }
    setForm(previous => ({
      ...previous,
      latitude: formattedLatitude,
      longitude: formattedLongitude,
      address: previous.address || location.address || 'Selected map location',
      pincode: previous.pincode || location.pincode,
    }));
    setMapCenter([latitude, longitude]);
    setLocationSource('map');
    toast.success(location.address ? 'Map location selected' : 'Map pin selected—add the address if needed', { id: toastId });
  };

  const classifyInput = async (titleHint, descriptionHint) => {
    setAiLoading(true);
    try {
      const res = await axios.post('/api/grievances/ai_classify/', {
        title: titleHint,
        description: descriptionHint,
      });
      setAiResult(res.data);
    } catch (_) {
      setAiResult(null);
    }
    setAiLoading(false);
  };

  // Auto-classify when photo is selected
  const handlePhoto = async (file) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('Image too large (max 50MB)'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    // AI classify from filename + any existing title
    const titleHint = form.title || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    const descriptionHint = form.description || titleHint;
    await classifyInput(titleHint, descriptionHint);
  };

  // Re-classify when title changes
  const handleTitleBlur = async () => {
    if (!form.title.trim() && !form.description.trim()) return;
    await classifyInput(form.title.trim() || form.description.trim(), form.description.trim() || form.title.trim());
  };

  const handleDescriptionBlur = async () => {
    if (!form.description.trim() && !form.title.trim()) return;
    await classifyInput(form.title.trim() || form.description.trim(), form.description.trim() || form.title.trim());
  };

  const handleSubmit = async () => {
    if (!form.title.trim() && !photo) {
      toast.error('Add a photo or describe the issue');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      const title = form.title.trim() || (aiResult ? `${aiResult.category} issue` : 'Civic issue');
      const description = form.description.trim() || title;
      fd.append('title', title);
      fd.append('description', description);
      if (aiResult?.category) fd.append('category', aiResult.category);
      fd.append('address', form.address);
      fd.append('pincode', form.pincode);
      if (form.latitude && form.longitude) {
        fd.append('latitude', form.latitude);
        fd.append('longitude', form.longitude);
      }
      if (photo) fd.append('media_0', photo);

      const res = await axios.post('/api/grievances/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Complaint filed! Application ID generated.');
      navigate(`/track/${res.data.grievance_id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const AiIcon = aiResult ? (CAT_ICONS[aiResult.category] || FaShieldAlt) : FaRobot;
  const aiColor = aiResult ? CAT_COLORS[aiResult.category] || CAT_COLORS.other : 'bg-indigo-50 text-indigo-700 border-indigo-200';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 pt-6 pb-8">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
          >
            <FaArrowLeft className="text-sm" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{t('fileComplaint')}</h1>
            <p className="text-violet-300 text-xs">{t('aiAutoDetect')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-10">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

          {/* Photo upload — full width, prominent */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative cursor-pointer"
            style={{ height: 260 }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handlePhoto(e.target.files[0])}
            />

            {photoPreview ? (
              <>
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                {/* Remove button */}
                <button
                  onClick={e => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null); setAiResult(null); }}
                  className="absolute top-3 right-3 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition"
                >
                  <FaTimes className="text-sm" />
                </button>

                {/* Change photo hint */}
                <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                  <FaCamera className="text-xs" /> {t('changePhoto')}
                </div>

                {/* AI result overlay */}
                {aiLoading && (
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                    <FaSpinner className="animate-spin text-xs" /> {t('aiAnalyzing')}
                  </div>
                )}
                {aiResult && !aiLoading && (
                  <div className={`absolute top-3 left-3 flex items-center gap-1.5 ${aiColor} px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm`}>
                    <AiIcon className="text-xs" />
                    <span className="capitalize">{aiResult.category}</span>
                    <span className="opacity-60">· {Math.round(aiResult.confidence * 100)}%</span>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-50 to-indigo-50 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center">
                  <FaCamera className="text-3xl text-violet-500" />
                </div>
                <div className="text-center px-6">
                  <p className="font-bold text-slate-700 text-base">{t('uploadPhoto')}</p>
                  <p className="text-slate-400 text-sm mt-1">{t('uploadHint')}</p>
                </div>
                {aiLoading && (
                  <div className="flex items-center gap-2 text-violet-600 text-sm">
                    <FaSpinner className="animate-spin" /> {t('aiAnalyzing')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="p-5 space-y-4">
            {/* AI detected result card */}
            <AnimatePresence>
              {aiResult && !aiLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border ${aiColor}`}
                >
                  <div className="w-10 h-10 bg-white/60 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AiIcon className="text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold opacity-70">{t('aiDetected')}</p>
                    <p className="font-bold capitalize text-sm">{aiResult.category}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs opacity-60">{t('confidence')}</p>
                    <p className="font-bold text-sm">{Math.round(aiResult.confidence * 100)}%</p>
                  </div>
                  <FaCheckCircle className="text-lg flex-shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Short description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('whatIssue')}</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                onBlur={handleTitleBlur}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                placeholder={t('issuePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                onBlur={handleDescriptionBlur}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                placeholder="Add more details about the issue, location, or impact"
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-sm font-bold text-slate-700 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-violet-500 text-xs" /> {t('location')}
                  </label>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locationLoading}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-50"
                  >
                    {locationLoading ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />}
                    {locationLoading ? 'Locating…' : 'Use current'}
                  </button>
                </div>
                <input
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                  placeholder={t('locationPlaceholder')}
                />
                {form.latitude && form.longitude && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {locationSource === 'map'
                        ? 'Exact map pin attached'
                        : 'Current GPS location attached'}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowMap(value => !value)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  <FaMapMarkerAlt /> {showMap ? 'Hide map' : 'Choose exact spot on map'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('pincode')}</label>
                <input
                  value={form.pincode}
                  onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                  placeholder="560001"
                  maxLength={6}
                />
              </div>
            </div>

            {showMap && (
              <div className="rounded-2xl overflow-hidden border border-violet-200">
                <p className="px-3 py-2 bg-violet-50 text-xs text-violet-800">
                  Click the map to place an exact pin. You can drag or zoom before selecting.
                </p>
                <MapContainer center={mapCenter} zoom={15} scrollWheelZoom className="h-64 w-full" aria-label="Location picker map">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapCenter center={mapCenter} />
                  <MapPin
                    position={form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : null}
                    onSelect={selectMapLocation}
                  />
                </MapContainer>
              </div>
            )}

            {/* Summary before submit */}
            {(photo || form.title) && (
              <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">{t('summaryTitle')}</p>
                <div className="space-y-1.5 text-sm">
                  {form.title && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 flex-shrink-0">{t('issue')}:</span>
                      <span className="font-semibold text-slate-800 text-right truncate">{form.title}</span>
                    </div>
                  )}
                  {aiResult && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('category')}:</span>
                      <span className="font-semibold capitalize text-slate-800">{aiResult.category}</span>
                    </div>
                  )}
                  {form.address && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 flex-shrink-0">{t('location')}:</span>
                      <span className="font-semibold text-slate-800 text-right truncate">{form.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('photo')}:</span>
                    <span className="font-semibold text-slate-800">{photo ? `1 ${t('attached')}` : t('none')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || (!photo && !form.title.trim())}
              className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-bold hover:bg-violet-700 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-md shadow-violet-200 text-sm"
            >
              {submitting
                ? <><ButtonSpinner /> {t('submitting')}</>
                : <><FaCheckCircle /> {t('submit')}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
