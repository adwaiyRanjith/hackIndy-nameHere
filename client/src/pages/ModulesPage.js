import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModulesPage.css';
import { getAudit } from '../api';

const MODULE_META = {
  entrance:          { label: 'Entrance & Doorways',       icon: '🚪', description: 'Door width, hardware, threshold, signage, ramps' },
  hallway:           { label: 'Corridors & Hallways',      icon: '🏛️', description: 'Hallway widths, obstructions, floor surface, signage' },
  restroom:          { label: 'Restrooms',                 icon: '🚻', description: 'Grab bars, faucet, door swing, clearance, mirror' },
  parking:           { label: 'Parking Lot',               icon: '🅿️', description: 'Accessible spaces, signage, access aisles, curb ramps' },
  elevator:          { label: 'Elevator',                  icon: '🛗', description: 'Call button height, cab size, controls, braille' },
  stairway:          { label: 'Stairs & Handrails',        icon: '🪜', description: 'Handrail height, extensions, nosing contrast' },
  signage:           { label: 'Signage & Wayfinding',      icon: '🪧', description: 'Height, braille, high contrast, mounting location' },
  drinking_fountain: { label: 'Drinking Fountain',         icon: '💧', description: 'Spout height, knee clearance, hi-lo units' },
  dining:            { label: 'Dining Area',               icon: '🍽️', description: 'Table heights, aisle widths, accessible seating' },
  counter:           { label: 'Service Counter',           icon: '🏪', description: 'Counter height, accessible section, approach clearance' },
  outdoor_seating:   { label: 'Outdoor Seating',           icon: '🌿', description: 'Surface, route from entrance, accessible tables' },
  cafeteria:         { label: 'Cafeteria / Dining Hall',   icon: '🥗', description: 'Food line height, tray slide, aisle widths' },
  concession:        { label: 'Concession Stand',          icon: '🍿', description: 'Counter height, accessible section, queue setup' },
  sales_floor:       { label: 'Sales Floor & Aisles',      icon: '🛍️', description: 'Aisle width, protruding displays, accessible route' },
  checkout:          { label: 'Checkout Counter',          icon: '🧾', description: 'Counter height, PIN pad reach, queue width' },
  fitting_room:      { label: 'Fitting Room',              icon: '👗', description: 'Door width, turning space, bench height' },
  reception:         { label: 'Reception Desk',            icon: '🗂️', description: 'Counter height, accessible section, approach space' },
  conference_room:   { label: 'Conference Room',           icon: '💼', description: 'Door width, table height, knee clearance, turning space' },
  break_room:        { label: 'Break Room / Kitchen',      icon: '☕', description: 'Counter heights, sink clearance, appliance reach' },
  waiting_room:      { label: 'Waiting Room',              icon: '🪑', description: 'Wheelchair spaces, aisle widths, check-in counter' },
  exam_room:         { label: 'Examination Room',          icon: '🩺', description: 'Exam table height, door width, turning space' },
  patient_room:      { label: 'Patient Room',              icon: '🛏️', description: 'Bed clearance, bathroom access, call button' },
  pharmacy:          { label: 'Pharmacy Counter',          icon: '💊', description: 'Counter height, consultation window, PIN pad' },
  lobby:             { label: 'Hotel Lobby',               icon: '🏨', description: 'Check-in desk height, route to elevator, seating' },
  guest_room:        { label: 'Accessible Guest Room',     icon: '🛎️', description: 'Bed clearance, roll-in shower, grab bars, controls' },
  pool:              { label: 'Pool & Spa Area',            icon: '🏊', description: 'Pool lift or sloped entry, deck surface, locker access' },
  fitness_center:    { label: 'Fitness Center',            icon: '🏋️', description: 'Equipment aisles, accessible machines, locker heights' },
  classroom:         { label: 'Classroom',                 icon: '📚', description: 'Desk aisles, accessible desk, whiteboard reach' },
  gymnasium:         { label: 'Gymnasium',                 icon: '🏀', description: 'Accessible seating, route to floor, locker access' },
  auditorium:        { label: 'Auditorium',                icon: '🎭', description: 'Wheelchair spaces, companion seats, stage access' },
  library:           { label: 'Library',                   icon: '📖', description: 'Aisle widths, shelf reach, study tables, checkout' },
  assembly_seating:  { label: 'Assembly Seating',          icon: '🎪', description: 'Wheelchair spaces, companion seats, sight lines' },
  stage:             { label: 'Stage Access',              icon: '🎤', description: 'Ramp or lift, handrails, approach clearance' },
  ticket_booth:      { label: 'Ticket / Box Office',       icon: '🎟️', description: 'Counter height, accessible window, approach space' },
};

function ModulesPage() {
  const navigate = useNavigate();
  const survey = JSON.parse(localStorage.getItem('surveyAnswers') || '{}');
  const auditId = localStorage.getItem('auditId');

  const [applicableModules, setApplicableModules] = useState([]);
  const [moduleStatusMap, setModuleStatusMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auditId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const audit = await getAudit(auditId);
        if (cancelled) return;

        if (audit.applicable_modules?.length) {
          setApplicableModules(audit.applicable_modules);
        }

        const statusMap = {};
        for (const m of audit.modules || []) {
          const existing = statusMap[m.module_type];
          // Prefer complete modules; among equal status keep the most recent (last pushed)
          if (!existing || m.status === 'complete' || existing.status !== 'complete') {
            statusMap[m.module_type] = m;
          }
        }
        setModuleStatusMap(statusMap);

        // Sync to localStorage so ReportPage can read findings
        // Merge into existing — never erase findings saved by VideoUploadPage
        const existingLocal = JSON.parse(localStorage.getItem('auditModules') || '{}');
        for (const [type, m] of Object.entries(statusMap)) {
          if (m.status === 'complete') {
            existingLocal[type] = existingLocal[type] || { status: 'complete', findings: [] };
          }
        }
        localStorage.setItem('auditModules', JSON.stringify(existingLocal));
      } catch (err) {
        console.error('Failed to load audit:', err);
      }
      if (!cancelled) setLoading(false);
    }

    poll();
    const interval = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auditId]);

  const completedCount = Object.values(moduleStatusMap).filter(
    (m) => m.status === 'complete'
  ).length;

  const getStatus = (moduleType) => moduleStatusMap[moduleType]?.status || 'pending';

  const getViolationCount = (moduleType) => {
    const m = moduleStatusMap[moduleType];
    return m?.violations?.length ?? 0;
  };

  if (loading) {
    return (
      <div className="modules-container">
        <div className="modules-header">
          <div className="modules-logo">
            <span className="logo-icon">&#10003;</span>
            <span className="logo-text">Passline</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', paddingTop: '80px', color: 'var(--overlay0)' }}>
          Loading modules...
        </div>
      </div>
    );
  }

  return (
    <div className="modules-container">
      <div className="modules-header">
        <button className="modules-logo" onClick={() => navigate('/audit-choice')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: 0 }}>
          <span className="logo-icon">&#10003;</span>
          <span className="logo-text">Passline</span>
        </button>
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
            {completedCount} / {applicableModules.length} done
          </div>
        </div>

        <div className="module-grid">
          {applicableModules.map((moduleType) => {
            const meta = MODULE_META[moduleType] || { label: moduleType, icon: '📷', description: '' };
            const status = getStatus(moduleType);
            const violationCount = getViolationCount(moduleType);

            return (
              <div
                key={moduleType}
                className={`module-card ${status === 'complete' ? 'module-complete' : ''}`}
              >
                <div className="module-icon">{meta.icon}</div>
                <div className="module-info">
                  <div className="module-label">{meta.label}</div>
                  <div className="module-desc">{meta.description}</div>
                  {status === 'complete' && violationCount > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--red)' }}>
                      {violationCount} violation{violationCount !== 1 ? 's' : ''} found
                    </div>
                  )}
                  {status === 'complete' && violationCount === 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--green)' }}>
                      No violations
                    </div>
                  )}
                </div>
                <div className="module-actions">
                  {status === 'complete' ? (
                    <span className="status-badge status-done">&#10003; Done</span>
                  ) : status === 'pending' ? (
                    <span className="status-badge status-pending">Not started</span>
                  ) : (
                    <span className="status-badge status-pending" style={{ color: 'var(--lavender)' }}>
                      Processing...
                    </span>
                  )}
                  <button
                    className="audit-btn"
                    onClick={() => navigate(`/module/${moduleType}`)}
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
            onClick={() => navigate('/report')}
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
