import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import RidersPage from "@/pages/RidersPage";
import AdminPage from "@/pages/AdminPage";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import AdminLoginModal from "@/components/modals/AdminLoginModal";
import { useState } from "react";
import { useEffect } from "react";

function Router() {
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    const handleAdminClick = () => {
      setShowAdminModal(true);
    };

    // Listen for custom event for admin button click
    window.addEventListener("openAdminModal", handleAdminClick);

    return () => {
      window.removeEventListener("openAdminModal", handleAdminClick);
    };
  }, []);

  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/event/:id" component={RidersPage} />
        <ProtectedRoute path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>

      <AdminLoginModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
