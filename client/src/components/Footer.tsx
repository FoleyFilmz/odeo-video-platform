import { useLocation } from "wouter";

const Footer = () => {
  const [location, navigate] = useLocation();

  const handleAdminClick = () => {
    // Dispatch a custom event to open the admin modal
    window.dispatchEvent(new CustomEvent("openAdminModal"));
  };

  return (
    <footer className="mt-16 py-8 border-t border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <span className="text-xl font-bold text-white">FoleyFilmZ</span>
            <p className="text-dark-400 mt-2">Professional Barrel Racing Videography</p>
          </div>
          
          <div className="flex space-x-8">
            <a href="#" className="text-dark-400 hover:text-white transition-colors duration-200">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="text-dark-400 hover:text-white transition-colors duration-200">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="text-dark-400 hover:text-white transition-colors duration-200">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-dark-700 flex flex-col md:flex-row justify-between">
          <p className="text-dark-400 text-sm mb-4 md:mb-0">&copy; 2023 FoleyFilmZ. All rights reserved.</p>
          
          <div className="flex flex-col md:flex-row md:space-x-6 space-y-2 md:space-y-0">
            <a href="#" className="text-dark-400 hover:text-white text-sm transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="text-dark-400 hover:text-white text-sm transition-colors duration-200">Terms of Service</a>
            <button 
              onClick={handleAdminClick} 
              className="text-dark-400 hover:text-white text-sm transition-colors duration-200 text-left"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
