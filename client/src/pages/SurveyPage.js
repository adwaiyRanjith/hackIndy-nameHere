import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SurveyPage.css';

const BUILDING_TYPES = [
  'Office Building',
  'Retail Store',
  'Restaurant / Food Service',
  'Medical / Healthcare Facility',
  'School / Educational Facility',
  'Hotel / Lodging',
  'Warehouse / Industrial',
  'Other',
];

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const STEPS = [
  { label: 'Property Info' },
  { label: 'Building Details' },
  { label: 'Features' },
];

function SurveyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    businessName: '',
    city: '',
    state: '',
    buildingType: '',
    yearBuilt: '',
    lastRenovation: '',
    numFloors: '',
    hasParking: '',
    hasElevator: '',
    hasRamps: '',
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const canProceedStep0 =
    form.businessName.trim() && form.city.trim() && form.state && form.buildingType;

  const canProceedStep1 =
    form.yearBuilt && form.lastRenovation && form.numFloors;

  const canProceedStep2 =
    form.hasParking && form.hasElevator && form.hasRamps;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('surveyAnswers', JSON.stringify(form));
      navigate('/modules');
    }
  };

  const handleBack = () => {
    if (step === 0) navigate('/dashboard');
    else setStep(step - 1);
  };

  return (
    <div className="survey-container">
      <div className="survey-card">
        <div className="survey-top">
          <button className="back-btn" onClick={handleBack}>
            &#8249; Back
          </button>
          <div className="step-indicator">
            {STEPS.map((s, i) => (
              <div key={i} className={`step-dot ${i <= step ? 'step-active' : ''}`} />
            ))}
          </div>
          <span className="step-label">
            Step {step + 1} of {STEPS.length}: {STEPS[step].label}
          </span>
        </div>

        <h2 className="survey-title">Building Questionnaire</h2>
        <p className="survey-subtitle">
          Your answers help us determine which ADA guidelines apply to your property.
        </p>

        {step === 0 && (
          <div className="survey-fields">
            <div className="field-group">
              <label>Business Name</label>
              <input
                type="text"
                placeholder="e.g. Main Street Cafe"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
              />
            </div>
            <div className="field-row">
              <div className="field-group">
                <label>City</label>
                <input
                  type="text"
                  placeholder="e.g. Indianapolis"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div className="field-group">
                <label>State</label>
                <select
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                >
                  <option value="">Select state</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-group">
              <label>Building Type</label>
              <select
                value={form.buildingType}
                onChange={(e) => update('buildingType', e.target.value)}
              >
                <option value="">Select type</option>
                {BUILDING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="survey-fields">
            <div className="field-group">
              <label>Year Built</label>
              <input
                type="number"
                placeholder="e.g. 1985"
                min="1800"
                max="2025"
                value={form.yearBuilt}
                onChange={(e) => update('yearBuilt', e.target.value)}
              />
              {form.yearBuilt && parseInt(form.yearBuilt) < 1990 && (
                <p className="field-hint">
                  Buildings built before 1990 (ADA enactment) may have more applicable guidelines.
                </p>
              )}
            </div>
            <div className="field-group">
              <label>Year of Last Major Renovation</label>
              <input
                type="number"
                placeholder="e.g. 2010 (or same as year built if never)"
                min="1800"
                max="2025"
                value={form.lastRenovation}
                onChange={(e) => update('lastRenovation', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Number of Floors</label>
              <input
                type="number"
                placeholder="e.g. 3"
                min="1"
                max="200"
                value={form.numFloors}
                onChange={(e) => update('numFloors', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="survey-fields">
            <RadioField
              label="Does the property have a parking lot or garage?"
              value={form.hasParking}
              onChange={(v) => update('hasParking', v)}
            />
            <RadioField
              label="Does the building have an elevator?"
              value={form.hasElevator}
              onChange={(v) => update('hasElevator', v)}
            />
            <RadioField
              label="Does the building have ramps or level-change areas?"
              value={form.hasRamps}
              onChange={(v) => update('hasRamps', v)}
            />
          </div>
        )}

        <button
          className="survey-next-btn"
          onClick={handleNext}
          disabled={
            (step === 0 && !canProceedStep0) ||
            (step === 1 && !canProceedStep1) ||
            (step === 2 && !canProceedStep2)
          }
        >
          {step < STEPS.length - 1 ? 'Continue' : 'Start Audit'}
        </button>
      </div>
    </div>
  );
}

function RadioField({ label, value, onChange }) {
  return (
    <div className="field-group">
      <label>{label}</label>
      <div className="radio-group">
        {['Yes', 'No', 'Unsure'].map((opt) => (
          <button
            key={opt}
            className={`radio-btn ${value === opt ? 'radio-selected' : ''}`}
            onClick={() => onChange(opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SurveyPage;
