import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchClick: () => void;
  onDownloadClick: () => void;
}

const SuccessModal = ({ isOpen, onClose, onWatchClick, onDownloadClick }: SuccessModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-800 border border-dark-700 text-white max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-full bg-green-500 bg-opacity-20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Thank You For Your Purchase!</h3>
          <p className="text-dark-300 mt-2 mb-4">
            Your video has been unlocked and is now available to watch or download.
          </p>
          
          <div className="bg-dark-700 p-4 rounded-lg">
            <p className="text-white text-sm mb-2">
              If you need help downloading or experience any issues, please call us at:
            </p>
            <p className="text-primary-400 font-bold text-lg">
              (443) 890-1329
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            className="bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            onClick={onWatchClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Watch Now
          </Button>
          
          <Button
            className="bg-dark-700 hover:bg-dark-600 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            onClick={onDownloadClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download
          </Button>
        </div>
        
        <Button
          variant="outline"
          className="w-full border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-white py-2 px-4 rounded-lg transition-colors duration-200"
          onClick={onClose}
        >
          Return to Videos
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SuccessModal;
