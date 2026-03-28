import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';

function StartPage() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    localStorage.setItem('userName', name.trim());
    navigate('/audit-choice', { state: { name: name.trim() } });
  };

  return (
    <div className="start-container">
      <div className="start-card">
        <div className="start-logo">
          <span className="logo-icon">&#10003;</span>
        </div>
        <h1 className="start-title">Passline</h1>
        <p className="start-subtitle">Begin your audit session below</p>

        <form className="start-form" onSubmit={handleSubmit}>
          <label className="start-label" htmlFor="name">Your Name</label>
          <input
            id="name"
            className="start-input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="start-button" type="submit">
            Start Audit
          </button>
        </form>
      </div>
    </div>
  );
}

export default StartPage;