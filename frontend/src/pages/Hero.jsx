import React from "react";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center bg-gray-100 text-center px-6 bg-no-repeat bg-cover bg-center h-screen"
      style={{
        backgroundImage: `url("https://imgs.search.brave.com/rTq4glkZ9YioNkzAkasWgUFKsl9SYfUNnFczxkCxZ10/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/ZnJlZS1waG90by92/aWV3LWFuYXRvbWlj/LWhlYXJ0LW1vZGVs/LWVkdWNhdGlvbmFs/LXB1cnBvc2Utd2l0/aC1zdGV0aG9zY29w/ZV8yMy0yMTQ5ODk0/MzkyLmpwZz9zZW10/PWFpc19oeWJyaWQm/dz03NDAmcT04MA")`,
      }}
    >
      {/* Image */}
    <img src="/logo.png" alt="logo" className="w-[100px] h-[100px]" />

      {/* Heading */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
        Welcome to <span className="text-red-500">CardioPredict</span>
      </h1>

      {/* Subtext */}
      <p className="text-gray-600 text-lg mb-6 max-w-xl">
        AI-powered predictions and monitoring to help you prevent and detect heart diseases early.
      </p>

      {/* Button */}
      <button
        onClick={() => navigate("/login")}
        className="bg-blue-600 text-white px-8 py-3 rounded-xl text-lg font-medium hover:bg-blue-700 transition transform hover:scale-105"
      >
        Get Started
      </button>
    </div>
  );
};

export default Hero;
