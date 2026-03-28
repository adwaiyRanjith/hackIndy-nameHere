import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

function DashboardPage() {
  const navigate = useNavigate();
  const name = localStorage.getItem('userName') || 'there';

  const survey = JSON.parse(localStorage.getItem('surveyAnswers') || 'null');
  const auditModules = JSON.parse(localStorage.getItem('auditModules') || '{}');
  const completedModules = Object.values(auditModules).filter((m) => m.status === 'complete');
  const allFindings = completedModules.flatMap((m) => m.findings || []);
  const violationCount = allFindings.filter((f) => f.severity === 'violation').length;
  const hasCompletedAudit = survey && completedModules.length > 0;

  const handleStartNewAudit = () => {
    localStorage.removeItem('surveyAnswers');
    localStorage.removeItem('auditModules');
    navigate('/survey');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <span className="logo-icon">&#10003;</span>
          <span className="logo-text">Passline</span>
        </div>
        <button className="new-audit-btn" onClick={handleStartNewAudit}>
          + New Audit
        </button>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1 className="welcome-heading">Welcome back, {name}</h1>
          <p className="welcome-sub">
            Start a new ADA compliance audit or review a previous one.
          </p>
        </div>

        <div className="cta-card" onClick={handleStartNewAudit}>
          <div className="cta-icon">&#43;</div>
          <div className="cta-text">
            <h2>Start New Audit</h2>
            <p>Audit a new property for ADA compliance violations</p>
          </div>
          <span className="cta-arrow">&#8250;</span>
        </div>

        <div className="previous-section">
          <h3 className="previous-heading">Previous Audits</h3>
          {hasCompletedAudit ? (
            <div className="audit-list">
              <div className="audit-card">
                <div className="audit-card-left">
                  <div className="audit-business">{survey.businessName || 'Unnamed Property'}</div>
                  <div className="audit-meta">
                    {survey.city && survey.state ? `${survey.city}, ${survey.state}` : survey.buildingType || ''}&nbsp;&middot;&nbsp;{completedModules.length} module{completedModules.length !== 1 ? 's' : ''} audited
                  </div>
                </div>
                <div className="audit-card-right">
                  <span className={`audit-badge ${violationCount === 0 ? 'badge-pass' : 'badge-fail'}`}>
                    {violationCount === 0 ? 'Compliant' : `${violationCount} violation${violationCount !== 1 ? 's' : ''}`}
                  </span>
                  <button className="view-report-btn" onClick={() => navigate('/report')}>
                    View Report
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-audits">No completed audits yet. Start one above!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
