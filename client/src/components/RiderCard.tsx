import { Rider } from "@shared/schema";
import { useState } from "react";
import EmailModal from "@/components/modals/EmailModal";
import PaymentModal from "@/components/modals/PaymentModal";
import SuccessModal from "@/components/modals/SuccessModal";
import VideoModal from "@/components/modals/VideoModal";
import { useQuery } from "@tanstack/react-query";

interface RiderCardProps {
  rider: Rider;
  userEmail: string | null;
  onEmailCapture: (email: string) => void;
}

const RiderCard = ({ rider, userEmail, onEmailCapture }: RiderCardProps) => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  // Check if video is already purchased when email is available
  const { data: purchaseStatus } = useQuery({
    queryKey: ["/api/purchases/check", { email: userEmail, riderId: rider.id }],
    queryFn: async () => {
      if (!userEmail) return { purchased: false };
      const res = await fetch(`/api/purchases/check?email=${userEmail}&riderId=${rider.id}`);
      return res.json();
    },
    enabled: !!userEmail,
  });

  // If purchase status changes, update the hasPurchased state
  if (purchaseStatus?.purchased && !hasPurchased) {
    setHasPurchased(true);
  }

  const handleUnlockClick = () => {
    // Always require email confirmation before purchase
    setIsEmailModalOpen(true);
  };

  const handleEmailSubmit = (email: string) => {
    onEmailCapture(email);
    setIsEmailModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentModalOpen(false);
    setHasPurchased(true);
    setIsSuccessModalOpen(true);
  };

  const handleWatchClick = () => {
    setIsVideoModalOpen(true);
  };

  const handleDownloadClick = () => {
    // Trigger download
    const link = document.createElement('a');
    link.href = rider.videoUrl;
    link.download = `${rider.name.replace(/\s+/g, '_')}_video.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="video-card glass rounded-xl overflow-hidden relative">
        <div className="relative">
          <img 
            src={rider.thumbnailUrl} 
            alt={`${rider.name}'s run`}
            className="w-full h-48 object-cover"
          />
          {!hasPurchased && (
            <div className="locked-overlay absolute inset-0 flex items-center justify-center">
              <i className="fas fa-lock text-4xl text-white opacity-80"></i>
            </div>
          )}
          {hasPurchased && (
            <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              <i className="fas fa-unlock mr-1"></i> Unlocked
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-xl font-semibold text-white">{rider.name}</h3>
          <div className="flex justify-between items-center mt-2 mb-4">
            <div className="text-dark-300 text-sm">Barrel Racing</div>
            {hasPurchased ? (
              <div className="text-green-500 font-semibold">
                <i className="fas fa-check-circle mr-1"></i> Purchased
              </div>
            ) : (
              <div className="text-primary-400 font-semibold">${rider.price.toFixed(2)}</div>
            )}
          </div>
          
          {hasPurchased ? (
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleWatchClick}
                className="bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
              >
                <i className="fas fa-play mr-1"></i> Watch
              </button>
              <button 
                onClick={handleDownloadClick}
                className="bg-dark-700 hover:bg-dark-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
              >
                <i className="fas fa-download mr-1"></i> Download
              </button>
            </div>
          ) : (
            <button 
              onClick={handleUnlockClick}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Unlock Video
            </button>
          )}
        </div>
      </div>

      <EmailModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
        onSubmit={handleEmailSubmit}
      />

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        rider={rider}
        onSuccess={handlePaymentSuccess}
        email={userEmail || ''}
      />

      <SuccessModal 
        isOpen={isSuccessModalOpen} 
        onClose={() => setIsSuccessModalOpen(false)}
        onWatchClick={handleWatchClick}
        onDownloadClick={handleDownloadClick}
      />

      <VideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)}
        rider={rider}
      />
    </>
  );
};

export default RiderCard;
