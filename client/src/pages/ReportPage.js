import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './ReportPage.css';
import { triggerReport, getReport } from '../api';

const MODULE_LABELS = {
  entrance: 'Entrance & Doorways', hallway: 'Corridors & Hallways',
  restroom: 'Restrooms', parking: 'Parking Lot',
  elevator: 'Elevator', stairway: 'Stairs & Handrails',
  signage: 'Signage & Wayfinding', drinking_fountain: 'Drinking Fountain',
  dining: 'Dining Area', counter: 'Service Counter',
  outdoor_seating: 'Outdoor Seating', cafeteria: 'Cafeteria / Dining Hall',
  concession: 'Concession Stand', sales_floor: 'Sales Floor & Aisles',
  checkout: 'Checkout Counter', fitting_room: 'Fitting Room',
  reception: 'Reception Desk', conference_room: 'Conference Room',
  break_room: 'Break Room / Kitchen', waiting_room: 'Waiting Room',
  exam_room: 'Examination Room', patient_room: 'Patient Room',
  pharmacy: 'Pharmacy Counter', lobby: 'Hotel Lobby',
  guest_room: 'Accessible Guest Room', pool: 'Pool & Spa Area',
  fitness_center: 'Fitness Center', classroom: 'Classroom',
  gymnasium: 'Gymnasium', auditorium: 'Auditorium',
  library: 'Library', assembly_seating: 'Assembly Seating',
  stage: 'Stage Access', ticket_booth: 'Ticket / Box Office',
};

const MODULE_ICONS = {
  entrance: '🚪', hallway: '🏛️', restroom: '🚻', parking: '🅿️',
  elevator: '🛗', stairway: '🪜', signage: '🪧', drinking_fountain: '💧',
  dining: '🍽️', counter: '🏪', outdoor_seating: '🌿', cafeteria: '🥗',
  concession: '🍿', sales_floor: '🛍️', checkout: '🧾', fitting_room: '👗',
  reception: '🗂️', conference_room: '💼', break_room: '☕',
  waiting_room: '🪑', exam_room: '🩺', patient_room: '🛏️', pharmacy: '💊',
  lobby: '🏨', guest_room: '🛎️', pool: '🏊', fitness_center: '🏋️',
  classroom: '📚', gymnasium: '🏀', auditorium: '🎭', library: '📖',
  assembly_seating: '🎪', stage: '🎤', ticket_booth: '🎟️',
};

function parseCostRange(str) {
  if (!str) return [0, 0];
  const nums = str.replace(/[$,]/g, '').match(/\d+/g);
  if (!nums) return [0, 0];
  return [parseInt(nums[0]), parseInt(nums[nums.length - 1])];
}

function ReportPage() {
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(null);
  const survey = JSON.parse(localStorage.getItem('surveyAnswers') || '{}');
  const auditModules = JSON.parse(localStorage.getItem('auditModules') || '{}');

  useEffect(() => {
    const auditId = localStorage.getItem('auditId');
    if (!auditId) return;

    triggerReport(auditId)
      .then(() => {
        // Poll until PDF is ready
        const interval = setInterval(async () => {
          try {
            const report = await getReport(auditId);
            if (report.pdf_url) {
              setPdfUrl(`http://localhost:8000${report.pdf_url}`);
              clearInterval(interval);
            }
          } catch {
            // report not ready yet, keep polling
          }
        }, 3000);
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(interval), 120000);
      })
      .catch((err) => console.error('Failed to trigger report:', err));
  }, []);
  const userName = localStorage.getItem('userName') || 'Auditor';

  const completedModules = Object.entries(auditModules).filter(
    ([, data]) => data.status === 'complete'
  );

  const allFindings = completedModules.flatMap(([moduleId, data]) =>
    (data.findings || []).map((f) => ({ ...f, moduleId }))
  );

  const violations = allFindings.filter((f) => f.severity === 'violation');
  const warnings = allFindings.filter((f) => f.severity === 'warning');

  let totalLow = 0;
  let totalHigh = 0;
  allFindings.forEach((f) => {
    const [lo, hi] = parseCostRange(f.estimatedCost);
    totalLow += lo;
    totalHigh += hi;
  });

  const complianceScore =
    allFindings.length === 0
      ? 100
      : Math.max(0, Math.round(100 - violations.length * 18 - warnings.length * 6));

  const scoreColor =
    complianceScore >= 75 ? '#34c759' : complianceScore >= 45 ? '#ffd60a' : '#ff453a';

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="report-container">
      <div className="report-header">
        <div className="report-logo">
          <span className="logo-icon">&#10003;</span>
          <span className="logo-text">Passline</span>
        </div>
        <button className="new-audit-link" onClick={() => navigate('/dashboard')}>
          &#8249; Dashboard
        </button>
      </div>

      <div className="report-content">
        <div className="report-meta">
          <div>
            <h1 className="report-title">ADA Compliance Report</h1>
            <p className="report-business">
              {survey.businessName || 'Property Audit'}{' '}
              {survey.city && survey.state ? `— ${survey.city}, ${survey.state}` : ''}
            </p>
            <p className="report-date">
              Prepared by {userName} &middot; {today}
            </p>
          </div>
        </div>

        <div className="score-row">
          <div className="score-card">
            <div className="score-number" style={{ color: scoreColor }}>
              {complianceScore}
            </div>
            <div className="score-label">Compliance Score</div>
            <div className="score-sub">out of 100</div>
          </div>
          <div className="score-stats">
            <div className="stat-item">
              <span className="stat-number stat-violation">{violations.length}</span>
              <span className="stat-label">Violations</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number stat-warning">{warnings.length}</span>
              <span className="stat-label">Warnings</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">{completedModules.length}</span>
              <span className="stat-label">Modules Audited</span>
            </div>
          </div>
        </div>

        {allFindings.length > 0 && (
          <div className="cost-banner">
            <span className="cost-label">Estimated Remediation Cost</span>
            <span className="cost-range">
              ${totalLow.toLocaleString()} – ${totalHigh.toLocaleString()}
            </span>
          </div>
        )}

        {allFindings.length === 0 ? (
          <div className="pass-banner">
            <span className="pass-icon">&#10003;</span>
            <div>
              <strong>No violations found!</strong>
              <p>This property appears to meet ADA standards for all audited modules.</p>
            </div>
          </div>
        ) : (
          <div className="findings-section">
            <h2 className="section-heading">Findings by Module</h2>
            {completedModules.map(([moduleId, data]) => {
              const findings = data.findings || [];
              if (findings.length === 0) return (
                <div className="module-section" key={moduleId}>
                  <div className="module-section-header">
                    <span className="module-section-icon">{MODULE_ICONS[moduleId]}</span>
                    <span className="module-section-label">{MODULE_LABELS[moduleId] || moduleId}</span>
                    <span className="module-pass-badge">&#10003; Compliant</span>
                  </div>
                </div>
              );
              return (
                <div className="module-section" key={moduleId}>
                  <div className="module-section-header">
                    <span className="module-section-icon">{MODULE_ICONS[moduleId]}</span>
                    <span className="module-section-label">{MODULE_LABELS[moduleId] || moduleId}</span>
                    <span className="module-count">
                      {findings.filter(f => f.severity === 'violation').length} violation{findings.filter(f => f.severity === 'violation').length !== 1 ? 's' : ''},&nbsp;
                      {findings.filter(f => f.severity === 'warning').length} warning{findings.filter(f => f.severity === 'warning').length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="module-findings">
                    {findings.map((f) => (
                      <div key={f.id} className={`report-finding finding-${f.severity}`}>
                        <div className="rf-top">
                          <span className={`rf-badge badge-${f.severity}`}>
                            {f.severity === 'violation' ? 'Violation' : 'Warning'}
                          </span>
                          <span className="rf-citation">{f.citation}</span>
                        </div>
                        <div className="rf-title">{f.title}</div>
                        <div className="rf-detail">{f.detail}</div>
                        <div className="rf-cost">
                          Estimated fix cost: <strong>{f.estimatedCost}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="report-actions">
          <button className="action-btn btn-secondary" onClick={() => navigate('/modules')}>
            Continue Auditing
          </button>
          <button
            className="action-btn btn-primary"
            onClick={() => window.print()}
          >
            &#128438; Save / Print Report
          </button>
          {pdfUrl && (
            <a
              className="action-btn btn-primary"
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              download
            >
              &#128196; Download PDF Report
            </a>
          )}
        </div>

        <p className="report-disclaimer">
          This report is generated based on video analysis and is intended as a preliminary
          self-assessment only. It does not constitute a formal ADA compliance certification.
          Consult a certified ADA inspector for legally binding compliance verification.
        </p>
      </div>
    </div>
  );
}

export default ReportPage;
