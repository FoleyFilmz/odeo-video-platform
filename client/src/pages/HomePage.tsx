import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EventCard from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";

const HomePage = () => {
  const { data: events, isLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Create skeleton array for loading state
  const skeletonArray = Array(6).fill(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 to-dark-800">
      <Navbar />
      
      <div id="home" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Capturing Barrel Race Moments</h1>
          <p className="text-lg text-dark-300 max-w-3xl mx-auto">
            Professional video coverage of barrel racing events across the country. Find your ride, purchase your video.
          </p>
        </div>
        
        <div id="events" className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Featured Events
          </h2>
          
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">Failed to load events. Please try again later.</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Skeleton loading state
              skeletonArray.map((_, index) => (
                <div key={index} className="glass rounded-xl overflow-hidden">
                  <Skeleton className="w-full h-48" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </div>
                </div>
              ))
            ) : (
              // Actual events
              events?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default HomePage;
