import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

const CLASS_LABELS = {
  0: 'Safe (No Injury)',
  1: 'Injury / Fatal',
}

const DEFAULT_BOROUGHS = [
  'BRONX',
  'BROOKLYN',
  'MANHATTAN',
  'QUEENS',
  'STATEN ISLAND',
]

/* ─── SVG Icon Components ─────────────────────────────────────────────────── */
const IconCar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
    <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
  </svg>
)

const IconClipboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </svg>
)

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
  </svg>
)

const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
)

const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)

const IconAlertTriangle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
)

const IconAlertCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
  </svg>
)

const IconInfo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
)

const IconBarChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
  </svg>
)

const IconTarget = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
)


function App() {
  // ─── Form State ────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    hour: new Date().getHours(),
    day_of_week: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
    month: new Date().getMonth() + 1,
    borough: '',
    vehicle_type: '',
    contributing_factor: '',
    contributing_factor_2: '',
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
  const [apiStatus, setApiStatus] = useState('checking')

  // ─── Fetch Categories & Check API ──────────────────────────────────────
  useEffect(() => {
    const checkApi = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`)
        setApiStatus(res.ok ? 'online' : 'offline')
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
        // Silently fail
      }
    }

    checkApi()
    fetchCategories()
    const interval = setInterval(checkApi, 30000)
    return () => clearInterval(interval)
  }, [])

  // ─── Handle Form Changes ──────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: ['hour', 'day_of_week', 'month'].includes(name) ? parseInt(value, 10) || 0 : value,
    }))
  }, [])

  // ─── Submit Prediction ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

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
            <div className="header-logo">
              <IconCar />
            </div>
            <div className="header-text">
              <h1>NYC Collision Severity Predictor</h1>
              <p>Predictive Modeling of Traffic Collision Severity</p>
            </div>
          </div>
          <div className="header-right">
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
        {/* ── Left Panel: About + Form ────────────────────────────────── */}
        <div>
          {/* About Section */}
          <div className="about-section">
            <div className="about-title">
              <IconInfo />
              Tentang Aplikasi Ini
            </div>
            <p className="about-text">
              <strong>Sistem Pendukung Keputusan (Decision Support System)</strong> untuk memprediksi tingkat
              keparahan kecelakaan lalu lintas di New York City. Menggunakan model <strong>Artificial Neural Network
              (Multilayer Perceptron)</strong> yang dilatih dari 50.000 data historis kecelakaan nyata dari NYC Open Data API.
            </p>
            <p className="about-text">
              Aplikasi ini menganalisis faktor waktu, lokasi, jenis kendaraan, dan penyebab kecelakaan untuk
              menghasilkan prediksi apakah suatu skenario kecelakaan berpotensi menyebabkan cedera/kematian
              atau hanya kerusakan properti.
            </p>
            <div className="about-tags">
              <span className="about-tag">Keselamatan Lalu Lintas</span>
              <span className="about-tag">Perencana Kota</span>
              <span className="about-tag">Asuransi Kendaraan</span>
              <span className="about-tag">Peneliti Transportasi</span>
              <span className="about-tag">Akademisi</span>
            </div>
          </div>

          {/* Input Form Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-icon">
                <IconClipboard />
              </div>
              <div>
                <h2>Collision Parameters</h2>
                <p>Enter crash scenario details for prediction</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} id="prediction-form">
                <div className="form-grid">
                  {/* Hour */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="hour">
                      Crash Hour
                      <span className="form-hint">(0-23)</span>
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
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="month">Month</label>
                    <select id="month" name="month" className="form-select" value={formData.month} onChange={handleChange}>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                        <option key={i + 1} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Borough */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="borough">Borough</label>
                    <select id="borough" name="borough" className="form-select" value={formData.borough} onChange={handleChange}>
                      <option value="">— Select Borough —</option>
                      {categories.boroughs.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vehicle Type */}
                  <div className="form-group full-width">
                    <label className="form-label" htmlFor="vehicle_type">Vehicle Type</label>
                    {categories.vehicle_types.length > 0 ? (
                      <select id="vehicle_type" name="vehicle_type" className="form-select" value={formData.vehicle_type} onChange={handleChange}>
                        <option value="">— Select Vehicle Type —</option>
                        {categories.vehicle_types.map((v) => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" id="vehicle_type" name="vehicle_type" className="form-input" value={formData.vehicle_type} onChange={handleChange} placeholder="e.g., SEDAN, SUV, TAXI" />
                    )}
                  </div>

                  {/* Contributing Factor 1 */}
                  <div className="form-group full-width">
                    <label className="form-label" htmlFor="contributing_factor">Contributing Factor (Primary)</label>
                    {categories.contributing_factors.length > 0 ? (
                      <select id="contributing_factor" name="contributing_factor" className="form-select" value={formData.contributing_factor} onChange={handleChange}>
                        <option value="">— Select Contributing Factor —</option>
                        {categories.contributing_factors.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" id="contributing_factor" name="contributing_factor" className="form-input" value={formData.contributing_factor} onChange={handleChange} placeholder="e.g., DRIVER INATTENTION/DISTRACTION" />
                    )}
                  </div>

                  {/* Contributing Factor 2 (NEW) */}
                  <div className="form-group full-width">
                    <label className="form-label" htmlFor="contributing_factor_2">
                      Contributing Factor (Secondary)
                      <span className="form-optional-tag">Optional</span>
                    </label>
                    {categories.contributing_factors.length > 0 ? (
                      <select id="contributing_factor_2" name="contributing_factor_2" className="form-select" value={formData.contributing_factor_2} onChange={handleChange}>
                        <option value="">— None / Unknown —</option>
                        {categories.contributing_factors.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" id="contributing_factor_2" name="contributing_factor_2" className="form-input" value={formData.contributing_factor_2} onChange={handleChange} placeholder="Optional secondary factor" />
                    )}
                  </div>
                </div>

                {/* Submit Button */}
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
                      <IconSearch />
                      Predict Severity
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Results ────────────────────────────────────── */}
        <div className="card result-card">
          <div className="card-header">
            <div className="card-icon">
              <IconChart />
            </div>
            <div>
              <h2>Prediction Result</h2>
              <p>Model output and probability distribution</p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <div className="error-banner-icon">
                <IconAlertCircle />
              </div>
              <div className="error-banner-text">
                <strong>Prediction Error</strong>
                {error}
              </div>
            </div>
          )}

          {/* No result yet */}
          {!result && !error && (
            <div className="result-placeholder">
              <div className="result-placeholder-icon">
                <IconTarget />
              </div>
              <h3>No Prediction Yet</h3>
              <p>
                Fill in the collision parameters on the left and click
                &ldquo;Predict Severity&rdquo; to see the model output.
              </p>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="result-content">
              {/* Severity Badge */}
              <div className={`result-severity severity-${result.predicted_class}`}>
                <div className="severity-icon">
                  {result.predicted_class === 0 ? <IconShield /> : <IconAlertTriangle />}
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
                <h4 className="section-title">Probability Distribution</h4>
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
                        <div className={`prob-bar-fill ${barClass}`} style={{ width: `${value}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Input Summary */}
              {result.input_received && (
                <div className="input-summary">
                  <h4 className="section-title">Input Summary</h4>
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

              {/* Risk Analysis */}
              {result.risk_analysis && result.risk_analysis.length > 0 && (
                <div className="risk-section">
                  <div className="risk-header">
                    <IconAlertTriangle />
                    <h4>Top Dangerous Factors to Avoid</h4>
                  </div>
                  <p className="risk-desc">
                    Based on your scenario, these factors are most likely to cause injury or fatality:
                  </p>
                  <ul className="risk-list">
                    {result.risk_analysis.map((risk, idx) => (
                      <li key={idx} className="risk-item">
                        <span className="risk-item-name">{idx + 1}. {risk.factor}</span>
                        <span className="risk-item-score">{risk.danger_score}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vehicle Insight */}
              {result.vehicle_insight && result.vehicle_insight.avg_vehicles_in_injury > 0 && (
                <div className="insight-section">
                  <div className="insight-header">
                    <IconBarChart />
                    <h4>Vehicle Involvement Insight — {result.input_received.borough}</h4>
                  </div>
                  <div className="insight-grid">
                    <div className="insight-stat">
                      <div className="insight-stat-label">Avg vehicles in injury cases</div>
                      <div className="insight-stat-value danger">{result.vehicle_insight.avg_vehicles_in_injury}</div>
                    </div>
                    <div className="insight-stat">
                      <div className="insight-stat-label">Avg vehicles in safe cases</div>
                      <div className="insight-stat-value safe">{result.vehicle_insight.avg_vehicles_in_safe}</div>
                    </div>
                    <div className="insight-stat">
                      <div className="insight-stat-label">Max vehicles in injury</div>
                      <div className="insight-stat-value warn">{result.vehicle_insight.max_vehicles_in_injury}</div>
                    </div>
                    <div className="insight-stat">
                      <div className="insight-stat-label">Injury vs Safe ratio</div>
                      <div className="insight-stat-value info">{result.vehicle_insight.total_injury_cases} / {result.vehicle_insight.total_safe_cases}</div>
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
