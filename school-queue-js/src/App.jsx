import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Kiosk from './Kiosk';
import Counter from './Counter';
import Display from './Display';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The main Kiosk route (Default) */}
        <Route path="/" element={<Kiosk />} />
        
        {/* The Staff Dashboard */}
        <Route path="/staff" element={<Counter />} />
        
        {/* The Public TV Display */}
        <Route path="/display" element={<Display />} />

        {/* Catch-all: If someone types a weird URL, send them back to the Kiosk */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}