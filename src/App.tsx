import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';
import Landing from "./pages/Landing";
import Story from "./pages/Story";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Sessions from "./pages/Sessions";
import Workspaces from "./pages/Workspaces";
import ApiKeys from "./pages/ApiKeys";
import AdminDashboard from "./pages/AdminDashboard";
import NotificationTest from "./pages/NotificationTest";
import NotFound from "./pages/NotFound";
import VoiceYourChaos from "./pages/steps/VoiceYourChaos";
import WatchItVisualize from "./pages/steps/WatchItVisualize";
import AnswerQuestions from "./pages/steps/AnswerQuestions";
import GetBreakthrough from "./pages/steps/GetBreakthrough";

const queryClient = new QueryClient();

const App = () => (
  <I18nextProvider i18n={i18n}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/story" element={<Story />} />
              <Route path="/steps/voice" element={<VoiceYourChaos />} />
              <Route path="/steps/visualize" element={<WatchItVisualize />} />
              <Route path="/steps/questions" element={<AnswerQuestions />} />
              <Route path="/steps/breakthrough" element={<GetBreakthrough />} />
              <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
              <Route path="/workspaces" element={<ProtectedRoute><Workspaces /></ProtectedRoute>} />
              <Route path="/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/notification-test" element={<NotificationTest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </I18nextProvider>
);

export default App;