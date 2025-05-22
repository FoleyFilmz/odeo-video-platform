import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Event } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportRow {
  name: string;
  eventName: string;
  eventId?: number;
  price: number;
  videoUrl: string;
  thumbnailUrl: string;
  valid: boolean;
  error?: string;
}

// Helper function to extract YouTube thumbnail from URL
const getYouTubeThumbnail = (url: string): string | null => {
  try {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be/") 
        ? url.split("youtu.be/")[1].split("?")[0]
        : url.includes("v=")
          ? url.split("v=")[1].split("&")[0]
          : "";
      
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

const BulkImportModal = ({ isOpen, onClose }: BulkImportModalProps) => {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "results">("upload");
  const [importResults, setImportResults] = useState<{success: number, failed: number}>({ success: 0, failed: 0 });
  
  // Fetch events for matching
  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: isOpen,
  });
  
  const resetModal = () => {
    setCsvText("");
    setParsedData([]);
    setStep("upload");
    setImportResults({ success: 0, failed: 0 });
  };
  
  const handleClose = () => {
    resetModal();
    onClose();
  };
  
  const parseCSV = (csvContent: string) => {
    try {
      const lines = csvContent.split("\n");
      if (lines.length < 2) {
        throw new Error("CSV file must have at least a header row and one data row");
      }
      
      // Check for expected header format
      const headers = lines[0].toLowerCase().includes("rider name") && 
                      lines[0].toLowerCase().includes("event") &&
                      lines[0].toLowerCase().includes("price");
      
      if (!headers) {
        throw new Error("CSV headers must include 'Rider Name', 'Event', 'Price'");
      }
      
      // Skip header line
      const dataLines = lines.slice(1).filter(line => line.trim() !== "");
      
      if (dataLines.length === 0) {
        throw new Error("No data found in CSV file");
      }
      
      const parsedRows: ImportRow[] = [];
      
      for (const line of dataLines) {
        // Handle comma in quoted strings
        const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < 3) {
          parsedRows.push({
            name: "",
            eventName: "",
            price: 0,
            videoUrl: "",
            thumbnailUrl: "",
            valid: false,
            error: "Invalid CSV format"
          });
          continue;
        }
        
        const name = matches[0]?.replace(/"/g, "").trim() || "";
        const eventName = matches[1]?.replace(/"/g, "").trim() || "";
        const price = parseFloat(matches[2]?.replace(/"/g, "").trim()) || 80;
        const videoUrl = (matches[3]?.replace(/"/g, "").trim()) || "";
        let thumbnailUrl = (matches[4]?.replace(/"/g, "").trim()) || "";
        
        // Try to auto-generate thumbnail URL if empty and video URL is YouTube
        if (!thumbnailUrl && videoUrl) {
          const autoThumbnail = getYouTubeThumbnail(videoUrl);
          if (autoThumbnail) {
            thumbnailUrl = autoThumbnail;
          }
        }
        
        // Match event name to ID
        const event = events?.find(e => 
          e.name.toLowerCase() === eventName.toLowerCase()
        );
        
        // Validate the row
        let valid = true;
        let error = "";
        
        if (!name) {
          valid = false;
          error = "Missing rider name";
        } else if (!event) {
          valid = false;
          error = "Event not found";
        } else if (!videoUrl) {
          valid = false;
          error = "Missing video URL";
        }
        
        parsedRows.push({
          name,
          eventName,
          eventId: event?.id,
          price,
          videoUrl,
          thumbnailUrl,
          valid,
          error
        });
      }
      
      setParsedData(parsedRows);
      setStep("preview");
    } catch (error: any) {
      toast({
        title: "CSV Parsing Failed",
        description: error.message || "Failed to parse CSV data",
        variant: "destructive",
      });
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCSV(content);
    };
    
    reader.readAsText(file);
  };
  
  const handlePasteCSV = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvText(e.target.value);
  };
  
  const handleImport = async () => {
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    
    // Filter only valid rows
    const validRows = parsedData.filter(row => row.valid);
    
    if (validRows.length === 0) {
      toast({
        title: "Nothing to Import",
        description: "There are no valid rows to import",
        variant: "destructive",
      });
      setIsImporting(false);
      return;
    }
    
    for (const row of validRows) {
      try {
        if (!row.eventId) continue;
        
        await apiRequest("POST", "/api/riders", {
          name: row.name,
          eventId: row.eventId,
          price: row.price,
          videoUrl: row.videoUrl,
          thumbnailUrl: row.thumbnailUrl
        });
        
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    // Update results and move to final step
    setImportResults({
      success: successCount,
      failed: errorCount
    });
    
    // Refresh riders list
    queryClient.invalidateQueries({ queryKey: ["/api/riders"] });
    
    setStep("results");
    setIsImporting(false);
  };
  
  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-dark-300">Upload a CSV file with rider information or paste CSV content below.</p>
        <p className="text-xs text-dark-400">
          Expected CSV format: Rider Name, Event Name, Price, Video URL, Thumbnail URL (optional)
        </p>
        <div className="text-xs text-dark-400 bg-dark-700 p-2 rounded-md">
          <p>Example:</p>
          <code>Rider Name,Event Name,Price,Video URL,Thumbnail URL</code>
          <br />
          <code>"John Smith","Texas Barrel Racing Championship",80,"https://youtu.be/example",""</code>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="block text-dark-300 text-sm font-medium">Upload CSV File</label>
        <input
          type="file"
          accept=".csv"
          className="w-full bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          onChange={handleFileUpload}
        />
      </div>
      
      <div className="space-y-2">
        <label className="block text-dark-300 text-sm font-medium">Or Paste CSV Content</label>
        <textarea
          className="w-full h-32 bg-dark-800 border border-dark-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={csvText}
          onChange={handlePasteCSV}
          placeholder="Paste CSV content here..."
        ></textarea>
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          variant="outline"
          onClick={handleClose}
          className="border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={() => parseCSV(csvText)}
          className="bg-primary-600 hover:bg-primary-700 text-white"
          disabled={!csvText.trim()}
        >
          Parse CSV
        </Button>
      </div>
    </div>
  );
  
  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-dark-300 mb-1">Preview data to be imported:</p>
        <div className="flex justify-between">
          <p className="text-xs text-dark-400">{parsedData.length} total rows</p>
          <p className="text-xs">
            <span className="text-green-500">{parsedData.filter(row => row.valid).length} valid</span> | 
            <span className="text-red-500 ml-1">{parsedData.filter(row => !row.valid).length} invalid</span>
          </p>
        </div>
      </div>
      
      <div className="overflow-auto max-h-64 bg-dark-900 rounded-md border border-dark-700">
        <table className="min-w-full divide-y divide-dark-700">
          <thead className="bg-dark-800 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Rider</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Event</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Price</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {parsedData.map((row, index) => (
              <tr key={index} className={row.valid ? "text-white" : "text-red-400"}>
                <td className="px-3 py-2 text-xs">
                  {row.valid ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">{row.name}</td>
                <td className="px-3 py-2 text-xs">{row.eventName}</td>
                <td className="px-3 py-2 text-xs">${row.price}</td>
                <td className="px-3 py-2 text-xs">{row.error || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-end space-x-3 pt-2">
        <Button
          variant="outline"
          onClick={() => setStep("upload")}
          className="border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-white"
        >
          Back
        </Button>
        <Button
          onClick={handleImport}
          className="bg-primary-600 hover:bg-primary-700 text-white"
          disabled={parsedData.filter(row => row.valid).length === 0 || isImporting}
        >
          {isImporting ? "Importing..." : `Import ${parsedData.filter(row => row.valid).length} Riders`}
        </Button>
      </div>
    </div>
  );
  
  const renderResultsStep = () => (
    <div className="space-y-4 text-center">
      <div className="py-4">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Import Complete</h3>
        </div>
        
        <div className="bg-dark-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-dark-300 text-sm">Successfully Imported</p>
              <p className="text-2xl font-bold text-green-500">{importResults.success}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-300 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-500">{importResults.failed}</p>
            </div>
          </div>
        </div>
      </div>
      
      <Button
        onClick={handleClose}
        className="bg-primary-600 hover:bg-primary-700 text-white"
      >
        Done
      </Button>
    </div>
  );
  
  const renderCurrentStep = () => {
    switch (step) {
      case "upload":
        return renderUploadStep();
      case "preview":
        return renderPreviewStep();
      case "results":
        return renderResultsStep();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-dark-800 border border-dark-700 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Bulk Import Riders</DialogTitle>
        </DialogHeader>
        
        {renderCurrentStep()}
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportModal;