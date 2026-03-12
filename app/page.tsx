"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentName: "",
    rank: "Blanche",
    date: "", // Start with empty string to avoid hydration mismatch
    location: "Casablanca, Maroc",
    discipline: "Jujitsu",
  });

  // Initialize date on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: new Date().toISOString().split("T")[0]
    }));
  }, []);

  const ranks = [
    "Blanche",
    "Blanche - Jaune",
    "Jaune",
    "Jaune - Orange",
    "Orange",
    "Orange - Verte",
    "Verte",
    "Verte - Bleue",
    "Bleue",
    "Bleue - Marron",
    "Marron",
    "Noire - 1er Dan",
    "Noire - 2ème Dan",
    "Noire - 3ème Dan",
    "Noire - 4ème Dan",
    "Noire - 5ème Dan",
    "Noire - 6ème Dan",
    "Noire - 7ème Dan",
    "Noire - 8ème Dan",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/generate-certificate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération du certificat");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificat_${formData.studentName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la génération du certificat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-xl overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-slate-900 px-8 py-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wide">
            Budokan du Maroc
          </h1>
          <p className="text-slate-300 text-sm mt-1 uppercase tracking-widest font-medium">
            Générateur de Certificats
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <form onSubmit={handleGenerate} className="space-y-6">
            
            {/* Discipline Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Discipline</label>
              <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discipline: "Jujitsu" })}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${
                    formData.discipline === "Jujitsu"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Jujitsu
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discipline: "Aïkido" })}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all duration-200 ${
                    formData.discipline === "Aïkido"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Aïkido
                </button>
              </div>
            </div>

            {/* Student Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="studentName">
                Nom de l'élève
              </label>
              <input
                id="studentName"
                type="text"
                name="studentName"
                required
                value={formData.studentName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="Ex: Jean Dupont"
              />
            </div>

            {/* Rank / Belt */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="rank">
                Grade / Ceinture
              </label>
              <div className="relative">
                <select
                  id="rank"
                  name="rank"
                  required
                  value={formData.rank}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all cursor-pointer"
                >
                  {ranks.map((rank) => (
                    <option key={rank} value={rank} className="text-slate-900">
                      {rank}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Date and Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="date">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="location">
                  Lieu
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  placeholder="Ex: Casablanca"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-lg text-white font-bold text-sm uppercase tracking-widest transition-all duration-200 flex justify-center items-center ${
                  loading 
                    ? "bg-slate-400 cursor-not-allowed" 
                    : "bg-slate-900 hover:bg-slate-800 hover:shadow-lg active:scale-[0.98]"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération en cours...
                  </>
                ) : (
                  "Générer le Certificat"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
