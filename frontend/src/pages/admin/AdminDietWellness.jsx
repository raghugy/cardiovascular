import React, { useState, useEffect } from "react";
import { Utensils, Video, Plus, Trash2, CheckCircle, ExternalLink, Play, X, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminDietWellness = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("wellness"); // 'wellness', 'diet', 'food'
  const [wellnessList, setWellnessList] = useState([]);
  const [dietList, setDietList] = useState([]);
  const [foodCatalog, setFoodCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // New Wellness Modal
  const [showAddWellness, setShowAddWellness] = useState(false);
  const [newWellness, setNewWellness] = useState({
    title: "",
    category: "breathing",
    video_url: "",
    thumbnail_url: "",
    duration: "10 mins",
    difficulty: "Gentle",
    target_benefits: "",
    safety_contraindications: "",
    step_instructions: [""]
  });

  useEffect(() => {
    fetchResources();
  }, [token]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const [wRes, dRes, fRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/admin/wellness-resources", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://127.0.0.1:8000/api/admin/diet-resources", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://127.0.0.1:8000/api/admin/food-catalog", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (wRes.ok) {
        const wData = await wRes.json();
        setWellnessList(wData.wellness_resources || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDietList(dData.diet_resources || []);
      }
      if (fRes.ok) {
        const fData = await fRes.json();
        setFoodCatalog(fData.food_catalog || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch resources.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWellness = async (id) => {
    if (!window.confirm("Are you sure you want to delete this wellness resource?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/wellness-resources/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Wellness resource deleted successfully.");
        fetchResources();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFood = async (id) => {
    if (!window.confirm("Are you sure you want to delete this verified food item?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/food-catalog/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage("Food item removed from catalog.");
        fetchResources();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWellness = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/wellness-resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newWellness)
      });
      if (res.ok) {
        setMessage("New yoga/wellness resource added successfully.");
        setShowAddWellness(false);
        fetchResources();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Utensils size={26} className="text-blue-600" /> Lifestyle & Clinical Resource Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Curate evidence-based diet plans, gentle yoga, and cardiovascular rehabilitation video resources
          </p>
        </div>

        <button
          onClick={() => setShowAddWellness(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition self-start sm:self-auto"
        >
          <Plus size={16} /> Add Video Resource
        </button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600" /> {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("wellness")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "wellness"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Video size={16} /> Yoga & Exercise Resources ({wellnessList.length})
        </button>

        <button
          onClick={() => setActiveTab("diet")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "diet"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Utensils size={16} /> Clinical Diet Plans ({dietList.length})
        </button>

        <button
          onClick={() => setActiveTab("food")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "food"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <ShieldCheck size={16} /> Verified Food Catalog ({foodCatalog.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "wellness" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wellnessList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-slate-900 overflow-hidden group">
                  <img
                    src={item.thumbnail_url || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80"}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-300"
                  />
                  <a
                    href={item.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-lg">
                      <Play size={20} className="ml-1 fill-rose-600" />
                    </div>
                  </a>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-xs">
                    {item.duration}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.difficulty}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-2 mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.target_benefits}</p>
                </div>
              </div>

              <div className="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <a
                  href={item.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Watch Video <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => handleDeleteWellness(item.id)}
                  className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "diet" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {dietList.map((diet) => (
            <div key={diet.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {diet.target_condition}
                </span>
                <span className="text-xs text-slate-400 font-medium">Category: {diet.category}</span>
              </div>
              <h4 className="font-bold text-base text-slate-800 mb-2">{diet.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">{diet.short_summary}</p>

              {diet.hydration_salt_guidance && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600">
                  <span className="font-bold text-slate-700">Guidance: </span>
                  {diet.hydration_salt_guidance}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "food" && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Cardiovascular Food Catalog Database</h3>
              <p className="text-xs text-slate-500 mt-0.5">Laboratory nutrient data backed by USDA FoodData Central and ICMR-NIN.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
              {foodCatalog.length} Verified Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Food Item</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Energy / 100g</th>
                  <th className="py-3 px-3">Fiber</th>
                  <th className="py-3 px-3">Sodium</th>
                  <th className="py-3 px-3">Potassium</th>
                  <th className="py-3 px-4">Clinical Evidence Source</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {foodCatalog.map((food) => (
                  <tr key={food.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{food.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {food.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold">{food.calories_per_100g} kcal</td>
                    <td className="py-3 px-3 text-emerald-700 font-semibold">{food.fiber_g}g</td>
                    <td className="py-3 px-3 text-amber-700 font-semibold">{food.sodium_mg}mg</td>
                    <td className="py-3 px-3 text-teal-700 font-semibold">{food.potassium_mg}mg</td>
                    <td className="py-3 px-4 text-[11px]">
                      <a
                        href={food.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        {food.evidence_source} <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteFood(food.id)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Wellness Video Modal */}
      {showAddWellness && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800">Add New Video Resource</h3>
              <button onClick={() => setShowAddWellness(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWellness} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newWellness.title}
                  onChange={(e) => setNewWellness({ ...newWellness, title: e.target.value })}
                  placeholder="e.g. Diaphragmatic Deep Breathing"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newWellness.category}
                    onChange={(e) => setNewWellness({ ...newWellness, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="breathing">Breathing / Pranayama</option>
                    <option value="relaxation">Relaxation</option>
                    <option value="gentle_yoga">Gentle Yoga</option>
                    <option value="stretching">Stretching</option>
                    <option value="aerobic">Aerobic Cardio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={newWellness.difficulty}
                    onChange={(e) => setNewWellness({ ...newWellness, difficulty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Gentle">Gentle</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">YouTube Video URL</label>
                <input
                  type="url"
                  value={newWellness.video_url}
                  onChange={(e) => setNewWellness({ ...newWellness, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Cardiovascular Benefits</label>
                <textarea
                  rows={2}
                  value={newWellness.target_benefits}
                  onChange={(e) => setNewWellness({ ...newWellness, target_benefits: e.target.value })}
                  placeholder="e.g. Promotes vagal nerve activation, lowers acute systolic spikes..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Safety & Contraindications</label>
                <textarea
                  rows={2}
                  value={newWellness.safety_contraindications}
                  onChange={(e) => setNewWellness({ ...newWellness, safety_contraindications: e.target.value })}
                  placeholder="e.g. Avoid inverted poses if hypertensive. Stop immediately if dizzy."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWellness(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDietWellness;
