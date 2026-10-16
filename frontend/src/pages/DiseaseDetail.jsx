import { motion } from "framer-motion";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDiseaseById } from "../data/diseases";
import BackButton from "../components/BackButton";

const DiseaseDetail = () => {
  const { diseaseId } = useParams();
  const navigate = useNavigate();
  const disease = getDiseaseById(diseaseId);

  if (!disease) {
    return (
      <div className="min-h-screen bg-white text-gray-800 px-8 py-12 pt-28 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Disease Not Found</h1>
          <p className="text-gray-600 mb-8">The disease you're looking for doesn't exist.</p>
          <Link
            to="/about"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to About
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 text-gray-800 px-6 py-12 pt-28">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton fallbackUrl="/about" label="Back to About" />
        </div>

        {/* Header Section */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Disease Image */}
            <motion.img
              src={disease.image}
              alt={disease.name}
              className="w-64 h-64 object-contain rounded-xl shadow-md"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            />

            {/* Disease Name and Short Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold text-blue-600 mb-4">{disease.name}</h1>
              <p className="text-xl text-gray-600 mb-4">{disease.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Detailed Information Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Causes */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Causes</h2>
            <ul className="space-y-2">
              {disease.causes.map((cause, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span className="text-gray-700">{cause}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Symptoms */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-orange-600 mb-4">Symptoms</h2>
            <ul className="space-y-2">
              {disease.symptoms.map((symptom, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span className="text-gray-700">{symptom}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Parameters Used for Prediction */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">Parameters Used for Prediction</h2>
            <div className="flex flex-wrap gap-2">
              {disease.params.map((param, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {param}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Prevention */}
          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <h2 className="text-2xl font-semibold text-green-600 mb-4">Prevention</h2>
            <ul className="space-y-2">
              {disease.prevention.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Treatment Section */}
        <motion.div
          className="bg-white rounded-xl shadow-lg p-6 mt-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-2xl font-semibold text-purple-600 mb-4">Treatment Options</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {disease.treatment.map((treatment, index) => (
              <div
                key={index}
                className="p-4 bg-purple-50 rounded-lg border border-purple-200"
              >
                <span className="text-purple-700 font-medium">{treatment}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 mt-8 text-center text-white"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold mb-4">Get Your Risk Assessment</h2>
          <p className="mb-6 text-blue-100">
            Use our AI-powered prediction tool to assess your risk for {disease.name}
          </p>
          <Link
            to="/prediction"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
          >
            Predict Your Risk
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default DiseaseDetail;

