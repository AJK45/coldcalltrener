import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TrainerProvider } from '@/components/TrainerProvider';
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

export default function App() {
  return (
    <TrainerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
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
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TrainerProvider>
  );
}
