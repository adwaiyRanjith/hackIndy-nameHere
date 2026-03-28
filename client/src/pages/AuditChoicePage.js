import { useLocation, useNavigate } from 'react-router-dom';
import './AuditChoicePage.css';

function AuditChoicePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name || 'Auditor';

  return (
    <div className="choice-container">
      <div className="choice-header">
        <h1 className="choice-title">Welcome, {name}</h1>
        <p className="choice-subtitle">What would you like to do?</p>
      </div>

      <div className="choice-cards">
        <button className="choice-card" onClick={() => navigate('/survey')}>
          <div className="choice-icon new">&#43;</div>
          <h2 className="choice-card-title">New Audit</h2>
          <p className="choice-card-desc">Start a fresh audit session</p>
        </button>

        <button className="choice-card" onClick={() => navigate('/dashboard')}>
          <div className="choice-icon past">&#128196;</div>
          <h2 className="choice-card-title">Past Audits</h2>
          <p className="choice-card-desc">View and review previous audits</p>
        </button>
      </div>
    </div>
  );
}

export default AuditChoicePage;
