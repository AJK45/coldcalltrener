import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TrainerProvider } from '@/components/TrainerProvider';
import { SessionContextProvider, RequireOwner } from '@/components/SessionContext';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import Knowledge from '@/pages/Knowledge';
import NewCall from '@/pages/NewCall';
import LiveCall from '@/pages/LiveCall';
import History from '@/pages/History';
import Analytics from '@/pages/Analytics';
import Coach from '@/pages/Coach';
import Library from '@/pages/Library';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import Login from '@/pages/Login';
import AuthCallback from '@/pages/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';

function OnlineWorkspace() {
  return <TrainerProvider><Layout /></TrainerProvider>;
}
export default function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/prihlasenie" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<RequireOwner />}>
              <Route element={<OnlineWorkspace />}>
                <Route path="/" element={<Index />} />
                <Route path="/novy-hovor" element={<NewCall />} />
                <Route path="/hovor/:id" element={<LiveCall />} />
                <Route path="/historia" element={<History />} />
                <Route path="/analytika" element={<Analytics />} />
                <Route path="/kouc" element={<Coach key="coach" />} />
                <Route path="/plany" element={<Coach key="plans" plans />} />
                <Route path="/podnikanie" element={<Knowledge key="businesses" />} />
                <Route path="/produkty" element={<Knowledge key="products" products />} />
                <Route path="/scenare" element={<Library />} />
                <Route path="/nastavenia" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  );
}
