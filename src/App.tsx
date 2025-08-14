import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Login from "./pages/Login";
import POS from "./pages/POS";
import AppLayout from "./components/Layout/AppLayout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/pos" element={
              <ProtectedRoute>
                <AppLayout>
                  <POS />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Redirect root based on auth status */}
            <Route path="/" element={
              isAuthenticated ? (
                user?.role === 'FUNCIONARIO' ? 
                  <Navigate to="/pos" replace /> : 
                  <Navigate to="/pos" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
