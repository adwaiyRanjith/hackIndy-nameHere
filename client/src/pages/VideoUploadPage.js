import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './VideoUploadPage.css';
import { createModule, uploadVideo, getModuleStatus, getModuleResults, mapViolation } from '../api';

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
  const { moduleId: moduleType } = useParams(); // e.g. "entrance"
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const pollRef = useRef(null);

  const info = MODULE_INFO[moduleType] || {
    label: 'Unknown Module',
    icon: '📹',
    instructions: [],
  };

  const [phase, setPhase] = useState('upload'); // upload | recording | analyzing | results
  const [fileName, setFileName] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [findings, setFindings] = useState([]);
  const [backendModuleId, setBackendModuleId] = useState(null);
  const [error, setError] = useState(null);

  // Recording state
  const videoPreviewRef = useRef();
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // On mount: register this module in the backend if not already done
  useEffect(() => {
    const auditId = localStorage.getItem('auditId');
    if (!auditId) return;

    const stored = JSON.parse(localStorage.getItem('auditModuleIds') || '{}');
    if (stored[moduleType]) {
      setBackendModuleId(stored[moduleType]);
    } else {
      createModule(auditId, moduleType)
        .then(({ module_id }) => {
          const updated = { ...stored, [moduleType]: module_id };
          localStorage.setItem('auditModuleIds', JSON.stringify(updated));
          setBackendModuleId(module_id);
        })
        .catch((err) => console.error('Failed to create module:', err));
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [moduleType]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const auditId = localStorage.getItem('auditId');
    if (auditId && backendModuleId) {
      startRealAnalysis(auditId, backendModuleId, file);
    } else {
      startDemoAnalysis();
    }
  };

  const startRealAnalysis = async (auditId, bModuleId, file) => {
    setPhase('analyzing');
    setProgress(5);
    setProgressLabel('Uploading video...');
    setError(null);

    try {
      await uploadVideo(auditId, bModuleId, file);
      setProgress(15);

      pollRef.current = setInterval(async () => {
        try {
          const status = await getModuleStatus(auditId, bModuleId);
          setProgress(status.progress || 0);

          const labels = {
            extracting_frames: 'Extracting frames and removing duplicates...',
            analyzing: 'Running AI analysis...',
            checking_compliance: 'Checking against ADA guidelines...',
            complete: 'Done!',
            error: 'Analysis encountered an error.',
          };
          setProgressLabel(labels[status.status] || 'Processing...');

          if (status.status === 'complete') {
            clearInterval(pollRef.current);
            const results = await getModuleResults(auditId, bModuleId);
            const mapped = (results.violations || []).map(mapViolation);
            setFindings(mapped);

            const existing = JSON.parse(localStorage.getItem('auditModules') || '{}');
            existing[moduleType] = { status: 'complete', findings: mapped };
            localStorage.setItem('auditModules', JSON.stringify(existing));

            setProgress(100);
            setPhase('results');
          } else if (status.status === 'error') {
            clearInterval(pollRef.current);
            setError(status.error_message || 'Analysis failed. Try again.');
            setPhase('upload');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload video. Please try again.');
      setPhase('upload');
    }
  };

  // Demo mode: simulates progress with mock findings
  const startDemoAnalysis = () => {
    const mockFindings = MOCK_FINDINGS[moduleType] || [];
    setPhase('analyzing');
    setProgress(0);
    setProgressLabel('Extracting frames and removing duplicates...');
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 30 && p < 60) setProgressLabel('Running depth estimation model...');
        if (p >= 60 && p < 85) setProgressLabel('Measuring key dimensions...');
        if (p >= 85) setProgressLabel('Checking against ADA guidelines...');
        if (p >= 100) {
          clearInterval(interval);
          setFindings(mockFindings);
          const existing = JSON.parse(localStorage.getItem('auditModules') || '{}');
          existing[moduleType] = { status: 'complete', findings: mockFindings };
          localStorage.setItem('auditModules', JSON.stringify(existing));
          setPhase('results');
          return 100;
        }
        return p + 4;
      });
    }, 120);
  };

  const startRecording = async () => {
    setError(null);
    setRecordedBlob(null);
    recordedChunksRef.current = [];
    setRecordedBlob(null);
    recordedChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.play();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        videoPreviewRef.current.srcObject = null;
        videoPreviewRef.current.src = URL.createObjectURL(blob);
        videoPreviewRef.current.controls = true;
        videoPreviewRef.current.play();
      };
      recorder.start();
      setIsRecording(true);
      setPhase('recording');
    } catch (err) {
      console.error('Camera error:', err.name, err.message);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. In your browser address bar, click the camera icon and allow access, then try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const submitRecording = () => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], 'recording.webm', { type: 'video/webm' });
    setFileName('recording.webm');
    const auditId = localStorage.getItem('auditId');
    if (auditId && backendModuleId) {
      startRealAnalysis(auditId, backendModuleId, file);
    } else {
      startDemoAnalysis();
    }
  };

  const cancelRecording = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsRecording(false);
    setRecordedBlob(null);
    setPhase('upload');
  };

  const handleConfirm = () => {
    navigate('/modules');
  };

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

            <button className="record-btn" onClick={startRecording}>
              &#9679; Record Video
            </button>
            <p className="record-hint">Use your device camera to record directly.</p>
            {error && <p className="record-hint" style={{ color: '#ff453a' }}>{error}</p>}

            <div className="divider-row" style={{ marginTop: '12px' }}>
              <span className="divider-line" />
              <span className="divider-text">or</span>
              <span className="divider-line" />
            </div>
            <button
              className="record-btn"
              style={{ background: 'transparent', color: '#8e8e93', border: '1px solid #3a3a3c', marginTop: '8px' }}
              onClick={startDemoAnalysis}
            >
              Use Demo Analysis
            </button>
          </>
        )}

        {phase === 'recording' && (
          <div className="analyzing-section">
            <video
              ref={videoPreviewRef}
              style={{ width: '100%', maxWidth: '480px', borderRadius: '12px', marginBottom: '16px', background: '#000' }}
              muted={isRecording}
              playsInline
            />
            {isRecording ? (
              <>
                <p className="analyzing-sub" style={{ color: '#ff453a' }}>&#9679; Recording...</p>
                <button className="confirm-btn" onClick={stopRecording}>&#9646;&#9646; Stop Recording</button>
              </>
            ) : (
              <>
                <p className="analyzing-sub">Review your recording, then submit or re-record.</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="confirm-btn" onClick={submitRecording}>Submit for Analysis</button>
                  <button className="back-btn" style={{ marginTop: 0 }} onClick={startRecording}>Re-record</button>
                  <button className="back-btn" style={{ marginTop: 0 }} onClick={cancelRecording}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="analyzing-section">
            <div className="analyzing-spinner" />
            <h2 className="analyzing-title">Analyzing Video...</h2>
            <p className="analyzing-sub">{progressLabel}</p>
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
