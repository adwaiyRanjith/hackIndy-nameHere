import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModulesPage.css';

const ALL_MODULES = [
  {
    id: 'entrance',
    label: 'Entrance & Doorways',
    icon: '🚪',
    description: 'Main entrance, door widths, thresholds, hardware',
  },
  {
    id: 'corridors',
    label: 'Corridors & Hallways',
    icon: '🏛️',
    description: 'Hallway widths, obstructions, turning space',
  },
  {
    id: 'restrooms',
    label: 'Restrooms',
    icon: '🚻',
    description: 'Accessible stall, grab bars, sink height, signage',
  },
  {
    id: 'stairs',
    label: 'Stairs & Ramps',
    icon: '🪜',
    description: 'Handrails, ramp slope, step nosings, landings',
  },
  {
    id: 'parking',
    label: 'Parking Lot',
    icon: '🅿️',
    description: 'Accessible spaces, van spaces, signage, path of travel',
  },
  {
    id: 'counter',
    label: 'Service Counter',
    icon: '🏪',
    description: 'Counter height, reach range, knee clearance',
  },
  {
    id: 'elevator',
    label: 'Elevator',
    icon: '🛗',
    description: 'Door width, controls height, braille signage, floor announcements',
  },
  {
    id: 'signage',
    label: 'Signage',
    icon: '🪧',
    description: 'Braille, raised characters, mounting height, placement',
  },
];

function ModulesPage() {
  const navigate = useNavigate();
  const survey = JSON.parse(localStorage.getItem('surveyAnswers') || '{}');
  const [modules, setModules] = useState(() => {
    const saved = localStorage.getItem('auditModules');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('auditModules', JSON.stringify(modules));
  }, [modules]);

  const visibleModules = ALL_MODULES.filter((m) => {
    if (m.id === 'parking' && survey.hasParking === 'No') return false;
    if (m.id === 'elevator' && survey.hasElevator === 'No') return false;
    if (m.id === 'stairs' && survey.hasRamps === 'No') return false;
    return true;
  });

  const completedCount = Object.values(modules).filter(
    (m) => m.status === 'complete'
  ).length;

  const handleAudit = (moduleId) => {
    navigate(`/module/${moduleId}`);
  };

  const handleFinalize = () => {
    navigate('/report');
  };

  const getStatus = (moduleId) => modules[moduleId]?.status || 'pending';

  return (
    <div className="modules-container">
      <div className="modules-header">
        <div className="modules-logo">
          <span className="logo-icon">&#10003;</span>
          <span className="logo-text">Passline</span>
        </div>
        <button className="back-link" onClick={() => navigate('/survey')}>
          &#8249; Edit Survey
        </button>
      </div>

      <div className="modules-content">
        <div className="modules-top">
          <div>
            <h1 className="modules-title">Select a Module to Audit</h1>
            <p className="modules-sub">
              {survey.businessName
                ? `Auditing: ${survey.businessName}`
                : 'Choose a property component to analyze for ADA compliance.'}
            </p>
          </div>
          <div className="progress-pill">
            {completedCount} / {visibleModules.length} done
          </div>
        </div>

        <div className="module-grid">
          {visibleModules.map((mod) => {
            const status = getStatus(mod.id);
            return (
              <div
                key={mod.id}
                className={`module-card ${status === 'complete' ? 'module-complete' : ''}`}
              >
                <div className="module-icon">{mod.icon}</div>
                <div className="module-info">
                  <div className="module-label">{mod.label}</div>
                  <div className="module-desc">{mod.description}</div>
                </div>
                <div className="module-actions">
                  {status === 'complete' ? (
                    <span className="status-badge status-done">&#10003; Done</span>
                  ) : (
                    <span className="status-badge status-pending">Not started</span>
                  )}
                  <button
                    className="audit-btn"
                    onClick={() => handleAudit(mod.id)}
                  >
                    {status === 'complete' ? 'Re-audit' : 'Audit'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="finalize-section">
          <button
            className="finalize-btn"
            disabled={completedCount === 0}
            onClick={handleFinalize}
          >
            Finalize Audit &amp; Generate Report
          </button>
          {completedCount === 0 && (
            <p className="finalize-hint">Complete at least one module to generate a report.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModulesPage;
