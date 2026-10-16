import React from 'react'
import { NavLink } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="w-full bg-gray-100 text-red-500 py-6">
      <div className="max-w-6xl mx-auto px-6">
        {/* Top Section */}
        <div className="flex justify-between items-center">
          
          {/* Logo Left */}
          <div className="flex items-center gap-2 text-2xl font-bold text-blue-600 ml-[-300px] mt-[65px]">
            <img src="/logo.png" alt="logo" className="w-[40px] h-[40px]" />
            <h1>CardioPredict</h1>
          </div>

          {/* Awareness Message Center */}
          <div className="max-w-xl text-center mx-auto px-6 mt-[20px] mr-[150px]">
            <p className="text-lg leading-relaxed font-medium text-red-400">
              ❤️ A healthy heart is the foundation of a healthy life.  
              Regular checkups, balanced diet, and early detection can save lives.  
              Together, let’s take one step closer towards preventing heart diseases.
            </p>
          </div>

          {/* Navigation Links Right */}
          <div className="flex flex-col gap-2 text-blue-400">
            <NavLink to="/" className="hover:text-red-400 transition">Home</NavLink>
            <NavLink to="/about" className="hover:text-red-400 transition">About</NavLink>
            <NavLink to="/contact" className="hover:text-red-400 transition">Contact</NavLink>
            <NavLink to="/prediction" className="hover:text-red-400 transition">Prediction</NavLink>
          </div>
        </div>

        {/* Separator */}
        <hr className="border-gray-300 my-4 w-2/3 mx-auto" />

        {/* Copyright */}
        <p className="text-sm text-blue-500 text-center">
          © {new Date().getFullYear()} CardioPredict. All rights reserved.
        </p>
      </div>
    </footer>

  )
}

export default Footer