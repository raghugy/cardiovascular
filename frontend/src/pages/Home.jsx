import React from 'react';
import { motion } from "framer-motion";
import { NavLink } from 'react-router-dom';
import { TypeAnimation } from 'react-type-animation';

const Home = () => {
  return (
    <div>
      <div
        className="w-full h-screen bg-cover bg-center flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url('https://imgs.search.brave.com/YEf7buRJXXymqxypPcMpBnpItJmkV5FPdaDhJySnCtE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMTIx/NTk1NTEzOC9waG90/by9oZWFydC1kaXNl/YXNlLWhlYXJ0LWRp/c2Vhc2UtY2VudGVy/LWhlYWx0aC1pbnN1/cmFuY2UuanBnP3M9/NjEyeDYxMiZ3PTAm/az0yMCZjPXZpTjhz/em9xMjluaVUzS05N/anJ6U3JmTXI5cTla/cGNOeEtyQ2lPazN4/bWs9')`,
        }}
      >
        {/* Dark overlay for readability */}

        {/* Center Content */}
        <motion.div
          className="relative z-10 max-w-3xl mr-200 w-full bg-white/20 backdrop-blur-lg shadow-2xl rounded-2xl p-10 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <TypeAnimation 
            className="text-2xl md:text-3xl font-extrabold text-blue-700 mb-8 leading-snug drop-shadow-md"
            sequence={[
              'Predicting 5 Major Heart Diseases using AI',
              1000,
              'Predicting Coronary Artery Diseases using AI',
              1000,
              'Predicting Heart Failure using AI',
              1000,
              'Predicting Stroke using AI',
              1000,
              'Predicting Heart Attack using AI',
              1000,
              'Predicting Hypertension using AI',
              1000
            ]}
            wrapper="span"
            speed={50}
            style={{ display: 'inline-block' }}
            repeat={Infinity}
          />

          <p className="text-gray-800 text-lg md:text-xl font-medium leading-relaxed mb-8">
            Our intelligent prediction model helps identify the risk of five major 
            <span className="text-red-600 font-semibold "> heart-related conditions </span>
            at an early stage:
          </p>

          {/* Disease Links */}
          <div className="grid gap-4 mb-6">
            <NavLink
              to="/disease/coronary-artery-disease"
              className="block bg-red-100 hover:bg-red-200 text-red-700 font-semibold px-6 py-4 rounded-xl shadow-md transition transform hover:scale-105"
            >
              ❤️ Coronary Artery Disease
            </NavLink>

            <NavLink
              to="/disease/heart-failure"
              className="block bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-6 py-4 rounded-xl shadow-md transition transform hover:scale-105"
            >
              💔 Heart Failure
            </NavLink>

            <NavLink
              to="/disease/heart-attack"
              className="block bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-semibold px-6 py-4 rounded-xl shadow-md transition transform hover:scale-105"
            >
              ⚡ Heart Attack
            </NavLink>

            <NavLink
              to="/disease/stroke"
              className="block bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold px-6 py-4 rounded-xl shadow-md transition transform hover:scale-105"
            >
              🧠 Stroke
            </NavLink>

            <NavLink
              to="/disease/hypertension"
              className="block bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-6 py-4 rounded-xl shadow-md transition transform hover:scale-105"
            >
              🫀 Hypertensive Heart Disease
            </NavLink>
          </div>

          <p className="mt-4 text-gray-700 text-lg italic">
            Take the first step towards a <span className="text-red-600 font-semibold">healthier heart </span> 
            by using our <span className="prata-regular text-blue-600 font-semibold">AI-powered prediction model</span>.
          </p>
        </motion.div>
      </div>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 px-6 md:px-16 py-12">
        {/* Model Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center mb-16"
        >
          <h2 className="text-4xl font-extrabold text-blue-700 mb-6 drop-shadow-md">
            Our AI Prediction Model
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            We use a <span className="prata-regular text-blue-600 font-semibold">Neural Network 
            with Ensemble Learning</span> to predict five major heart diseases. 
            Our model has been trained on multiple datasets and achieves an 
            average accuracy of <span className="prata-regular font-bold text-green-600">92–95%</span>.
          </p>
          <p className="text-gray-700 text-lg italic">
            Predictions are presented as a <span className="prata-regular text-red-600 font-semibold">risk score</span> 
            (Low, Moderate, High), making it easier for users to understand their condition.
          </p>
        </motion.div>

        {/* Disease Cards Section */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Coronary Artery Disease */}
          <NavLink to="/disease/coronary-artery-disease" className="block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-red-50 border border-red-200 shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
            >
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                ❤️ Coronary Artery Disease
              </h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Cholesterol Levels</li>
                <li>Blood Pressure</li>
                <li>ECG Results</li>
                <li>Smoking History</li>
              </ul>
              <p className="text-gray-600 text-sm mb-4">
                Results are displayed as <span className="prata-regular font-semibold">Risk Level (Low / Moderate / High)</span>.
              </p>
              <div className="text-red-600 font-semibold hover:underline">
                Learn More →
              </div>
            </motion.div>
          </NavLink>

          {/* Heart Failure */}
          <NavLink to="/disease/heart-failure" className="block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-blue-50 border border-blue-200 shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
            >
              <h3 className="text-2xl font-bold text-blue-600 mb-4">
                💔 Heart Failure
              </h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Ejection Fraction</li>
                <li>Serum Creatinine</li>
                <li>Age</li>
                <li>Diabetes Status</li>
              </ul>
              <p className="text-gray-600 text-sm mb-4">
                Displays <span className="prata-regular font-semibold">Heart Efficiency & Risk Score</span>.
              </p>
              <div className="text-blue-600 font-semibold hover:underline">
                Learn More →
              </div>
            </motion.div>
          </NavLink>

          {/* Heart Attack */}
          <NavLink to="/disease/heart-attack" className="block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-yellow-50 border border-yellow-200 shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
            >
              <h3 className="text-2xl font-bold text-yellow-600 mb-4">
                ⚡ Heart Attack
              </h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Chest Pain Type</li>
                <li>Blood Sugar Levels</li>
                <li>Resting ECG</li>
                <li>Exercise Induced Angina</li>
              </ul>
              <p className="text-gray-600 text-sm mb-4">
                Predicts probability of <span className="prata-regular font-semibold">Myocardial Infarction</span>.
              </p>
              <div className="text-yellow-600 font-semibold hover:underline">
                Learn More →
              </div>
            </motion.div>
          </NavLink>

          {/* Stroke */}
          <NavLink to="/disease/stroke" className="block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-purple-100 border border-purple-200 shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
            >
              <h3 className="text-2xl font-bold text-purple-600 mb-4">
                🧠 Stroke
              </h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Smoking Status</li>
                <li>Work Type</li>
                <li>Glucose Level</li>
                <li>Hypertension History</li>
              </ul>
              <p className="text-gray-600 text-sm mb-4">
                Displays <span className="prata-regular font-semibold">Stroke Risk Score</span> with lifestyle factors.
              </p>
              <div className="text-purple-600 font-semibold hover:underline">
                Learn More →
              </div>
            </motion.div>
          </NavLink>

          {/* Hypertension */}
          <NavLink to="/disease/hypertension" className="block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-green-100 border border-green-200 shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-shadow"
            >
              <h3 className="text-2xl font-bold text-green-600 mb-4">
                🫀 Hypertensive Heart Disease
              </h3>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Blood Pressure</li>
                <li>Age</li>
                <li>BMI</li>
                <li>Family History</li>
              </ul>
              <p className="text-gray-600 text-sm mb-4">
                Provides <span className="prata-regular font-semibold">Hypertension Severity Score</span>.
              </p>
              <div className="text-green-600 font-semibold hover:underline">
                Learn More →
              </div>
            </motion.div>
          </NavLink>
        </div>
      </div>

      <section className="w-full bg-red-500 py-16 flex justify-center items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl px-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Take the First Step Towards a Healthier Heart ❤️
          </h2>
          <p className="text-lg text-gray-100 mb-8">
            Use our AI-powered prediction model to detect early signs of heart diseases 
            and make informed health decisions today.
          </p>
          <motion.a
            href="/prediction"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-red-600 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-gray-100 transition"
          >
            Try Prediction Now
          </motion.a>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;
