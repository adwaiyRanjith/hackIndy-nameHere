import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModulesPage.css';
import { getAudit, createModule, renameModule } from '../api';

const MODULE_META = {
  entrance:          { label: 'Entrance & Doorways',       icon: '🚪' },
  hallway:           { label: 'Corridors & Hallways',      icon: '🏛️' },
  restroom:          { label: 'Restrooms',                 icon: '🚻' },
  parking:           { label: 'Parking Lot',               icon: '🅿️' },
  elevator:          { label: 'Elevator',                  icon: '🛗' },
  stairway:          { label: 'Stairs & Handrails',        icon: '🪜' },
  signage:           { label: 'Signage & Wayfinding',      icon: '🪧' },
  drinking_fountain: { label: 'Drinking Fountain',         icon: '💧' },
  dining:            { label: 'Dining Area',               icon: '🍽️' },
  counter:           { label: 'Service Counter',           icon: '🏪' },
  outdoor_seating:   { label: 'Outdoor Seating',           icon: '🌿' },
  cafeteria:         { label: 'Cafeteria / Dining Hall',   icon: '🥗' },
  concession:        { label: 'Concession Stand',          icon: '🍿' },
  sales_floor:       { label: 'Sales Floor & Aisles',      icon: '🛍️' },
  checkout:          { label: 'Checkout Counter',          icon: '🧾' },
  fitting_room:      { label: 'Fitting Room',              icon: '👗' },
  reception:         { label: 'Reception Desk',            icon: '🗂️' },
  conference_room:   { label: 'Conference Room',           icon: '💼' },
  break_room:        { label: 'Break Room / Kitchen',      icon: '☕' },
  waiting_room:      { label: 'Waiting Room',              icon: '🪑' },
  exam_room:         { label: 'Examination Room',          icon: '🩺' },
  patient_room:      { label: 'Patient Room',              icon: '🛏️' },
  pharmacy:          { label: 'Pharmacy Counter',          icon: '💊' },
  lobby:             { label: 'Hotel Lobby',               icon: '🏨' },
  guest_room:        { label: 'Accessible Guest Room',     icon: '🛎️' },
  pool:              { label: 'Pool & Spa Area',            icon: '🏊' },
  fitness_center:    { label: 'Fitness Center',            icon: '🏋️' },
  classroom:         { label: 'Classroom',                 icon: '📚' },
  gymnasium:         { label: 'Gymnasium',                 icon: '🏀' },
  auditorium:        { label: 'Auditorium',                icon: '🎭' },
  library:           { label: 'Library',                   icon: '📖' },
  assembly_seating:  { label: 'Assembly Seating',          icon: '🎪' },
  stage:             { label: 'Stage Access',              icon: '🎤' },
  ticket_booth:      { label: 'Ticket / Box Office',       icon: '🎟️' },
  auto:              { label: 'Identifying room...',       icon: '🔍' },
};

function ModulesPage() {
  const navigate = useNavigate();
  const survey = JSON.parse(localStorage.getItem('surveyAnswers') || '{}');
  const auditId = localStorage.getItem('auditId');

  const [modules, setModules] = useState([]); // raw backend module docs
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

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

        // Keep the most recent entry per module_id (each add-room creates a new module_id)
        setModules(audit.modules || []);

        // Sync complete modules to localStorage for ReportPage
        const existingLocal = JSON.parse(localStorage.getItem('auditModules') || '{}');
        for (const m of audit.modules || []) {
          if (m.status === 'complete') {
            existingLocal[m.module_id] = existingLocal[m.module_id] || { status: 'complete', findings: [] };
          }
        }
        localStorage.setItem('auditModules', JSON.stringify(existingLocal));
      } catch (err) {
        console.error('Failed to load audit:', err);
      }
      if (!cancelled) setLoading(false);
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [auditId]);

  const handleAddRoom = async () => {
    if (!auditId) {
      console.error('No auditId in localStorage — go through survey first');
      return;
    }
    if (adding) return;
    setAdding(true);
    try {
      const { module_id } = await createModule(auditId, 'auto');
      localStorage.setItem('currentAutoModuleId', module_id);
      navigate(`/module/auto`);
    } catch (err) {
      console.error('Failed to create module:', err);
      alert('Could not start room audit. Make sure the backend is running.');
    } finally {
      setAdding(false);
    }
  };

  const handleStartRename = (m) => {
    setEditingId(m.module_id);
    setEditingName(m.room_name || '');
  };

  const handleSaveRename = async (moduleId) => {
    const name = editingName.trim();
    setEditingId(null);
    if (!auditId) return;
    try {
      await renameModule(auditId, moduleId, name);
      setModules((prev) =>
        prev.map((m) => m.module_id === moduleId ? { ...m, room_name: name } : m)
      );
    } catch (err) {
      console.error('Failed to rename module:', err);
    }
  };

  const completedCount = modules.filter((m) => m.status === 'complete').length;
  const activeStatuses = ['extracting_frames', 'classifying', 'analyzing', 'checking_compliance'];
  const inProgressCount = modules.filter((m) => activeStatuses.includes(m.status)).length;

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
          Loading audit...
        </div>
      </div>
    );
  }

  return (
    <div className="modules-container">
      <div className="modules-header">
        <button
          className="modules-logo"
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: 0 }}
        >
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
            <h1 className="modules-title">Audit Progress</h1>
            <p className="modules-sub">
              {survey.businessName
                ? `Auditing: ${survey.businessName}`
                : 'Record a video of any room or area to start an ADA check.'}
            </p>
          </div>
          <div className="progress-pill">
            {completedCount} room{completedCount !== 1 ? 's' : ''} done
          </div>
        </div>

        {/* Add Room button */}
        <button
          className="add-room-btn"
          onClick={handleAddRoom}
          disabled={adding || inProgressCount > 0}
        >
          {adding ? 'Starting...' : inProgressCount > 0 ? 'Finish current room first' : '+ Add Room'}
        </button>

        {/* Results / progress list */}
        {modules.length > 0 && (
          <div className="module-grid">
            {[...modules].reverse().map((m) => {
              const type = m.module_type || 'auto';
              const meta = MODULE_META[type] || { label: type, icon: '📷' };
              const violationCount = m.violations?.length ?? 0;
              const isComplete = m.status === 'complete';
              const isProcessing = !isComplete && m.status !== 'created';

              return (
                <div
                  key={m.module_id}
                  className={`module-card ${isComplete ? 'module-complete' : ''}`}
                >
                  <div className="module-icon">
                    {isProcessing && !isComplete ? '⏳' : meta.icon}
                  </div>
                  <div className="module-info">
                    <div className="module-label">
                      {editingId === m.module_id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleSaveRename(m.module_id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(m.module_id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit',
                            background: 'var(--surface1)', color: 'var(--text)',
                            border: '1px solid var(--overlay0)', borderRadius: '4px',
                            padding: '2px 6px', width: '100%', boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        <>
                          {m.room_name || meta.label}
                          {!isProcessing && (
                            <button
                              onClick={() => handleStartRename(m)}
                              title="Rename room"
                              style={{
                                marginLeft: '6px', background: 'none', border: 'none',
                                cursor: 'pointer', color: 'var(--overlay1)', fontSize: '0.75rem',
                                padding: '0 2px', verticalAlign: 'middle',
                              }}
                            >
                              ✏️
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {isComplete && violationCount > 0 && (
                      <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--red)' }}>
                        {violationCount} violation{violationCount !== 1 ? 's' : ''} found
                      </div>
                    )}
                    {isComplete && violationCount === 0 && (
                      <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--green)' }}>
                        No violations
                      </div>
                    )}
                    {isProcessing && (
                      <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--lavender)' }}>
                        {m.status === 'classifying' ? 'Identifying room type...' : 'Analyzing...'}
                        {m.progress > 0 ? ` ${m.progress}%` : ''}
                      </div>
                    )}
                  </div>
                  <div className="module-actions">
                    {isComplete ? (
                      <span className="status-badge status-done">&#10003; Done</span>
                    ) : isProcessing ? (
                      <span className="status-badge status-pending" style={{ color: 'var(--lavender)' }}>
                        Processing...
                      </span>
                    ) : (
                      <span className="status-badge status-pending">Created</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {modules.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '48px', color: 'var(--overlay0)', fontSize: '0.9rem' }}>
            No rooms audited yet. Click <strong>+ Add Room</strong> to begin.
          </div>
        )}

        <div className="finalize-section">
          <button
            className="finalize-btn"
            disabled={completedCount === 0}
            onClick={() => navigate('/report')}
          >
            Finalize Audit &amp; Generate Report
          </button>
          {completedCount === 0 && (
            <p className="finalize-hint">Complete at least one room to generate a report.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModulesPage;
