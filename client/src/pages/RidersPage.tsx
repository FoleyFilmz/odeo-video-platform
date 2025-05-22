import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Event, Rider } from "@shared/schema";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RiderCard from "@/components/RiderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const RidersPage = () => {
  const params = useParams();
  const eventId = params.id ? parseInt(params.id) : NaN;
  const [userEmail, setUserEmail] = useState<string | null>(
    localStorage.getItem("userEmail")
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredRiders, setFilteredRiders] = useState<Rider[]>([]);

  // Get event details
  const { data: event, isLoading: isLoadingEvent } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !isNaN(eventId),
  });

  // Get riders for this event
  const { data: riders, isLoading: isLoadingRiders } = useQuery<Rider[]>({
    queryKey: ["/api/riders", { eventId }],
    enabled: !isNaN(eventId),
  });

  // Filter riders based on search query
  useEffect(() => {
    if (riders) {
      if (searchQuery.trim() === "") {
        setFilteredRiders(riders);
      } else {
        const filtered = riders.filter(rider => 
          rider.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredRiders(filtered);
      }
    }
  }, [searchQuery, riders]);

  const handleEmailCapture = (email: string) => {
    setUserEmail(email);
    localStorage.setItem("userEmail", email);
  };

  // Create skeleton array for loading state
  const skeletonArray = Array(12).fill(0);

  if (isNaN(eventId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 to-dark-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Invalid Event ID</h1>
          <Link href="/">
            <button className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors duration-200">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 to-dark-800">
      <Navbar />
      
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/">
              <button className="flex items-center text-primary-400 hover:text-primary-300 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Events
              </button>
            </Link>
            
            {isLoadingEvent ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-bold text-white">{event?.name}</h2>
                <p className="text-dark-300">{event?.date}</p>
              </>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 md:mt-0 w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
              <Input
                type="text"
                placeholder="Search riders by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-dark-800 border-dark-600 focus:border-primary-500 text-white placeholder:text-dark-400 rounded-lg w-full"
              />
            </div>
          </div>
        </div>
        
        {isLoadingRiders ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {skeletonArray.map((_, index) => (
              <div key={index} className="glass rounded-xl overflow-hidden">
                <Skeleton className="w-full h-48" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : riders && riders.length > 0 ? (
          <>
            {filteredRiders.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRiders.map((rider) => (
                  <RiderCard 
                    key={rider.id} 
                    rider={rider}
                    userEmail={userEmail}
                    onEmailCapture={handleEmailCapture}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-white mb-2">No Riders Found</h3>
                <p className="text-dark-300">No riders match your search. Try a different name.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-white mb-2">No Riders Found</h3>
            <p className="text-dark-300">There are no riders available for this event yet.</p>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default RidersPage;
