import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StartPage from './pages/StartPage';
import AuditChoicePage from './pages/AuditChoicePage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/audit-choice" element={<AuditChoicePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
