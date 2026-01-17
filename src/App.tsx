import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import MyPage from "./pages/MyPage";
import Upload from "./pages/Upload";
import VideoView from "./pages/VideoView";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import VideosListing from "./pages/VideosListing";
import Community from "./pages/Community";
import CommunityPost from "./pages/CommunityPost";
import Inquiry from "./pages/Inquiry";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/my-page" element={<MyPage />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/video/:id" element={<VideoView />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/videos/:section" element={<VideosListing />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/:id" element={<CommunityPost />} />
            <Route path="/inquiry" element={<Inquiry />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
