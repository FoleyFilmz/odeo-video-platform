import { useState } from "react";
import { Link } from "wouter";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-dark-900 border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-white tracking-wider">FoleyFilmZ</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <a href="#events" className="text-dark-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors duration-200">Events</a>
            <a href="#" className="text-dark-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors duration-200">About</a>
            <a href="#" className="text-dark-200 hover:text-white px-3 py-2 text-sm font-medium transition-colors duration-200">Contact</a>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-dark-300 hover:text-white"
            >
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-dark-800 border-b border-dark-700`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <a href="#events" className="text-dark-200 hover:text-white block px-3 py-2 text-base font-medium">Events</a>
          <a href="#" className="text-dark-200 hover:text-white block px-3 py-2 text-base font-medium">About</a>
          <a href="#" className="text-dark-200 hover:text-white block px-3 py-2 text-base font-medium">Contact</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
