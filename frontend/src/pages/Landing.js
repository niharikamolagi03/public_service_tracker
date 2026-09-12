import React from 'react';
import { Link } from 'react-router-dom';
import { FaShieldAlt, FaBolt, FaTint, FaRoad, FaTrash, FaLightbulb, FaArrowRight, FaCheckCircle, FaMobileAlt, FaBell, FaChartBar } from 'react-icons/fa';
const CATEGORIES = [
  { icon: FaBolt, label: 'Electricity', color: 'bg-amber-50 text-amber-500', desc: 'Power outages, faulty wiring, meter issues' },
  { icon: FaTint, label: 'Water Supply', color: 'bg-sky-50 text-sky-500', desc: 'No water, leakage, contamination' },
  { icon: FaRoad, label: 'Roads', color: 'bg-slate-50 text-slate-500', desc: 'Potholes, damaged roads, footpaths' },
  { icon: FaTrash, label: 'Garbage', color: 'bg-emerald-50 text-emerald-500', desc: 'Missed collection, overflowing bins' },
  { icon: FaLightbulb, label: 'Streetlights', color: 'bg-cyan-50 text-cyan-500', desc: 'Non-functional lights, dark streets' },
  { icon: FaShieldAlt, label: 'Sewage', color: 'bg-indigo-50 text-indigo-500', desc: 'Blocked drains, overflow, waterlogging' },
];

const FEATURES = [
  { icon: FaMobileAlt, title: 'Easy Filing', desc: 'Submit complaints in minutes with photo/video evidence from your phone.' },
  { icon: FaShieldAlt, title: 'AI Routing', desc: 'Complaints are automatically categorized and routed to the right department.' },
  { icon: FaBell, title: 'Real-time Updates', desc: 'Get instant notifications at every step of your complaint resolution.' },
  { icon: FaChartBar, title: 'Transparency', desc: 'Track progress publicly. Follow complaints that affect your community.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5 font-bold text-xl">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <FaShieldAlt className="text-purple-200 text-sm" />
            </div>
            <span className="tracking-wide">CivicRedress</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="flex items-center gap-2 bg-white text-purple-700 px-5 py-2 rounded-full text-sm font-semibold hover:bg-purple-50 transition shadow-sm">
              Sign In
            </Link>
            <Link to="/register"
              className="flex items-center gap-2 bg-white/15 border border-white/30 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white/25 transition">
              Register Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 text-white py-24 px-4 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <FaShieldAlt className="text-purple-300" />
            India's Digital Civic Grievance Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Your Voice,<br />
            <span className="text-purple-300">Government Action</span>
          </h1>
          <p className="text-lg text-purple-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Report civic issues — electricity, water, roads, garbage, streetlights — and track resolution in real time. AI routes your complaint to the right department instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="bg-white text-purple-700 px-8 py-3.5 rounded-full font-bold text-base hover:bg-purple-50 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30">
              File a Complaint <FaArrowRight />
            </Link>
            <Link to="/login"
              className="bg-white/15 border-2 border-white/40 text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-white/25 transition flex items-center justify-center gap-2">
              Sign In to Dashboard
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-purple-200">
            {['AI-Powered Routing', 'Real-time Tracking', 'Photo/Video Upload', 'Instant Notifications'].map(t => (
              <div key={t} className="flex items-center gap-1.5"><FaCheckCircle className="text-purple-400" />{t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 bg-sky-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-3">What Can You Report?</h2>
          <p className="text-center text-slate-500 mb-10">AI automatically routes your complaint to the correct government department</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map(({ icon: Icon, label, color, desc }) => (
              <div key={label} className="bg-white rounded-xl p-5 text-center shadow-sm hover:shadow-md transition group cursor-pointer border border-sky-100">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition`}>
                  <Icon className="text-xl" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-1 hidden md:block">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="text-center p-6">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-2xl text-violet-600" />
                </div>
                <div className="w-7 h-7 bg-violet-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-3">{i + 1}</div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white py-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">Ready to Make Your City Better?</h2>
          <p className="text-purple-200 mb-8">Join thousands of citizens holding local government accountable.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-purple-700 px-10 py-3 rounded-full font-bold text-base hover:bg-purple-50 transition inline-flex items-center gap-2 shadow-lg">
              Get Started Free <FaArrowRight />
            </Link>
            <Link to="/login" className="bg-white/15 border-2 border-white/40 text-white px-10 py-3 rounded-full font-semibold text-base hover:bg-white/25 transition inline-flex items-center gap-2">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-800 text-slate-400 text-center py-6 text-sm">
        CivicRedress — Empowering Citizens Through Technology
      </footer>
    </div>
  );
}
