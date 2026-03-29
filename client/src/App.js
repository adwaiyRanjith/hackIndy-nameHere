import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StartPage from './pages/StartPage';
import DashboardPage from './pages/DashboardPage';
import SurveyPage from './pages/SurveyPage';
import ModulesPage from './pages/ModulesPage';
import VideoUploadPage from './pages/VideoUploadPage';
import ReportPage from './pages/ReportPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/modules" element={<ModulesPage />} />
        <Route path="/module/:moduleId" element={<VideoUploadPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
