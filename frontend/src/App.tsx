import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App; 