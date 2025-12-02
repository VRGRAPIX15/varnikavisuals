import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import { AdminLayout } from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Clients from "./pages/admin/Clients";
import FileBrowser from "./pages/admin/FileBrowser";
import Uploads from "./pages/admin/Uploads";
import Activities from "./pages/admin/Activities";
import Settings from "./pages/admin/Settings";
import Branding from "./pages/admin/Branding";
import Webhooks from "./pages/admin/Webhooks";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="files" element={<FileBrowser />} />
            <Route path="uploads" element={<Uploads />} />
            <Route path="activities" element={<Activities />} />
            <Route path="settings" element={<Settings />} />
            <Route path="branding" element={<Branding />} />
            <Route path="webhooks" element={<Webhooks />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
