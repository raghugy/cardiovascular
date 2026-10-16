import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { diseases } from "../data/diseases";

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 text-gray-800 px-6 py-12 pt-28">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <motion.h1
          className="text-4xl font-bold text-center text-blue-600 mb-6"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          About Our AI Model
        </motion.h1>

        {/* Model Info */}
        <motion.p
          className="text-lg leading-relaxed text-center max-w-3xl mx-auto mb-12 text-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Our AI model uses a deep neural network trained on medical datasets with
          an accuracy of <span className="font-bold text-blue-500">92%</span>. It
          predicts the risks of five major heart diseases by analyzing patient
          health parameters. The results are displayed as{" "}
          <span className="font-bold text-red-500">Low, Moderate, or High risk</span>.
        </motion.p>

        {/* Diseases Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {diseases.map((disease, index) => (
            <motion.div
              key={disease.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              {/* Disease Image */}
              <div className="h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4">
                <img
                  src={disease.image}
                  alt={disease.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Disease Info */}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-blue-600 mb-3">
                  {disease.name}
                </h2>
                <p className="text-gray-700 text-sm mb-4 h-16 overflow-hidden">
                  {disease.description.substring(0, 150)}
                  {disease.description.length > 150 && "..."}
                </p>

                {/* Quick Info */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">
                    <span className="font-semibold">Key Parameters:</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {disease.params.slice(0, 3).map((param, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs"
                      >
                        {param}
                      </span>
                    ))}
                    {disease.params.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{disease.params.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* View Details Link */}
                <Link
                  to={`/disease/${disease.id}`}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition group"
                >
                  Learn More
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info Section */}
        <motion.div
          className="mt-12 bg-white rounded-xl shadow-lg p-8 text-center"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Ready to Assess Your Risk?
          </h2>
          <p className="text-gray-600 mb-6">
            Click on any disease above to learn more, or use our prediction tool to assess your risk.
          </p>
          <Link
            to="/prediction"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg"
          >
            Start Prediction
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default About;
