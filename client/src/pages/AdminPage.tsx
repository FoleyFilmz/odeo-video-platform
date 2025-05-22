import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event, Rider } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AddEventModal from "@/components/modals/AddEventModal";
import AddRiderModal from "@/components/modals/AddRiderModal";
import BulkImportModal from "@/components/modals/BulkImportModal";

const AdminPage = () => {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAddRiderModalOpen, setIsAddRiderModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "price" | "createdAt">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Fetch events data
  const { data: events, isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Fetch riders data based on selected event
  const { data: riders, isLoading: isLoadingRiders } = useQuery<Rider[]>({
    queryKey: ["/api/riders", { eventId: selectedEventId !== "all" ? parseInt(selectedEventId) : undefined }],
  });

  // Fetch sales data
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ["/api/stats/sales"],
    enabled: user !== null,
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      toast({
        title: "Event Deleted",
        description: "The event has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Event",
        description: error.message || "There was an error deleting the event.",
      });
    },
  });

  // Delete rider mutation
  const deleteRiderMutation = useMutation({
    mutationFn: async (riderId: number) => {
      await apiRequest("DELETE", `/api/riders/${riderId}`);
    },
    onSuccess: () => {
      toast({
        title: "Rider Deleted",
        description: "The rider has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Delete Rider",
        description: error.message || "There was an error deleting the rider.",
      });
    },
  });

  const handleEventDelete = (eventId: number) => {
    if (window.confirm("Are you sure you want to delete this event? This will also delete all riders associated with this event.")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleRiderDelete = (riderId: number) => {
    if (window.confirm("Are you sure you want to delete this rider?")) {
      deleteRiderMutation.mutate(riderId);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate("/"),
    });
  };
  
  // CSV Import/Export Functions
  const handleExportCSV = () => {
    if (!riders || riders.length === 0) {
      toast({
        title: "No riders to export",
        description: "There are no riders to export to CSV.",
        variant: "destructive",
      });
      return;
    }
    
    // Filter riders based on search query and selected event
    const filteredRiders = riders.filter(rider => {
      const matchesSearch = searchQuery === "" || 
        rider.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEvent = selectedEventId === "all" || 
        rider.eventId === parseInt(selectedEventId);
      return matchesSearch && matchesEvent;
    });
    
    // Get event names for each rider
    const ridersWithEventNames = filteredRiders.map(rider => {
      const event = events?.find(e => e.id === rider.eventId);
      return {
        ...rider,
        eventName: event?.name || `Event ${rider.eventId}`
      };
    });
    
    // Create CSV content
    const headers = ["Rider Name", "Event", "Price", "Video URL", "Thumbnail URL"];
    const csvContent = [
      headers.join(","),
      ...ridersWithEventNames.map(rider => 
        [
          `"${rider.name}"`,
          `"${rider.eventName}"`,
          rider.price,
          `"${rider.videoUrl}"`,
          `"${rider.thumbnailUrl}"`
        ].join(",")
      )
    ].join("\n");
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `barrel_racing_riders_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `${filteredRiders.length} riders exported to CSV.`,
    });
  };
  
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split("\n");
        
        // Skip header line
        const dataLines = lines.slice(1).filter(line => line.trim() !== "");
        
        if (dataLines.length === 0) {
          throw new Error("No data found in CSV file");
        }
        
        // Validate that we have events to import riders into
        if (!events || events.length === 0) {
          throw new Error("No events available. Please create at least one event first.");
        }
        
        // Parse each line and create rider objects
        const importedRiders: Array<{
          name: string;
          eventName: string;
          price: number;
          videoUrl: string;
          thumbnailUrl: string;
        }> = [];
        
        for (const line of dataLines) {
          // Handle comma in quoted strings
          const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
          if (!matches || matches.length < 5) {
            continue; // Skip invalid lines
          }
          
          const name = matches[0].replace(/"/g, "").trim();
          const eventName = matches[1].replace(/"/g, "").trim();
          const price = parseFloat(matches[2]) || 80;
          const videoUrl = matches[3].replace(/"/g, "").trim();
          const thumbnailUrl = matches[4].replace(/"/g, "").trim();
          
          importedRiders.push({
            name,
            eventName,
            price,
            videoUrl,
            thumbnailUrl
          });
        }
        
        // Import each rider
        let successCount = 0;
        let errorCount = 0;
        
        for (const rider of importedRiders) {
          // Find matching event
          const event = events.find(e => 
            e.name.toLowerCase() === rider.eventName.toLowerCase()
          );
          
          if (!event) {
            errorCount++;
            continue;
          }
          
          try {
            // Create the rider
            await apiRequest("POST", "/api/riders", {
              name: rider.name,
              eventId: event.id,
              price: rider.price,
              videoUrl: rider.videoUrl,
              thumbnailUrl: rider.thumbnailUrl
            });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
        
        // Refresh riders
        queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
        
        // Show summary toast
        if (successCount > 0) {
          toast({
            title: "Import Complete",
            description: `${successCount} riders imported successfully. ${errorCount} failed.`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No riders were imported. Please check your CSV format.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Import Failed",
          description: error.message || "Failed to import CSV",
          variant: "destructive",
        });
      }
      
      // Reset file input
      e.target.value = "";
    };
    
    reader.readAsText(file);
  };

  // Calculate total stats for sales
  const totalSales = salesData?.reduce((sum, item) => sum + item.salesCount, 0) || 0;
  const totalRevenue = salesData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const averagePrice = totalSales > 0 ? totalRevenue / totalSales : 80;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="text-dark-300 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10 1h2v12h-2v-4h-3v4H8V4h2v4h3V4z" clipRule="evenodd" />
          </svg>
          Logout
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="glass rounded-xl p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Admin Controls</h3>
          
          <Tabs defaultValue="manage-events" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manage-events">Events</TabsTrigger>
              <TabsTrigger value="manage-riders">Riders</TabsTrigger>
              <TabsTrigger value="view-sales">Sales</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manage-events">
              <div className="flex justify-between items-center mb-6 mt-4">
                <h3 className="text-xl font-semibold text-white">Manage Events</h3>
                <Button 
                  onClick={() => setIsAddEventModalOpen(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Event
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                {isLoadingEvents ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="w-full h-14" />
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full bg-dark-800 rounded-lg overflow-hidden">
                    <thead>
                      <tr>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Event Name</th>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Date</th>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {events && events.length > 0 ? (
                        events.map((event) => (
                          <tr key={event.id} className="text-white">
                            <td className="py-3 px-4">{event.name}</td>
                            <td className="py-3 px-4">{event.date}</td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-red-500 hover:text-red-400"
                                  onClick={() => handleEventDelete(event.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 px-4 text-center text-dark-300">No events found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="manage-riders">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 mt-4">
                <h3 className="text-xl font-semibold text-white">Manage Riders</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => setIsBulkImportModalOpen(true)}
                    variant="outline"
                    className="text-white border-primary-600 hover:bg-primary-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" />
                      <path fillRule="evenodd" d="M3 8h14v7a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Bulk Import
                  </Button>
                  <Button 
                    onClick={handleExportCSV}
                    variant="outline"
                    className="text-white border-primary-600 hover:bg-primary-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Export CSV
                  </Button>
                  <Button 
                    onClick={() => setIsAddRiderModalOpen(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Rider
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-filter" className="block text-dark-300 mb-2">Filter by Event</Label>
                    <Select
                      value={selectedEventId}
                      onValueChange={setSelectedEventId}
                    >
                      <SelectTrigger className="bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full">
                        <SelectValue placeholder="All Events" />
                      </SelectTrigger>
                      <SelectContent className="bg-dark-800 border border-dark-600 text-white">
                        <SelectItem value="all">All Events</SelectItem>
                        {events?.map((event) => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="search-riders" className="block text-dark-300 mb-2">Search Riders</Label>
                    <div className="relative">
                      <input
                        id="search-riders"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by rider name..."
                        className="bg-dark-800 border border-dark-600 rounded-lg py-2 pl-9 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full"
                      />
                      <div className="absolute left-3 top-2.5 text-dark-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="block text-dark-300 mb-2">Sort By</Label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        if (sortField === "name") {
                          setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("name");
                          setSortDirection("asc");
                        }
                      }}
                      className={`px-3 py-1 rounded-md ${
                        sortField === "name" 
                          ? "bg-primary-600 text-white" 
                          : "bg-dark-700 text-dark-300 hover:bg-dark-600"
                      }`}
                    >
                      Name {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => {
                        if (sortField === "price") {
                          setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("price");
                          setSortDirection("asc");
                        }
                      }}
                      className={`px-3 py-1 rounded-md ${
                        sortField === "price" 
                          ? "bg-primary-600 text-white" 
                          : "bg-dark-700 text-dark-300 hover:bg-dark-600"
                      }`}
                    >
                      Price {sortField === "price" && (sortDirection === "asc" ? "↑" : "↓")}
                    </button>
                    <button
                      onClick={() => {
                        if (sortField === "createdAt") {
                          setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                        } else {
                          setSortField("createdAt");
                          setSortDirection("asc");
                        }
                      }}
                      className={`px-3 py-1 rounded-md ${
                        sortField === "createdAt" 
                          ? "bg-primary-600 text-white" 
                          : "bg-dark-700 text-dark-300 hover:bg-dark-600"
                      }`}
                    >
                      Date {sortField === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                {isLoadingRiders ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="w-full h-14" />
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full bg-dark-800 rounded-lg overflow-hidden">
                    <thead>
                      <tr>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Rider Name</th>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Event</th>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Price</th>
                        <th className="py-3 px-4 text-left text-dark-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {riders && riders.length > 0 ? (
                        [...riders]
                          // Filter by search query
                          .filter(rider => 
                            searchQuery === "" || 
                            rider.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          // Sort riders based on selected field and direction
                          .sort((a, b) => {
                            if (sortField === "name") {
                              return sortDirection === "asc" 
                                ? a.name.localeCompare(b.name)
                                : b.name.localeCompare(a.name);
                            } else if (sortField === "price") {
                              return sortDirection === "asc" 
                                ? a.price - b.price
                                : b.price - a.price;
                            } else if (sortField === "createdAt") {
                              const aDate = new Date(a.createdAt);
                              const bDate = new Date(b.createdAt);
                              return sortDirection === "asc" 
                                ? aDate.getTime() - bDate.getTime()
                                : bDate.getTime() - aDate.getTime();
                            }
                            return 0;
                          })
                          .map((rider) => {
                            const riderEvent = events?.find(e => e.id === rider.eventId);
                            return (
                              <tr key={rider.id} className="text-white">
                                <td className="py-3 px-4">{rider.name}</td>
                                <td className="py-3 px-4">{riderEvent?.name || `Event ${rider.eventId}`}</td>
                                <td className="py-3 px-4">${rider.price.toFixed(2)}</td>
                                <td className="py-3 px-4">
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-red-500 hover:text-red-400"
                                      onClick={() => handleRiderDelete(rider.id)}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 px-4 text-center text-dark-300">No riders found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="view-sales">
              <h3 className="text-xl font-semibold text-white mb-6 mt-4">Sales Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-dark-800 rounded-lg p-4">
                  <p className="text-dark-300 text-sm">Total Sales</p>
                  {isLoadingSales ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-white">{totalSales}</p>
                  )}
                </div>
                
                <div className="bg-dark-800 rounded-lg p-4">
                  <p className="text-dark-300 text-sm">Total Revenue</p>
                  {isLoadingSales ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                  )}
                </div>
                
                <div className="bg-dark-800 rounded-lg p-4">
                  <p className="text-dark-300 text-sm">Average Price</p>
                  {isLoadingSales ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-white">{formatCurrency(averagePrice)}</p>
                  )}
                </div>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-4 mb-8">
                <h4 className="text-lg font-semibold text-white mb-4">Top Events by Revenue</h4>
                {isLoadingSales ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="w-full h-14" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr>
                          <th className="py-3 px-4 text-left text-dark-300 font-medium">Event</th>
                          <th className="py-3 px-4 text-left text-dark-300 font-medium">Videos Sold</th>
                          <th className="py-3 px-4 text-left text-dark-300 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {salesData && salesData.length > 0 ? (
                          salesData
                            .sort((a, b) => b.revenue - a.revenue)
                            .map((item) => (
                              <tr key={item.eventId} className="text-white">
                                <td className="py-3 px-4">{item.eventName}</td>
                                <td className="py-3 px-4">{item.salesCount}</td>
                                <td className="py-3 px-4">{formatCurrency(item.revenue)}</td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 px-4 text-center text-dark-300">No sales data available.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Main content area */}
        <div className="glass rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Welcome, {user?.username}</h3>
              <p className="text-dark-300">Manage your rodeo video platform</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-white mb-4">Quick Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-300 text-sm">Total Events</p>
                    {isLoadingEvents ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-white">{events?.length || 0}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary-600 bg-opacity-20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-300 text-sm">Total Riders</p>
                    {isLoadingRiders ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-white">{riders?.length || 0}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary-600 bg-opacity-20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>
            <div className="bg-dark-800 rounded-lg p-4">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white">Welcome to the FoleyFilmZ admin panel</p>
                    <p className="text-dark-300 text-sm">Here you can manage events, riders, and view sales data for your rodeo video platform.</p>
                    <p className="text-dark-400 text-xs mt-1">Just now</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white">Getting Started</p>
                    <p className="text-dark-300 text-sm">Use the tabs on the left to navigate between different management sections.</p>
                    <p className="text-dark-400 text-xs mt-1">1 minute ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddEventModal isOpen={isAddEventModalOpen} onClose={() => setIsAddEventModalOpen(false)} />
      <AddRiderModal isOpen={isAddRiderModalOpen} onClose={() => setIsAddRiderModalOpen(false)} />
      <BulkImportModal isOpen={isBulkImportModalOpen} onClose={() => setIsBulkImportModalOpen(false)} />
    </div>
  );
};

export default AdminPage;
