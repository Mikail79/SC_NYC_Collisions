import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

const CLASS_LABELS = {
  0: 'Safe (No Injury)',
  1: 'Injury / Fatal',
}

const SEVERITY_ICONS = {
  0: '✅',
  1: '🚨',
}

const DEFAULT_BOROUGHS = [
  'BRONX',
  'BROOKLYN',
  'MANHATTAN',
  'QUEENS',
  'STATEN ISLAND',
]

function App() {
  // ─── Form State ────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    hour: new Date().getHours(),
    day_of_week: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
    month: new Date().getMonth() + 1,
    borough: '',
    vehicle_type: '',
    contributing_factor: '',
  })

  // ─── Dropdown Options ──────────────────────────────────────────────────
  const [categories, setCategories] = useState({
    boroughs: DEFAULT_BOROUGHS,
    vehicle_types: [],
    contributing_factors: [],
  })

  // ─── Result & UI State ─────────────────────────────────────────────────
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking') // 'online' | 'offline' | 'checking'

  // ─── Fetch Categories & Check API Status ───────────────────────────────
  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`)
        if (res.ok) {
          setApiStatus('online')
        } else {
          setApiStatus('offline')
        }
      } catch {
        setApiStatus('offline')
      }
    }

    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`)
        if (res.ok) {
          const data = await res.json()
          setCategories({
            boroughs: data.boroughs?.length > 0 ? data.boroughs : DEFAULT_BOROUGHS,
            vehicle_types: data.vehicle_types || [],
            contributing_factors: data.contributing_factors || [],
          })
        }
      } catch {
        // Silently fail — use defaults
      }
    }

    checkApi()
    fetchCategories()

    // Re-check API status every 30 seconds
    const interval = setInterval(checkApi, 30000)
    return () => clearInterval(interval)
  }, [])

  // ─── Handle Form Changes ──────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: ['hour','day_of_week','month'].includes(name) ? parseInt(value, 10) || 0 : value,
    }))
  }, [])

  // ─── Submit Prediction ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validation
    if (!formData.borough) {
      setError('Please select a borough.')
      setLoading(false)
      return
    }
    if (!formData.vehicle_type) {
      setError('Please select a vehicle type.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.detail || `Server error: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(
        err.message.includes('fetch')
          ? 'Cannot connect to the API server. Make sure the FastAPI backend is running on port 8000.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  // ─── Format hour for display ──────────────────────────────────────────
  const formatHour = (h) => {
    if (h === 0) return '12:00 AM'
    if (h === 12) return '12:00 PM'
    if (h < 12) return `${h}:00 AM`
    return `${h - 12}:00 PM`
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-icon">🚗</div>
            <div className="header-text">
              <h1>NYC Collision Severity Predictor</h1>
              <p>Motor Vehicle Collision Analysis — ANN/MLP Model</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="connection-status">
              <span className={`status-dot ${apiStatus}`}></span>
              <span>
                API {apiStatus === 'online' ? 'Connected' : apiStatus === 'checking' ? 'Checking...' : 'Disconnected'}
              </span>
            </div>
            <span className="header-badge">Soft Computing Project</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="app-main">
        {/* ── Input Form Card ────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon">📋</div>
            <div>
              <h2>Collision Parameters</h2>
              <p>Enter crash scenario details for prediction</p>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} id="prediction-form">
              {/* Hour */}
              <div className="form-group">
                <label className="form-label" htmlFor="hour">
                  Crash Hour
                  <span className="form-label-hint">(0–23)</span>
                </label>
                <div className="hour-input-wrapper">
                  <input
                    type="number"
                    id="hour"
                    name="hour"
                    className="form-input"
                    value={formData.hour}
                    onChange={handleChange}
                    min={0}
                    max={23}
                    placeholder="e.g., 14"
                  />
                  <span className="hour-suffix">{formatHour(formData.hour)}</span>
                </div>
              </div>

              {/* Day of Week */}
              <div className="form-group">
                <label className="form-label" htmlFor="day_of_week">Day of Week</label>
                <select id="day_of_week" name="day_of_week" className="form-select" value={formData.day_of_week} onChange={handleChange}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div className="form-group">
                <label className="form-label" htmlFor="month">Month</label>
                <select id="month" name="month" className="form-select" value={formData.month} onChange={handleChange}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Borough */}
              <div className="form-group">
                <label className="form-label" htmlFor="borough">
                  Borough
                </label>
                <select
                  id="borough"
                  name="borough"
                  className="form-select"
                  value={formData.borough}
                  onChange={handleChange}
                >
                  <option value="">— Select Borough —</option>
                  {categories.boroughs.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="vehicle_type">
                  Vehicle Type
                </label>
                {categories.vehicle_types.length > 0 ? (
                  <select
                    id="vehicle_type"
                    name="vehicle_type"
                    className="form-select"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                  >
                    <option value="">— Select Vehicle Type —</option>
                    {categories.vehicle_types.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="vehicle_type"
                    name="vehicle_type"
                    className="form-input"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                    placeholder="e.g., SEDAN, SUV, TAXI"
                  />
                )}
              </div>

              {/* Contributing Factor */}
              <div className="form-group">
                <label className="form-label" htmlFor="contributing_factor">
                  Contributing Factor
                </label>
                {categories.contributing_factors.length > 0 ? (
                  <select
                    id="contributing_factor"
                    name="contributing_factor"
                    className="form-select"
                    value={formData.contributing_factor}
                    onChange={handleChange}
                  >
                    <option value="">— Select Contributing Factor —</option>
                    {categories.contributing_factors.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="contributing_factor"
                    name="contributing_factor"
                    className="form-input"
                    value={formData.contributing_factor}
                    onChange={handleChange}
                    placeholder="e.g., DRIVER INATTENTION/DISTRACTION"
                  />
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-predict"
                disabled={loading || apiStatus === 'offline'}
                id="predict-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    🔍 Predict Severity
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Results Card ───────────────────────────────────────────── */}
        <div className="card result-card">
          <div className="card-header">
            <div className="card-header-icon">📊</div>
            <div>
              <h2>Prediction Result</h2>
              <p>Model output and probability distribution</p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{ padding: '0 24px' }}>
              <div className="error-banner">
                <span className="error-banner-icon">⚠️</span>
                <div className="error-banner-text">
                  <strong>Prediction Error</strong>
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* No result yet */}
          {!result && !error && (
            <div className="result-placeholder">
              <div className="result-placeholder-icon">🔮</div>
              <h3>No Prediction Yet</h3>
              <p>
                Fill in the collision parameters on the left and click
                "Predict Severity" to see the model output.
              </p>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="result-content">
              {/* Severity Badge */}
              <div className={`result-severity severity-${result.predicted_class}`}>
                <div className="severity-icon">
                  {SEVERITY_ICONS[result.predicted_class] || '❓'}
                </div>
                <div className="severity-class">
                  Class {result.predicted_class}
                </div>
                <div className="severity-label">
                  {result.class_label}
                </div>
              </div>

              {/* Probability Distribution */}
              <div className="prob-section">
                <h4>Probability Distribution</h4>

                {Object.entries(result.probabilities).map(([label, value], idx) => {
                  const barClass = idx === 0 ? 'bar-safe' : 'bar-fatal'
                  const textClass = idx === 0 ? 'text-safe' : 'text-fatal'
                  return (
                    <div className="prob-item" key={label}>
                      <div className="prob-label-row">
                        <span className="prob-label">{label}</span>
                        <span className={`prob-value ${textClass}`}>{value}%</span>
                      </div>
                      <div className="prob-bar-track">
                        <div
                          className={`prob-bar-fill ${barClass}`}
                          style={{ width: `${value}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Input Summary */}
              {result.input_received && (
                <div className="input-summary">
                  <h4>Input Summary</h4>
                  <div className="input-summary-grid">
                    <div className="input-summary-item">
                      <span className="label">Hour</span>
                      <span className="value">
                        {result.input_received.hour}:00 ({formatHour(result.input_received.hour)})
                      </span>
                    </div>
                    <div className="input-summary-item">
                      <span className="label">Day</span>
                      <span className="value">{result.input_received.day_of_week}</span>
                    </div>
                    <div className="input-summary-item">
                      <span className="label">Month</span>
                      <span className="value">{result.input_received.month}</span>
                    </div>
                    <div className="input-summary-item">
                      <span className="label">Borough</span>
                      <span className="value">{result.input_received.borough}</span>
                    </div>
                    <div className="input-summary-item">
                      <span className="label">Vehicle Type</span>
                      <span className="value">{result.input_received.vehicle_type}</span>
                    </div>
                    <div className="input-summary-item">
                      <span className="label">Contributing Factor</span>
                      <span className="value">{result.input_received.contributing_factor}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Analysis (Top Dangerous Factors) */}
              {result.risk_analysis && result.risk_analysis.length > 0 && (
                <div className="risk-analysis-section" style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fff3cd', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
                  <h4 style={{ color: '#856404', marginBottom: '12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2em' }}>⚠️</span> Top Dangerous Factors to Avoid
                  </h4>
                  <p style={{ color: '#856404', fontSize: '0.85rem', marginBottom: '12px' }}>
                    Based on your scenario, here are the factors most likely to cause injury or fatality:
                  </p>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.risk_analysis.map((risk, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 193, 7, 0.2)', padding: '8px 12px', borderRadius: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#664d03', fontSize: '0.9rem' }}>{idx + 1}. {risk.factor}</span>
                        <span style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.9rem' }}>{risk.danger_score}% Risk</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vehicle Insight */}
              {result.vehicle_insight && result.vehicle_insight.avg_vehicles_in_injury > 0 && (
                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#d1ecf1', borderRadius: '8px', borderLeft: '4px solid #0dcaf0' }}>
                  <h4 style={{ color: '#0c5460', marginBottom: '12px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2em' }}>🚗</span> Vehicle Involvement Insight ({result.input_received.borough})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#0c5460' }}>Avg vehicles in injury cases</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#dc3545' }}>{result.vehicle_insight.avg_vehicles_in_injury}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#0c5460' }}>Avg vehicles in safe cases</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#28a745' }}>{result.vehicle_insight.avg_vehicles_in_safe}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#0c5460' }}>Max vehicles in injury</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#856404' }}>{result.vehicle_insight.max_vehicles_in_injury}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '8px 12px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#0c5460' }}>Injury vs Safe ratio</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0c5460' }}>{result.vehicle_insight.total_injury_cases} / {result.vehicle_insight.total_safe_cases}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <p>
          <strong>Predictive Modeling of Traffic Collision Severity in New York City</strong>
          <br />
          A Final Project Sistem Cerdas
          <br />
          Model: Multilayer Perceptron (ANN) · Dataset:{' '}
          <a
            href="https://data.cityofnewyork.us/Public-Safety/Motor-Vehicle-Collisions-Crashes/h9gi-nx95"
            target="_blank"
            rel="noopener noreferrer"
          >
            NYC Open Data — Motor Vehicle Collisions
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
