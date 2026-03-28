import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './VideoUploadPage.css';

const MODULE_INFO = {
  entrance: {
    label: 'Entrance & Doorways',
    icon: '🚪',
    instructions: [
      'Start outside, capture the full entrance area',
      'Film the door width from both sides — aim to show the full swing',
      'Capture any threshold, step, or level change at the entrance',
      'Show door hardware (handles, knobs, push plates)',
      'Pan slowly — hold each angle for at least 2 seconds',
    ],
  },
  corridors: {
    label: 'Corridors & Hallways',
    icon: '🏛️',
    instructions: [
      'Walk through the entire hallway at a slow, steady pace',
      'Capture both sides of the hallway to show full width',
      'Film any narrowing points, corners, or obstacles',
      'Show any protruding objects (fire extinguishers, signage)',
      'Include T-intersections and turning areas',
    ],
  },
  restrooms: {
    label: 'Restrooms',
    icon: '🚻',
    instructions: [
      'Film the exterior signage and door',
      'Capture the accessible stall — show door width and space inside',
      'Film grab bars around the toilet',
      'Show sink, mirror, and towel dispenser heights',
      'Capture the door handle and latch mechanism',
    ],
  },
  stairs: {
    label: 'Stairs & Ramps',
    icon: '🪜',
    instructions: [
      'Film the full length of the staircase or ramp',
      'Capture both handrails — show where they start and end',
      'Film the nosings/edges of each step',
      'Show the landing areas at the top and bottom',
      'For ramps, film the slope from the side',
    ],
  },
  parking: {
    label: 'Parking Lot',
    icon: '🅿️',
    instructions: [
      'Film all accessible parking spaces and their signage',
      'Capture the access aisle next to each space',
      'Show the curb cut and path of travel to the building entrance',
      'Film the van-accessible space (if present)',
      'Capture any slopes or uneven surfaces in the path',
    ],
  },
  counter: {
    label: 'Service Counter',
    icon: '🏪',
    instructions: [
      'Film the front-facing side of the counter',
      'Capture the counter height — include a reference point if possible',
      'Show any lower section of the counter (accessible portion)',
      'Film knee clearance underneath (if applicable)',
      'Capture the full length of the service area',
    ],
  },
  elevator: {
    label: 'Elevator',
    icon: '🛗',
    instructions: [
      'Film the exterior call buttons — show their height',
      'Capture the floor indicator and braille signage outside',
      'Film the inside of the cab — show door width when open',
      'Capture the interior control panel and its height',
      'Show the floor of the elevator and the gap at the landing',
    ],
  },
  signage: {
    label: 'Signage',
    icon: '🪧',
    instructions: [
      'Film all room identification signs',
      'Capture the mounting height of each sign',
      'Show braille and raised characters up close',
      'Film signs near corners or doors (placement relative to door)',
      'Include exit signs and emergency signage',
    ],
  },
};

const MOCK_FINDINGS = {
  entrance: [
    {
      id: 'e1',
      severity: 'violation',
      title: 'Door clear width insufficient',
      detail: 'Measured door opening appears to be approximately 28–30". ADA requires a minimum clear width of 32" (36" preferred).',
      citation: 'ADA Standards §404.2.3',
      estimatedCost: '$800 – $2,400',
    },
    {
      id: 'e2',
      severity: 'warning',
      title: 'Door hardware may require tight grasping',
      detail: 'Round door knobs require tight grasping and twisting. Lever-style hardware is required.',
      citation: 'ADA Standards §404.2.7',
      estimatedCost: '$80 – $200',
    },
  ],
  corridors: [
    {
      id: 'c1',
      severity: 'violation',
      title: 'Corridor width below minimum',
      detail: 'Hallway appears narrower than the required 36" minimum passable width in one section.',
      citation: 'ADA Standards §403.5.1',
      estimatedCost: '$1,500 – $8,000',
    },
  ],
  restrooms: [
    {
      id: 'r1',
      severity: 'violation',
      title: 'No accessible stall detected',
      detail: 'No stall meeting the 60" × 60" turning space requirement was observed.',
      citation: 'ADA Standards §604.3.1',
      estimatedCost: '$3,000 – $12,000',
    },
    {
      id: 'r2',
      severity: 'warning',
      title: 'Grab bar missing or incorrectly placed',
      detail: 'Side grab bar appears absent or not mounted at the required 33–36" height.',
      citation: 'ADA Standards §604.5.1',
      estimatedCost: '$200 – $600',
    },
  ],
  stairs: [
    {
      id: 's1',
      severity: 'warning',
      title: 'Handrail does not extend beyond top riser',
      detail: 'Handrail appears to end at the top step rather than extending 12" horizontally beyond it.',
      citation: 'ADA Standards §505.10.2',
      estimatedCost: '$300 – $900',
    },
  ],
  parking: [
    {
      id: 'p1',
      severity: 'violation',
      title: 'No van-accessible space identified',
      detail: 'Lots with accessible parking must include at least one van-accessible space with an 8-foot access aisle.',
      citation: 'ADA Standards §502.2',
      estimatedCost: '$500 – $1,500',
    },
    {
      id: 'p2',
      severity: 'violation',
      title: 'Accessible space sign not visible',
      detail: 'International Symbol of Accessibility sign must be mounted at minimum 60" above the ground.',
      citation: 'ADA Standards §502.6',
      estimatedCost: '$100 – $300',
    },
  ],
  counter: [
    {
      id: 'co1',
      severity: 'violation',
      title: 'No accessible lowered counter section',
      detail: 'Full counter height observed at approximately 42". A section no higher than 36" is required.',
      citation: 'ADA Standards §904.4.1',
      estimatedCost: '$1,200 – $4,000',
    },
  ],
  elevator: [],
  signage: [
    {
      id: 'sg1',
      severity: 'warning',
      title: 'Signage mounted at incorrect height',
      detail: 'Room identification signs must be mounted with the centerline at 60" AFF (above finished floor).',
      citation: 'ADA Standards §703.4.1',
      estimatedCost: '$50 – $150 per sign',
    },
  ],
};

function VideoUploadPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const info = MODULE_INFO[moduleId] || {
    label: 'Unknown Module',
    icon: '📹',
    instructions: [],
  };

  const [phase, setPhase] = useState('upload'); // upload | analyzing | results
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    startAnalysis();
  };

  const startAnalysis = () => {
    setPhase('analyzing');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setPhase('results');
          return 100;
        }
        return p + 4;
      });
    }, 120);
  };

  const handleConfirm = () => {
    const existing = JSON.parse(localStorage.getItem('auditModules') || '{}');
    existing[moduleId] = {
      status: 'complete',
      findings: MOCK_FINDINGS[moduleId] || [],
    };
    localStorage.setItem('auditModules', JSON.stringify(existing));
    navigate('/modules');
  };

  const findings = MOCK_FINDINGS[moduleId] || [];
  const violations = findings.filter((f) => f.severity === 'violation');
  const warnings = findings.filter((f) => f.severity === 'warning');

  return (
    <div className="video-container">
      <div className="video-header">
        <button className="back-btn" onClick={() => navigate('/modules')}>
          &#8249; Back to Modules
        </button>
        <span className="module-badge">
          {info.icon} {info.label}
        </span>
      </div>

      <div className="video-content">
        {phase === 'upload' && (
          <>
            <h2 className="video-title">Upload or Record Video</h2>
            <p className="video-sub">
              Follow the instructions below, then upload your video for analysis.
            </p>

            <div className="instructions-card">
              <h3>What to capture</h3>
              <ol className="instruction-list">
                {info.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>

            <div className="upload-area" onClick={() => fileInputRef.current.click()}>
              <div className="upload-icon">&#128249;</div>
              <p className="upload-label">Click to upload a video file</p>
              <p className="upload-hint">MP4, MOV, or AVI &mdash; max 500MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div className="divider-row">
              <span className="divider-line" />
              <span className="divider-text">or</span>
              <span className="divider-line" />
            </div>

            <button className="record-btn" onClick={startAnalysis}>
              &#9679; Use Demo Analysis
            </button>
            <p className="record-hint">No video? Run a demo analysis to see how the report looks.</p>
          </>
        )}

        {phase === 'analyzing' && (
          <div className="analyzing-section">
            <div className="analyzing-spinner" />
            <h2 className="analyzing-title">Analyzing Video...</h2>
            <p className="analyzing-sub">
              {progress < 30 && 'Extracting frames and removing duplicates...'}
              {progress >= 30 && progress < 60 && 'Running depth estimation model...'}
              {progress >= 60 && progress < 85 && 'Measuring key dimensions...'}
              {progress >= 85 && 'Checking against ADA guidelines...'}
            </p>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="progress-pct">{progress}%</p>
          </div>
        )}

        {phase === 'results' && (
          <>
            <div className="results-summary">
              <h2 className="results-title">Analysis Complete</h2>
              {findings.length === 0 ? (
                <div className="results-pass">
                  <span className="pass-icon">&#10003;</span>
                  <p>No violations detected in this module. Looks good!</p>
                </div>
              ) : (
                <p className="results-sub">
                  Found{' '}
                  <span className="count-violation">{violations.length} violation{violations.length !== 1 ? 's' : ''}</span>
                  {warnings.length > 0 && (
                    <> and <span className="count-warning">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span></>
                  )}{' '}
                  in <strong>{info.label}</strong>.
                </p>
              )}
            </div>

            {findings.length > 0 && (
              <div className="findings-list">
                {findings.map((f) => (
                  <div key={f.id} className={`finding-card finding-${f.severity}`}>
                    <div className="finding-top">
                      <span className={`finding-badge badge-${f.severity}`}>
                        {f.severity === 'violation' ? 'Violation' : 'Warning'}
                      </span>
                      <span className="finding-citation">{f.citation}</span>
                    </div>
                    <div className="finding-title">{f.title}</div>
                    <div className="finding-detail">{f.detail}</div>
                    <div className="finding-cost">
                      Estimated fix: <strong>{f.estimatedCost}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="confirm-btn" onClick={handleConfirm}>
              Add to Audit &amp; Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default VideoUploadPage;
