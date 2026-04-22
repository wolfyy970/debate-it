import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage, SetupPage, LiveDebatePage, SynthesisPage, ErrorPage } from './pages';
import './tokens.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/live/:id" element={<LiveDebatePage />} />
        <Route path="/synthesis/:id" element={<SynthesisPage />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}