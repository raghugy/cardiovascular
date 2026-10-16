// src/pages/admin/AdminFoodCatalog.jsx
import React, { useState, useEffect } from "react";
import {
  Utensils,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Heart,
  X
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminFoodCatalog = () => {
  const { token } = useAuth();
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Vegetables",
    calories_per_100g: "",
    protein_g: "",
    fat_g: "",
    saturated_fat_g: "",
    fiber_g: "",
    sodium_mg: "",
    potassium_mg: "",
    serving_size: "100g",
    evidence_source: "American Heart Association / ICMR-NIN",
    source_url: "https://www.heart.org",
    clinical_rationale: "",
    supported_conditions: ["general"],
    contraindications: []
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchFoodCatalog();
  }, [token]);

  const fetchFoodCatalog = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("http://127.0.0.1:8000/api/admin/food-catalog", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load food catalog.");
      const data = await res.json();
      setFoods(data.food_catalog || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load food database.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingFood(null);
    setFormData({
      name: "",
      category: "Vegetables",
      calories_per_100g: "",
      protein_g: "",
      fat_g: "",
      saturated_fat_g: "",
      fiber_g: "",
      sodium_mg: "",
      potassium_mg: "",
      serving_size: "100g",
      evidence_source: "American Heart Association / ICMR-NIN",
      source_url: "https://www.heart.org",
      clinical_rationale: "",
      supported_conditions: ["general"],
      contraindications: []
    });
    setShowModal(true);
  };

  const openEditModal = (food) => {
    setEditingFood(food);
    setFormData({
      name: food.name || "",
      category: food.category || "Vegetables",
      calories_per_100g: food.calories_per_100g ?? "",
      protein_g: food.protein_g ?? "",
      fat_g: food.fat_g ?? "",
      saturated_fat_g: food.saturated_fat_g ?? "",
      fiber_g: food.fiber_g ?? "",
      sodium_mg: food.sodium_mg ?? "",
      potassium_mg: food.potassium_mg ?? "",
      serving_size: food.serving_size || "100g",
      evidence_source: food.evidence_source || "",
      source_url: food.source_url || "",
      clinical_rationale: food.clinical_rationale || "",
      supported_conditions: food.supported_conditions || ["general"],
      contraindications: food.contraindications || []
    });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingFood
        ? `http://127.0.0.1:8000/api/admin/food-catalog/${editingFood.id}`
        : "http://127.0.0.1:8000/api/admin/food-catalog";
      const method = editingFood ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save food item.");
      } else {
        setMessage(editingFood ? "Food item updated successfully." : "New verified food item created.");
        setShowModal(false);
        fetchFoodCatalog();
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while saving food item.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/food-catalog/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage(`Deleted food item: ${deleteConfirm.name}`);
        setDeleteConfirm(null);
        fetchFoodCatalog();
      } else {
        alert("Failed to delete food item.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting food item.");
    }
  };

  const toggleCondition = (cond) => {
    setFormData((prev) => {
      const exists = prev.supported_conditions.includes(cond);
      return {
        ...prev,
        supported_conditions: exists
          ? prev.supported_conditions.filter((c) => c !== cond)
          : [...prev.supported_conditions, cond]
      };
    });
  };

  const filteredFoods = foods.filter((f) => {
    const matchesSearch =
      !search ||
      f.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.category?.toLowerCase().includes(search.toLowerCase()) ||
      f.clinical_rationale?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || f.category === categoryFilter;
    const matchesCondition =
      !conditionFilter || (f.supported_conditions && f.supported_conditions.includes(conditionFilter));
    return matchesSearch && matchesCategory && matchesCondition;
  });

  const categories = [
    "Vegetables",
    "Fruits",
    "Legumes & Pulses",
    "Whole Grains",
    "Healthy Fats & Oils",
    "Lean Proteins",
    "Nuts & Seeds"
  ];

  const conditionsList = [
    { key: "hypertension", label: "Hypertension (DASH)" },
    { key: "cad", label: "Coronary Artery Disease" },
    { key: "heart_failure", label: "Heart Failure" },
    { key: "stroke", label: "Stroke / Cerebrovascular" },
    { key: "heart_attack", label: "Heart Attack (Post-MI)" },
    { key: "general", label: "General Cardioprotective" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Utensils size={26} className="text-teal-600" /> Evidence-Based Food Catalog
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage genuine cardiovascular nutrition entries, verified composition metrics, and clinical citations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchFoodCatalog}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition"
          >
            <Plus size={16} /> Add Food Record
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search foods, ingredients, benefits..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Cardiovascular Conditions</option>
            {conditionsList.map((cond) => (
              <option key={cond.key} value={cond.key}>{cond.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Food Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading evidence-based nutrition items...
        </div>
      ) : filteredFoods.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center text-slate-400">
          No food records found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFoods.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                      {f.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{f.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(f)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(f)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-3 leading-relaxed line-clamp-3">
                  {f.clinical_rationale}
                </p>

                {/* Nutrition Highlights Grid */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center text-[11px] mb-3 font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans">Calories</span>
                    <span className="font-bold text-slate-800">{f.calories_per_100g}</span> kcal
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans">Fiber</span>
                    <span className="font-bold text-slate-800">{f.fiber_g}</span>g
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans">Sodium</span>
                    <span className="font-bold text-slate-800">{f.sodium_mg}</span>mg
                  </div>
                </div>

                {/* Conditions Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {f.supported_conditions?.map((c) => (
                    <span
                      key={c}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {c.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Source Citation Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 truncate max-w-[170px]" title={f.evidence_source}>
                  Source: {f.evidence_source}
                </span>
                {f.source_url && (
                  <a
                    href={f.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:underline flex items-center gap-1 font-semibold shrink-0"
                  >
                    Evidence <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Utensils size={20} className="text-teal-600" />
                {editingFood ? "Edit Verified Food Record" : "Add Verified Food Record"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Food Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Steamed Palak (Spinach)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nutritional numbers per 100g */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.calories_per_100g}
                    onChange={(e) => setFormData({ ...formData, calories_per_100g: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.protein_g}
                    onChange={(e) => setFormData({ ...formData, protein_g: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fat_g}
                    onChange={(e) => setFormData({ ...formData, fat_g: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Fiber (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.fiber_g}
                    onChange={(e) => setFormData({ ...formData, fiber_g: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Sodium (mg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.sodium_mg}
                    onChange={(e) => setFormData({ ...formData, sodium_mg: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Potassium (mg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.potassium_mg}
                    onChange={(e) => setFormData({ ...formData, potassium_mg: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Rationale / Heart Benefit *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.clinical_rationale}
                  onChange={(e) => setFormData({ ...formData, clinical_rationale: e.target.value })}
                  placeholder="Explain why this food supports cardiovascular health, vascular elasticity, or lipid balance..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Supported Conditions Checklist */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cardiovascular Suitability</label>
                <div className="flex flex-wrap gap-2">
                  {conditionsList.map((c) => {
                    const active = formData.supported_conditions.includes(c.key);
                    return (
                      <button
                        type="button"
                        key={c.key}
                        onClick={() => toggleCondition(c.key)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                          active
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Evidence Citation *</label>
                  <input
                    type="text"
                    required
                    value={formData.evidence_source}
                    onChange={(e) => setFormData({ ...formData, evidence_source: e.target.value })}
                    placeholder="e.g. American Heart Association / ICMR-NIN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Citation URL</label>
                  <input
                    type="url"
                    value={formData.source_url}
                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {editingFood ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-2">Delete Food Record</h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> from the evidence-based nutrition database?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFoodCatalog;
