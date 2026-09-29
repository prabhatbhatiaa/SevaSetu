import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* Navigation header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-brand-500/20">
                SS
              </div>
              <div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">Seva<span className="text-brand-600">Setu</span></span>
                <span className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider">Community Service & Volunteer Bridge</span>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Environment Ready
              </span>
            </nav>
          </div>
        </header>

        {/* Main hero content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Task 1: Project Architecture & Environment Initialization Initialized
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl leading-tight">
            Connecting Community Needs with Local Volunteers
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">
            Location-aware, multi-factor volunteer matching platform built on React 18, Node.js, Express, MongoDB Geospatial 2dsphere indexing, and Leaflet Maps.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-4xl">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">01</div>
              <h3 className="font-bold text-slate-900 text-base">Backend API & Database</h3>
              <p className="mt-1 text-sm text-slate-600">Express.js server with Mongoose ODM and GeoJSON 2dsphere support.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm mb-3">02</div>
              <h3 className="font-bold text-slate-900 text-base">Frontend Architecture</h3>
              <p className="mt-1 text-sm text-slate-600">Vite + React 18 with Tailwind CSS modern component layouts.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm mb-3">03</div>
              <h3 className="font-bold text-slate-900 text-base">Geospatial Mapping</h3>
              <p className="mt-1 text-sm text-slate-600">Leaflet OpenStreetMap integration with dynamic pin drop and radius calculation.</p>
            </div>
          </div>
        </main>
      </div>
    </Router>
  );
}
