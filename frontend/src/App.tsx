import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ResearchProvider } from "@/context/ResearchContext";
import Home from "./pages/Home";
import Session from "./pages/Session";
import NotFound from "./pages/NotFound";
import { useHealthCheck } from "@/hooks/useHealthCheck";

const AppContent = () => {
  useHealthCheck();
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex h-12 items-center border-b px-4">
        <Link to="/" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
          AI Research Assistant
        </Link>
      </header>
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session" element={<Session />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ResearchProvider>
          <AppContent />
        </ResearchProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
