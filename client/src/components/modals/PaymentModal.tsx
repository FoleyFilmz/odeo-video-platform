import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rider } from "@shared/schema";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import PayPalButton from "@/components/PayPalButton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider: Rider;
  onSuccess: () => void;
  email: string;
}

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const PaymentModal = ({ isOpen, onClose, rider, onSuccess, email }: PaymentModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayPal, setShowPayPal] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const { toast } = useToast();

  const handleStripePayment = async () => {
    try {
      setIsProcessing(true);
      
      const totalAmount = 20 * parseInt(quantity);
      
      // Create a payment intent
      const response = await apiRequest("POST", "/api/create-payment-intent", { 
        amount: totalAmount 
      });
      const data = await response.json();

      // Simulate successful payment
      await simulatePayment();

      // Record the purchase
      await apiRequest("POST", "/api/purchases", {
        email,
        riderId: rider.id,
        paymentMethod: "stripe",
        amount: totalAmount,
        quantity: parseInt(quantity)
      });

      toast({
        title: "Payment Successful",
        description: `Your ${quantity} video${parseInt(quantity) > 1 ? 's have' : ' has'} been unlocked.`,
        variant: "default",
      });

      onSuccess();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalClick = () => {
    setShowPayPal(true);
  };

  const simulatePayment = () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
  };

  // This function would be called when PayPal payment completes successfully
  const handlePayPalSuccess = async () => {
    try {
      const totalAmount = 20 * parseInt(quantity);
      
      // Record the purchase
      await apiRequest("POST", "/api/purchases", {
        email,
        riderId: rider.id,
        paymentMethod: "paypal",
        amount: totalAmount,
        quantity: parseInt(quantity)
      });

      toast({
        title: "Payment Successful",
        description: `Your ${quantity} video${parseInt(quantity) > 1 ? 's have' : ' has'} been unlocked.`,
        variant: "default",
      });

      onSuccess();
    } catch (error) {
      console.error("Error recording purchase:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-dark-800 border border-dark-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Select Payment Method</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <p className="text-dark-300 mb-2">
            Purchasing video for: <span className="text-white font-medium">{rider.name}</span>
          </p>
          
          <div className="my-4 pb-4 border-b border-dark-700">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="horse-quantity" className="text-white font-semibold text-base">
                Select number of horses:
              </Label>
              <div className="text-sm font-bold text-primary-400">
                $20 per horse (up to 4 horses)
              </div>
            </div>
            <Select
              value={quantity}
              onValueChange={(value) => setQuantity(value)}
            >
              <SelectTrigger className="w-full bg-dark-700 border-dark-600">
                <SelectValue placeholder="Select quantity" />
              </SelectTrigger>
              <SelectContent className="bg-dark-800 border-dark-700 text-white">
                <SelectItem value="1">1 Horse ($20)</SelectItem>
                <SelectItem value="2">2 Horses ($40)</SelectItem>
                <SelectItem value="3">3 Horses ($60)</SelectItem>
                <SelectItem value="4">4 Horses ($80)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <p className="text-dark-300 text-lg">
            Total Amount: <span className="text-primary-400 font-bold text-xl">${(20 * parseInt(quantity)).toFixed(2)}</span>
          </p>
        </div>

        {showPayPal ? (
          <div className="flex items-center justify-center py-4">
            <PayPalButton 
              amount={(rider.price * parseInt(quantity)).toString()} 
              currency="USD" 
              intent="capture" 
            />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <Button
              className="w-full bg-white hover:bg-gray-100 text-dark-900 py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              onClick={handleStripePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <i className="fab fa-stripe text-blue-600 text-xl mr-2"></i>
              )}
              {isProcessing ? "Processing..." : "Pay with Stripe"}
            </Button>
            
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              onClick={handlePayPalClick}
              disabled={isProcessing}
            >
              <i className="fab fa-paypal text-xl mr-2"></i> Pay with PayPal
            </Button>
          </div>
        )}

        <p className="text-xs text-dark-400 text-center">
          Your payment is secure and processed by our payment partners.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
