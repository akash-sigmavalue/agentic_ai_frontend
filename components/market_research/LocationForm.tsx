"use client";

import React, { useState, useEffect, useRef } from "react";
import { searchPlaces } from "@/lib/market_research_api";
import { PlaceSuggestion } from "@/types/market_research";

interface Props {
  formData: { latitude: string; longitude: string; location: string };
  setFormData: React.Dispatch<React.SetStateAction<{ latitude: string; longitude: string; location: string }>>;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function LocationForm({ formData, setFormData, onSubmit, loading }: Props) {
  const [searchMode, setSearchMode] = useState<"propertyName" | "coordinates">("propertyName");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState(false);
  const [resolvingSubmit, setResolvingSubmit] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce place search for propertyName mode
  useEffect(() => {
    if (searchMode !== "propertyName" || !searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchPlaces(searchQuery);
      setSuggestions(results);
      setSearching(false);
      setShowDropdown(results.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const cleanLocString = (str: string) => (str || "").replace(/,/g, " ").replace(/\s+/g, " ").trim();

  const handleSelectPlace = (place: PlaceSuggestion) => {
    const fullLoc = cleanLocString(`${place.name} ${place.formatted_address}`);
    setFormData({
      latitude: place.latitude,
      longitude: place.longitude,
      location: fullLoc,
    });
    setSearchQuery(place.name);
    setShowDropdown(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchMode === "propertyName") {
      if (searchQuery.trim() && (!formData.latitude || !formData.longitude || !formData.location)) {
        setResolvingSubmit(true);
        const results = await searchPlaces(searchQuery);
        setResolvingSubmit(false);
        if (results.length > 0) {
          const topPlace = results[0];
          const fullLoc = cleanLocString(`${topPlace.name} ${topPlace.formatted_address}`);
          setFormData({
            latitude: topPlace.latitude,
            longitude: topPlace.longitude,
            location: fullLoc,
          });
        } else {
          setFormData((prev) => ({
            ...prev,
            location: cleanLocString(searchQuery),
            latitude: prev.latitude || "18.5590",
            longitude: prev.longitude || "73.7868",
          }));
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        location: cleanLocString(prev.location),
      }));
    }

    onSubmit(e);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Market Research Search</h2>
          <p className="text-xs text-gray-400 mt-0.5">Search by Property/Building Name or manual Coordinates.</p>
        </div>
        <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
          <button
            type="button"
            onClick={() => setSearchMode("propertyName")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              searchMode === "propertyName"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            🏢 Property / Building
          </button>
          <button
            type="button"
            onClick={() => setSearchMode("coordinates")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              searchMode === "coordinates"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            📍 Coordinates
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-5">
        {searchMode === "propertyName" ? (
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Property or Building Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type to search for a property or building name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFormData((prev) => ({ ...prev, location: e.target.value }));
                }}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
              {searching && (
                <div className="absolute right-3 top-3.5">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {showDropdown && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-gray-950 border border-gray-800 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-800/50">
                {suggestions.map((place) => (
                  <li
                    key={place.place_id}
                    onClick={() => handleSelectPlace(place)}
                    className="px-4 py-3 hover:bg-gray-900 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm text-blue-400">{place.name}</div>
                    <div className="text-xs text-gray-400 truncate">{place.formatted_address}</div>
                  </li>
                ))}
              </ul>
            )}

            {formData.latitude && formData.longitude && (
              <div className="mt-3 flex items-center justify-between text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-2 rounded-lg">
                <span>✓ Auto-resolved via Google Places: <strong>{formData.location || searchQuery}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
                  className="text-gray-400 hover:text-white underline text-[11px]"
                >
                  {showAdvancedCoords ? "Hide details" : "View coordinates"}
                </button>
              </div>
            )}

            {showAdvancedCoords && formData.latitude && formData.longitude && (
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs font-mono bg-gray-950 p-3 rounded-lg border border-gray-800 text-gray-400">
                <div>Latitude: <span className="text-gray-200">{formData.latitude}</span></div>
                <div>Longitude: <span className="text-gray-200">{formData.longitude}</span></div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Latitude <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 18.5590"
                value={formData.latitude}
                onChange={(e) => setFormData((prev) => ({ ...prev, latitude: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Longitude <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 73.7868"
                value={formData.longitude}
                onChange={(e) => setFormData((prev) => ({ ...prev, longitude: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Location Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Baner, Pune"
                value={formData.location}
                onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || resolvingSubmit}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || resolvingSubmit
            ? "Searching Nearby Projects & Running Analysis..."
            : "Search Nearby Projects & Generate Insights"}
        </button>
      </form>
    </div>
  );
}
