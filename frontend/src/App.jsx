import React, { useState, useRef, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { API_BASE_URL } from './config'

console.log("API URL:", API_BASE_URL);

// ---------------- presets ----------------
const PRESETS = {
    custom:   { label: 'Custom (click to place)', cities: [] },
    five:     { label: '5-city example', cities: [
        { x: 120, y: 110 }, { x: 540, y: 90 }, { x: 600, y: 310 },
        { x: 300, y: 360 }, { x: 90, y: 280 },
    ]},
    ten:      { label: '10-city random', cities: [
        { x:  80, y:  90 }, { x: 210, y: 180 }, { x: 340, y:  60 },
        { x: 490, y: 150 }, { x: 620, y:  70 }, { x: 650, y: 240 },
        { x: 480, y: 350 }, { x: 300, y: 290 }, { x: 170, y: 350 },
        { x:  60, y: 230 },
    ]},
    fifteen:  { label: 'Classic 15-city', cities: [
        { x:  70, y: 110 }, { x: 160, y:  60 }, { x: 260, y: 130 }, { x: 370, y:  70 },
        { x: 480, y: 120 }, { x: 580, y:  60 }, { x: 650, y: 180 }, { x: 600, y: 290 },
        { x: 510, y: 360 }, { x: 400, y: 330 }, { x: 300, y: 370 }, { x: 200, y: 300 },
        { x: 130, y: 360 }, { x:  60, y: 270 }, { x: 200, y: 200 },
    ]},
    twenty:   { label: '20-city stress test', cities: [
        { x:  60, y:  80 }, { x: 140, y: 140 }, { x: 230, y:  60 }, { x: 310, y: 130 },
        { x: 390, y:  60 }, { x: 470, y: 140 }, { x: 550, y:  80 }, { x: 640, y: 140 },
        { x: 660, y: 240 }, { x: 580, y: 300 }, { x: 500, y: 360 }, { x: 420, y: 300 },
        { x: 340, y: 360 }, { x: 260, y: 300 }, { x: 180, y: 370 }, { x: 100, y: 300 },
        { x:  50, y: 220 }, { x: 130, y: 230 }, { x: 230, y: 210 }, { x: 380, y: 200 },
    ]},
}

// ---------------- helpers ----------------
function Slider({ label, value, min, max, step = 1, onChange, fmt = (v) => v }) {
    return (
        <div className="control-group">
            <label>{label} <strong>{fmt(value)}</strong></label>
            <input type="range" min={min} max={max} step={step} value={value}
                   onChange={(e) => onChange(Number(e.target.value))} />
            <div className="range-labels"><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
        </div>
    )
}

function Section({ title, subtitle, children, id }) {
    return (
        <div className="card" id={id}>
            <div className="card-header">
                <div>
                    <h2>{title}</h2>
                    {subtitle && <p className="card-subtitle">{subtitle}</p>}
                </div>
            </div>
            <div className="card-body">{children}</div>
        </div>
    )
}

function tourEdges(tour) {
    if (!tour || tour.length < 2) return []
    const edges = []
    for (let i = 0; i < tour.length; i++) {
        edges.push([tour[i], tour[(i + 1) % tour.length]])
    }
    return edges
}

// ---------------- THEORY TAB ----------------
function TheorySection() {
    return (
        <>
            <Section title="Ant Colony Optimization" subtitle="Biologically inspired metaheuristic for combinatorial optimization">
                <div className="theory-grid">
                    <div className="theory-item full-width">
                        <h4>Biological Inspiration</h4>
                        <p>
                            Real ants find the shortest path between their nest and a food source by laying pheromone trails.
                            Shorter paths accumulate more pheromone per unit time because ants traverse them faster. Other ants
                            probabilistically prefer stronger trails, creating a positive feedback loop that converges on the
                            shortest route.
                        </p>
                        <p>
                            ACO abstracts this into artificial ants that construct candidate solutions by walking a graph,
                            depositing virtual pheromone on edges proportional to solution quality, while evaporation slowly
                            removes pheromone to avoid premature convergence.
                        </p>
                    </div>

                    <div className="theory-item">
                        <h4>Ant System (AS)</h4>
                        <p>The original variant. All m ants update pheromone every iteration.</p>
                        <div className="formula">
                            τ(i,j) ← (1 − ρ)·τ(i,j) + Σ_k Δτ(i,j)^k
                        </div>
                        <div className="formula">
                            Δτ(i,j)^k = Q / L_k   if edge (i,j) ∈ tour_k{'\n'}
                            Δτ(i,j)^k = 0         otherwise
                        </div>
                        <div className="formula">
                            P(i,j) = [ τ(i,j)^α · η(i,j)^β ] / Σ [ τ^α · η^β ]{'\n'}
                            η(i,j) = 1 / L(i,j)
                        </div>
                    </div>

                    <div className="theory-item">
                        <h4>Max-Min Ant System (MMAS)</h4>
                        <p>Only the best ant of the iteration (or best-so-far) deposits pheromone. Pheromone values are
                            bounded in [τ_min, τ_max] to prevent stagnation.</p>
                        <div className="formula">
                            τ(i,j) ← [(1 − ρ)·τ(i,j) + Δτ_best(i,j)]_{'{τ_min}^{τ_max}'}
                        </div>
                        <div className="formula">
                            Δτ_best(i,j) = 1 / L_best   if (i,j) ∈ T_best{'\n'}
                            Δτ_best(i,j) = 0            otherwise
                        </div>
                    </div>

                    <div className="theory-item">
                        <h4>Elitist Ant System (EAS)</h4>
                        <p>Extends AS with extra reinforcement for the best-so-far tour T_bs. Parameter e weights the
                            elitist contribution.</p>
                        <div className="formula">
                            τ(i,j) ← (1 − ρ)·τ(i,j) + Σ_k Δτ(i,j)^k + e·Δτ_bs(i,j)
                        </div>
                        <div className="formula">
                            Δτ_bs(i,j) = 1 / C_bs   if (i,j) ∈ T_bs{'\n'}
                            Δτ_bs(i,j) = 0          otherwise
                        </div>
                    </div>

                    <div className="theory-item">
                        <h4>Rank-Based AS (AS_rank)</h4>
                        <p>Sort ants by tour length. Only top (w−1) ants plus best-so-far deposit pheromone, each weighted
                            by their rank.</p>
                        <div className="formula">
                            τ(i,j) ← (1 − ρ)·τ(i,j){'\n'}
                            {'        '}+ Σ_{'{r=1}^{w-1}'} max(0, w−r)·Δτ^r(i,j){'\n'}
                            {'        '}+ w · Δτ_bs(i,j)
                        </div>
                        <div className="formula">
                            rank 1 → weight (w−1), rank 2 → (w−2), ... , best-so-far → w
                        </div>
                    </div>

                    <div className="theory-item full-width">
                        <h4>AS_rank Pseudocode</h4>
                        <div className="algorithm">
                            <p><strong>Initialize</strong> τ(i,j) ← τ₀ = 1 / (n · L_nn)</p>
                            <p><strong>for</strong> iteration = 1, ..., max_iter:</p>
                            <p className="indent1"><strong>for</strong> k = 1, ..., m:</p>
                            <p className="indent2">construct tour T_k using P(i,j)</p>
                            <p className="indent2">compute tour length C_k</p>
                            <p className="indent1">sort ants by C_k ascending (rank r = 1 is best)</p>
                            <p className="indent1">evaporate: τ(i,j) ← (1 − ρ)·τ(i,j)</p>
                            <p className="indent1"><strong>for</strong> r = 1, ..., w−1:</p>
                            <p className="indent2">deposit weight = max(0, w − r)</p>
                            <p className="indent2">τ(i,j) += weight · (Q / C_r) on (i,j) ∈ T_r</p>
                            <p className="indent1">update best-so-far if C_1 &lt; C_bs</p>
                            <p className="indent1">τ(i,j) += w · (Q / C_bs) on (i,j) ∈ T_bs</p>
                            <p><strong>return</strong> T_bs, C_bs</p>
                        </div>
                    </div>

                    <div className="theory-item full-width">
                        <h4>Variant Comparison</h4>
                        <table className="theory-table">
                            <thead>
                                <tr>
                                    <th>Variant</th>
                                    <th>Update Rule</th>
                                    <th>Who Deposits</th>
                                    <th>Extra Params</th>
                                    <th>Complexity</th>
                                    <th>Key Advantage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>AS</td>
                                    <td>(1−ρ)τ + Σ Δτ^k</td>
                                    <td>All m ants</td>
                                    <td>—</td>
                                    <td>O(m·n²)</td>
                                    <td>Baseline; diverse exploration</td>
                                </tr>
                                <tr>
                                    <td>MMAS</td>
                                    <td>(1−ρ)τ + Δτ_best bounded</td>
                                    <td>Best of iteration only</td>
                                    <td>τ_min, τ_max</td>
                                    <td>O(m·n²)</td>
                                    <td>Avoids stagnation via bounds</td>
                                </tr>
                                <tr>
                                    <td>EAS</td>
                                    <td>AS update + e·Δτ_bs</td>
                                    <td>All ants + best-so-far</td>
                                    <td>e</td>
                                    <td>O(m·n²)</td>
                                    <td>Faster convergence via elitism</td>
                                </tr>
                                <tr>
                                    <td>AS_rank</td>
                                    <td>(1−ρ)τ + Σ w_r·Δτ^r + w·Δτ_bs</td>
                                    <td>Top (w−1) + best-so-far</td>
                                    <td>w</td>
                                    <td>O(m·n² + m·log m)</td>
                                    <td>Rank-weighted reinforcement</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>
        </>
    )
}

// ---------------- SHARED: City Canvas ----------------
function CityCanvas({ cities, tour = null, drawnCount = 0, onClick = null, height = 420 }) {
    const edges = tour ? tourEdges(tour) : []
    return (
        <svg viewBox="0 0 700 420" preserveAspectRatio="xMidYMid meet"
             className="city-canvas" style={{ height }}
             onClick={onClick}>
            {/* tour edges, progressively drawn */}
            {edges.slice(0, drawnCount).map(([a, b], idx) => {
                const ca = cities[a], cb = cities[b]
                if (!ca || !cb) return null
                return (
                    <line key={`e-${idx}`}
                          x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y}
                          stroke="#ffffff" strokeWidth={1.5} opacity={0.7} />
                )
            })}
            {/* city nodes */}
            {cities.map((c, i) => (
                <g key={`c-${i}`}>
                    <circle cx={c.x} cy={c.y} r={i === 0 ? 11 : 8}
                            fill="#ffffff"
                            stroke={i === 0 ? 'rgba(255,255,255,0.4)' : 'none'}
                            strokeWidth={i === 0 ? 2 : 0} />
                    <text x={c.x} y={c.y - 13}
                          textAnchor="middle"
                          fill="#a3a3a3"
                          fontFamily="'JetBrains Mono', monospace"
                          fontSize="11">
                        {i}
                    </text>
                </g>
            ))}
        </svg>
    )
}

// ---------------- SANDBOX TAB ----------------
function SandboxSection() {
    const [mode, setMode] = useState('click')   // 'click' | 'preset'
    const [preset, setPreset] = useState('ten')
    const [cities, setCities] = useState(PRESETS.ten.cities)
    const [params, setParams] = useState({
        m: 20, iterations: 100,
        alpha: 1.0, beta: 2.0, rho: 0.5, Q: 1.0,
        e: 3.0, w: 6,
    })
    const [algo, setAlgo] = useState('as')      // 'as' | 'eas' | 'asrank'
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [drawnCount, setDrawnCount] = useState(0)

    const handleCanvasClick = (e) => {
        if (mode !== 'click') return
        const svg = e.currentTarget
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
        const x = Math.max(0, Math.min(700, svgP.x))
        const y = Math.max(0, Math.min(420, svgP.y))
        setCities(prev => [...prev, { x: Math.round(x), y: Math.round(y) }])
        setResult(null); setDrawnCount(0)
    }

    const randomCities = (n) => {
        const c = []
        for (let i = 0; i < n; i++) {
            c.push({ x: Math.round(40 + Math.random() * 620), y: Math.round(30 + Math.random() * 360) })
        }
        setCities(c); setResult(null); setDrawnCount(0)
    }

    const applyPreset = (key) => {
        setPreset(key)
        setCities(PRESETS[key].cities.map(c => ({ ...c })))
        setResult(null); setDrawnCount(0)
    }

    const clearCities = () => { setCities([]); setResult(null); setDrawnCount(0) }

    const setP = (k) => (v) => setParams(p => ({ ...p, [k]: v }))

    const run = async () => {
        if (cities.length < 3) return
        setLoading(true); setResult(null); setDrawnCount(0)
        try {
            const res = await fetch(`${API_BASE_URL}/run/${algo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cities, ...params }),
            })
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json()
            setResult(data)
        } catch (err) {
            console.error(err)
            alert(`Failed to run ${algo.toUpperCase()}: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // progressive draw
    useEffect(() => {
        if (!result?.best_tour) return
        setDrawnCount(0)
        const total = result.best_tour.length
        let i = 0
        const iv = setInterval(() => {
            i++
            setDrawnCount(i)
            if (i >= total) clearInterval(iv)
        }, 80)
        return () => clearInterval(iv)
    }, [result])

    return (
        <>
            <Section title="City Map" subtitle="Place cities by clicking the canvas or load a preset problem">
                <div className="pill-tabs">
                    <button className={`pill-tab ${mode === 'click' ? 'active' : ''}`}
                            onClick={() => setMode('click')}>Click to place</button>
                    <button className={`pill-tab ${mode === 'preset' ? 'active' : ''}`}
                            onClick={() => setMode('preset')}>Preset problems</button>
                </div>

                {mode === 'preset' && (
                    <div className="controls-row" style={{ marginBottom: 16 }}>
                        <div className="control-group">
                            <label>Preset</label>
                            <select className="text-input" value={preset}
                                    onChange={(e) => applyPreset(e.target.value)}>
                                {Object.entries(PRESETS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="canvas-toolbar">
                    <button className="btn-sm" onClick={() => randomCities(10)}>Random 10</button>
                    <button className="btn-sm" onClick={() => randomCities(20)}>Random 20</button>
                    <button className="btn-sm" onClick={() => randomCities(30)}>Random 30</button>
                    <button className="btn-sm btn-outline" onClick={clearCities}>Clear</button>
                    {loading && <span className="running-badge">
                        <span className="spinner spinner-light"></span>Running {algo.toUpperCase()}...
                    </span>}
                    <span className="count">City count: {cities.length}</span>
                </div>

                <CityCanvas
                    cities={cities}
                    tour={result?.best_tour}
                    drawnCount={drawnCount}
                    onClick={handleCanvasClick}
                />

                {result && (
                    <div className="stats-strip">
                        <div className="stat-item">
                            <span className="stat-label">Best tour</span>
                            <span className="stat-val">{result.best_cost}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Found at iter</span>
                            <span className="stat-val">{result.found_at_iteration}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Time</span>
                            <span className="stat-val">{result.time_ms} ms</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Cities</span>
                            <span className="stat-val">{cities.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Ants</span>
                            <span className="stat-val">{params.m}</span>
                        </div>
                    </div>
                )}
            </Section>

            <Section title="Algorithm" subtitle="Select variant and configure parameters">
                <div className="algo-selector">
                    <button className={`algo-chip ${algo === 'as' ? 'active' : ''}`}
                            onClick={() => setAlgo('as')}>AS</button>
                    <button className={`algo-chip ${algo === 'eas' ? 'active' : ''}`}
                            onClick={() => setAlgo('eas')}>Elitist AS</button>
                    <button className={`algo-chip ${algo === 'asrank' ? 'active' : ''}`}
                            onClick={() => setAlgo('asrank')}>AS_rank</button>
                </div>

                <div className="controls-row">
                    <Slider label="Ants m"          value={params.m}          min={5}    max={50}   step={1}
                            onChange={setP('m')} />
                    <Slider label="Iterations"      value={params.iterations} min={10}   max={200}  step={1}
                            onChange={setP('iterations')} />
                    <Slider label="α (pheromone)"   value={params.alpha}      min={0.1}  max={5.0}  step={0.1}
                            onChange={setP('alpha')} fmt={(v) => v.toFixed(1)} />
                </div>
                <div className="controls-row">
                    <Slider label="β (heuristic)"   value={params.beta}       min={0.1}  max={5.0}  step={0.1}
                            onChange={setP('beta')} fmt={(v) => v.toFixed(1)} />
                    <Slider label="ρ (evaporation)" value={params.rho}        min={0.01} max={0.99} step={0.01}
                            onChange={setP('rho')} fmt={(v) => v.toFixed(2)} />
                    <Slider label="Q"               value={params.Q}          min={0.1}  max={10.0} step={0.1}
                            onChange={setP('Q')} fmt={(v) => v.toFixed(1)} />
                </div>

                {algo === 'eas' && (
                    <div className="controls-row">
                        <Slider label="e (elitist weight)" value={params.e} min={1} max={10} step={1}
                                onChange={setP('e')} />
                        <div className="control-group" />
                        <div className="control-group" />
                    </div>
                )}
                {algo === 'asrank' && (
                    <div className="controls-row">
                        <Slider label="w (rank window)" value={params.w} min={2} max={10} step={1}
                                onChange={setP('w')} />
                        <div className="control-group" />
                        <div className="control-group" />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                    <button className="btn-primary" onClick={run} disabled={loading || cities.length < 3}>
                        {loading ? <span className="spinner"></span> : null}
                        {loading ? 'Running...' : `Run ${algo.toUpperCase()}`}
                    </button>
                    <span className="config-chip">n = {cities.length}</span>
                    <span className="config-chip">{algo.toUpperCase()}</span>
                </div>
            </Section>

            {result && (
                <Section title="Results" subtitle="Best tour cost and convergence trajectory">
                    <div className="results-grid">
                        <div className="result-card">
                            <div className="label">Best Tour Length</div>
                            <div className="value">{result.best_cost}</div>
                        </div>
                        <div className="result-card">
                            <div className="label">Found at Iteration</div>
                            <div className="value">{result.found_at_iteration}</div>
                        </div>
                        <div className="result-card">
                            <div className="label">Time</div>
                            <div className="value">{result.time_ms}</div>
                            <div className="unit">ms</div>
                        </div>
                        <div className="result-card">
                            <div className="label">Iterations</div>
                            <div className="value">{params.iterations}</div>
                        </div>
                    </div>

                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={result.convergence}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="iteration" stroke="#64748b" minTickGap={25} tickMargin={10} />
                                <YAxis stroke="#64748b" tickMargin={10} width={60} />
                                <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    labelStyle={{ color: '#a3a3a3' }}
                                    itemStyle={{ color: '#ffffff' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="cost" name="Best tour length"
                                      stroke="#ffffff" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Section>
            )}
        </>
    )
}

// ---------------- PHEROMONES TAB ----------------
// shares state with Sandbox via an in-memory store
function PheromonesSection({ lastResult, lastCities }) {
    const [view, setView] = useState('final')    // 'final' | 'initial' | 'delta'

    if (!lastResult) {
        return (
            <Section title="Pheromones" subtitle="Run an algorithm in Sandbox to populate the pheromone matrix">
                <p style={{ color: 'var(--text-muted)' }}>
                    No pheromone data yet. Switch to Sandbox, place cities, and run an algorithm.
                </p>
            </Section>
        )
    }

    const n = lastResult.pheromone.length
    const tau0 = lastResult.pheromone_initial || 0

    // build displayed matrix based on view
    const matrix = useMemo(() => {
        if (view === 'initial') {
            return Array.from({ length: n }, () =>
                Array.from({ length: n }, () => tau0))
        }
        if (view === 'delta') {
            return lastResult.pheromone.map(row => row.map(v => v - tau0))
        }
        return lastResult.pheromone
    }, [view, lastResult, n, tau0])

    // normalize for color intensity
    let maxVal = 0
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
        if (i !== j && matrix[i][j] > maxVal) maxVal = matrix[i][j]
    if (maxVal <= 0) maxVal = 1

    // top edges
    const topEdges = useMemo(() => {
        const m = lastResult.pheromone
        const list = []
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                list.push({ i, j, v: m[i][j] })
            }
        }
        list.sort((a, b) => b.v - a.v)
        return list.slice(0, 10)
    }, [lastResult, n])

    const maxEdge = topEdges[0]?.v || 1

    return (
        <>
            <Section title="Pheromone Matrix" subtitle="Edge-level pheromone intensity after the last run">
                <div className="pill-tabs">
                    <button className={`pill-tab ${view === 'final' ? 'active' : ''}`}
                            onClick={() => setView('final')}>Final state</button>
                    <button className={`pill-tab ${view === 'initial' ? 'active' : ''}`}
                            onClick={() => setView('initial')}>Initial state</button>
                    <button className={`pill-tab ${view === 'delta' ? 'active' : ''}`}
                            onClick={() => setView('delta')}>Delta (change)</button>
                </div>

                <div className="matrix-wrapper">
                    <table className="matrix-table">
                        <thead>
                            <tr>
                                <th>τ</th>
                                {Array.from({ length: n }).map((_, j) => <th key={j}>{j}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.map((row, i) => (
                                <tr key={i}>
                                    <td>{i}</td>
                                    {row.map((v, j) => {
                                        const norm = i === j ? 0 : Math.max(0, Math.min(1, v / maxVal))
                                        const bg = `rgba(255,255,255,${norm * 0.45})`
                                        const color = norm > 0.55 ? '#000' : '#a3a3a3'
                                        return (
                                            <td key={j} className="phero-cell"
                                                style={{ background: i === j ? 'transparent' : bg, color }}>
                                                {i === j ? '—' : v.toFixed(3)}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="Top Edges" subtitle="Ten strongest pheromone trails">
                <div className="edge-rank-list">
                    {topEdges.map((e, idx) => (
                        <div key={`${e.i}-${e.j}`} className="edge-rank-row">
                            <span className="edge-rank-pos">#{idx + 1}</span>
                            <span className="edge-rank-label">City {e.i} → City {e.j}</span>
                            <span className="edge-rank-bar-track">
                                <span className="edge-rank-bar-fill"
                                      style={{ width: `${(e.v / maxEdge) * 100}%` }} />
                            </span>
                            <span className="edge-rank-val">{e.v.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </Section>
        </>
    )
}

// ---------------- COMPARE TAB ----------------
function CompareSection({ sharedCities }) {
    const [cities, setCities] = useState(sharedCities?.length ? sharedCities : PRESETS.fifteen.cities)
    const [params, setParams] = useState({
        m: 20, iterations: 100, alpha: 1.0, beta: 2.0, rho: 0.5, Q: 1.0, e: 3.0, w: 6,
    })
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)

    const setP = (k) => (v) => setParams(p => ({ ...p, [k]: v }))

    useEffect(() => {
        if (sharedCities?.length) setCities(sharedCities)
    }, [sharedCities])

    const runAll = async () => {
        if (cities.length < 3) return
        setLoading(true); setResults(null)
        try {
            const responses = await Promise.all([
                fetch(`${API_BASE_URL}/run/as`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ cities, ...params }) }),
                fetch(`${API_BASE_URL}/run/eas`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ cities, ...params }) }),
                fetch(`${API_BASE_URL}/run/asrank`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ cities, ...params }) }),
            ])

            for (const res of responses) {
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
            }

            const [as, eas, asrank] = await Promise.all(responses.map(r => r.json()))
            setResults({ as, eas, asrank })
        } catch (err) {
            console.error('Comparison API Error:', err)
            alert(`Failed to run comparison: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // merge convergences into one dataset
    const mergedConv = useMemo(() => {
        if (!results) return []
        const len = Math.max(
            results.as.convergence.length,
            results.eas.convergence.length,
            results.asrank.convergence.length,
        )
        const out = []
        for (let i = 0; i < len; i++) {
            out.push({
                iteration: i + 1,
                AS: results.as.convergence[i]?.cost,
                EAS: results.eas.convergence[i]?.cost,
                AS_rank: results.asrank.convergence[i]?.cost,
            })
        }
        return out
    }, [results])

    // winner = lowest best_cost
    const winner = useMemo(() => {
        if (!results) return null
        const entries = [
            ['as', results.as.best_cost],
            ['eas', results.eas.best_cost],
            ['asrank', results.asrank.best_cost],
        ]
        return entries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0]
    }, [results])

    const improvement = (cost) => {
        if (!results) return '—'
        const base = results.as.best_cost
        if (!base) return '—'
        const pct = ((base - cost) / base) * 100
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
    }

    return (
        <>
            <Section title="Compare All Variants" subtitle="Run AS, Elitist AS, and AS_rank on the same problem">
                <div className="controls-row" style={{ marginBottom: 16 }}>
                    <div className="control-group">
                        <label>Problem</label>
                        <select className="text-input"
                                onChange={(e) => setCities(PRESETS[e.target.value].cities.map(c => ({ ...c })))}>
                            {Object.entries(PRESETS).filter(([k]) => k !== 'custom').map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="control-group">
                        <label>Cities loaded <strong>{cities.length}</strong></label>
                        <div style={{ height: 4 }} />
                    </div>
                </div>

                <div className="controls-row">
                    <Slider label="Ants m"          value={params.m}          min={5}    max={50}   step={1}
                            onChange={setP('m')} />
                    <Slider label="Iterations"      value={params.iterations} min={10}   max={200}  step={1}
                            onChange={setP('iterations')} />
                    <Slider label="α"               value={params.alpha}      min={0.1}  max={5.0}  step={0.1}
                            onChange={setP('alpha')} fmt={(v) => v.toFixed(1)} />
                </div>
                <div className="controls-row">
                    <Slider label="β"               value={params.beta}       min={0.1}  max={5.0}  step={0.1}
                            onChange={setP('beta')} fmt={(v) => v.toFixed(1)} />
                    <Slider label="ρ"               value={params.rho}        min={0.01} max={0.99} step={0.01}
                            onChange={setP('rho')} fmt={(v) => v.toFixed(2)} />
                    <Slider label="Q"               value={params.Q}          min={0.1}  max={10.0} step={0.1}
                            onChange={setP('Q')} fmt={(v) => v.toFixed(1)} />
                </div>
                <div className="controls-row">
                    <Slider label="e (EAS)"         value={params.e}          min={1}    max={10}   step={1}
                            onChange={setP('e')} />
                    <Slider label="w (AS_rank)"     value={params.w}          min={2}    max={10}   step={1}
                            onChange={setP('w')} />
                    <div className="control-group" />
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button className="btn-primary" onClick={runAll} disabled={loading || cities.length < 3}>
                        {loading ? <span className="spinner"></span> : null}
                        {loading ? 'Running all three...' : 'Run All 3'}
                    </button>
                </div>
            </Section>

            {results && (
                <>
                    <Section title="Head-to-Head Results" subtitle="Best cost, time, and convergence iteration per variant">
                        <div className="compare-grid">
                            {[
                                ['as', 'AS', results.as],
                                ['eas', 'Elitist AS', results.eas],
                                ['asrank', 'AS_rank', results.asrank],
                            ].map(([k, name, r]) => (
                                <div key={k} className={`compare-col ${winner === k ? 'winner' : ''}`}>
                                    <h3>{name} <span className="type-badge">{k}</span></h3>
                                    <div className="big-num">{r.best_cost}</div>
                                    <div className="big-label">Best tour length</div>
                                    <div className="meta-row"><span>Found at</span><span>iter {r.found_at_iteration}</span></div>
                                    <div className="meta-row"><span>Time</span><span>{r.time_ms} ms</span></div>
                                    <div className="meta-row"><span>vs AS</span><span>{k === 'as' ? 'baseline' : improvement(r.best_cost)}</span></div>
                                </div>
                            ))}
                        </div>

                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height={340}>
                                <LineChart data={mergedConv}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="iteration" stroke="#64748b" minTickGap={25} tickMargin={10} />
                                    <YAxis stroke="#64748b" tickMargin={10} width={60} />
                                    <Tooltip
                                        contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                        labelStyle={{ color: '#a3a3a3' }}
                                    />
                                    <Legend formatter={(value) => <span style={{ color: '#a3a3a3', fontSize: '0.85rem' }}>{value}</span>} />
                                    <Line type="monotone" dataKey="AS"      stroke="#6b7280" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="EAS"     stroke="#a3a3a3" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="AS_rank" stroke="#ffffff" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <table className="theory-table">
                            <thead>
                                <tr>
                                    <th>Algorithm</th>
                                    <th>Update Rule</th>
                                    <th>Extra Params</th>
                                    <th>Best Tour</th>
                                    <th>Time (ms)</th>
                                    <th>Converged at</th>
                                    <th>Complexity</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>AS</td>
                                    <td>(1−ρ)τ + Σ Δτ^k</td>
                                    <td>—</td>
                                    <td>{results.as.best_cost}</td>
                                    <td>{results.as.time_ms}</td>
                                    <td>iter {results.as.found_at_iteration}</td>
                                    <td>O(m·n²)</td>
                                </tr>
                                <tr>
                                    <td>Elitist AS</td>
                                    <td>AS + e·Δτ_bs</td>
                                    <td>e = {params.e}</td>
                                    <td>{results.eas.best_cost}</td>
                                    <td>{results.eas.time_ms}</td>
                                    <td>iter {results.eas.found_at_iteration}</td>
                                    <td>O(m·n²)</td>
                                </tr>
                                <tr>
                                    <td>AS_rank</td>
                                    <td>(1−ρ)τ + Σ w_r·Δτ^r + w·Δτ_bs</td>
                                    <td>w = {params.w}</td>
                                    <td>{results.asrank.best_cost}</td>
                                    <td>{results.asrank.time_ms}</td>
                                    <td>iter {results.asrank.found_at_iteration}</td>
                                    <td>O(m·n² + m·log m)</td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    <Section title="Tour Overlay" subtitle="Best tour found by each variant on the same city map">
                        <div className="tour-trio">
                            {[
                                ['AS', results.as],
                                ['Elitist AS', results.eas],
                                ['AS_rank', results.asrank],
                            ].map(([name, r]) => (
                                <div key={name}>
                                    <div className="tour-mini">
                                        <CityCanvas
                                            cities={cities}
                                            tour={r.best_tour}
                                            drawnCount={r.best_tour?.length || 0}
                                            height={240}
                                        />
                                    </div>
                                    <div className="tour-mini-label">{name} — {r.best_cost}</div>
                                </div>
                            ))}
                        </div>
                    </Section>
                </>
            )}
        </>
    )
}

// ---------------- FOOTER ----------------
function Footer() {
    return (
        <footer className="app-footer">
            <span className="footer-copy">© Viraj Choudhary</span>
            <div className="footer-links">
                <a href="https://github.com/virajchoudhary" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="https://www.linkedin.com/in/virajchoudhary" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="https://x.com/virajchoudhary_" target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="mailto:virajc188@gmail.com">Email</a>
            </div>
        </footer>
    )
}

// ---------------- APP ROOT ----------------
export default function App() {
    const [activeTab, setActiveTab] = useState('theory')
    // lift last sandbox result so Pheromones tab can read it
    const [lastResult, setLastResult] = useState(null)
    const [lastCities, setLastCities] = useState([])

    // expose a lightweight bridge: Sandbox pushes into these via window (simplest pattern)
    // we use a ref-based listener to avoid prop-drilling complexity
    useEffect(() => {
        const handler = (e) => {
            setLastResult(e.detail.result)
            setLastCities(e.detail.cities)
        }
        window.addEventListener('pn:sandbox-result', handler)
        return () => window.removeEventListener('pn:sandbox-result', handler)
    }, [])

    const tabs = [
        { id: 'theory',     label: 'Theory' },
        { id: 'sandbox',    label: 'Sandbox' },
        { id: 'pheromones', label: 'Pheromones' },
        { id: 'compare',    label: 'Compare' },
    ]

    const renderTab = () => {
        switch (activeTab) {
            case 'theory':     return <TheorySection />
            case 'sandbox':    return <SandboxBridge onResult={(r, c) => { setLastResult(r); setLastCities(c) }} />
            case 'pheromones': return <PheromonesSection lastResult={lastResult} lastCities={lastCities} />
            case 'compare':    return <CompareSection sharedCities={lastCities} />
            default:           return null
        }
    }

    return (
        <div className="app-layout">
            <nav className="sidebar">
                {tabs.map(t => (
                    <button key={t.id}
                            className={`sidebar-item ${activeTab === t.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </nav>
            <main className="main-content">
                <header className="app-header">
                    <h1>Pheromone Nexus</h1>
                    <p>Elitist and Rank-Based Ant Colony Optimization on the Travelling Salesman Problem</p>
                </header>
                <div className="page-content">
                    {renderTab()}
                </div>
                <Footer />
            </main>
        </div>
    )
}

// thin wrapper so SandboxSection can surface its last result up to App
function SandboxBridge({ onResult }) {
    return (
        <SandboxWithBridge onResult={onResult} />
    )
}

// SandboxSection clone with a useEffect to forward result/cities up
function SandboxWithBridge({ onResult }) {
    // same implementation as SandboxSection but with an onResult callback
    const [mode, setMode] = useState('click')
    const [preset, setPreset] = useState('ten')
    const [cities, setCities] = useState(PRESETS.ten.cities)
    const [params, setParams] = useState({
        m: 20, iterations: 100,
        alpha: 1.0, beta: 2.0, rho: 0.5, Q: 1.0,
        e: 3.0, w: 6,
    })
    const [algo, setAlgo] = useState('as')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [drawnCount, setDrawnCount] = useState(0)

    useEffect(() => { if (result) onResult(result, cities) }, [result]) // eslint-disable-line

    const handleCanvasClick = (e) => {
        if (mode !== 'click') return
        const svg = e.currentTarget
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
        const x = Math.max(0, Math.min(700, svgP.x))
        const y = Math.max(0, Math.min(420, svgP.y))
        setCities(prev => [...prev, { x: Math.round(x), y: Math.round(y) }])
        setResult(null); setDrawnCount(0)
    }

    const randomCities = (n) => {
        const c = []
        for (let i = 0; i < n; i++) {
            c.push({ x: Math.round(40 + Math.random() * 620), y: Math.round(30 + Math.random() * 360) })
        }
        setCities(c); setResult(null); setDrawnCount(0)
    }

    const applyPreset = (key) => {
        setPreset(key)
        setCities(PRESETS[key].cities.map(c => ({ ...c })))
        setResult(null); setDrawnCount(0)
    }

    const clearCities = () => { setCities([]); setResult(null); setDrawnCount(0) }
    const setP = (k) => (v) => setParams(p => ({ ...p, [k]: v }))

    const run = async () => {
        if (cities.length < 3) return
        setLoading(true); setResult(null); setDrawnCount(0)
        try {
            const res = await fetch(`${API_BASE_URL}/run/${algo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cities, ...params }),
            })
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json()
            setResult(data)
        } catch (err) {
            console.error(err)
            alert(`Failed to run ${algo.toUpperCase()}: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!result?.best_tour) return
        setDrawnCount(0)
        const total = result.best_tour.length
        let i = 0
        const iv = setInterval(() => {
            i++
            setDrawnCount(i)
            if (i >= total) clearInterval(iv)
        }, 80)
        return () => clearInterval(iv)
    }, [result])

    return (
        <>
            <Section title="City Map" subtitle="Place cities by clicking the canvas or load a preset problem">
                <div className="pill-tabs">
                    <button className={`pill-tab ${mode === 'click' ? 'active' : ''}`}
                            onClick={() => setMode('click')}>Click to place</button>
                    <button className={`pill-tab ${mode === 'preset' ? 'active' : ''}`}
                            onClick={() => setMode('preset')}>Preset problems</button>
                </div>

                {mode === 'preset' && (
                    <div className="controls-row" style={{ marginBottom: 16 }}>
                        <div className="control-group">
                            <label>Preset</label>
                            <select className="text-input" value={preset}
                                    onChange={(e) => applyPreset(e.target.value)}>
                                {Object.entries(PRESETS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="canvas-toolbar">
                    <button className="btn-sm" onClick={() => randomCities(10)}>Random 10</button>
                    <button className="btn-sm" onClick={() => randomCities(20)}>Random 20</button>
                    <button className="btn-sm" onClick={() => randomCities(30)}>Random 30</button>
                    <button className="btn-sm btn-outline" onClick={clearCities}>Clear</button>
                    {loading && <span className="running-badge">
                        <span className="spinner spinner-light"></span>Running {algo.toUpperCase()}...
                    </span>}
                    <span className="count">City count: {cities.length}</span>
                </div>

                <CityCanvas
                    cities={cities}
                    tour={result?.best_tour}
                    drawnCount={drawnCount}
                    onClick={handleCanvasClick}
                />

                {result && (
                    <div className="stats-strip">
                        <div className="stat-item">
                            <span className="stat-label">Best tour</span>
                            <span className="stat-val">{result.best_cost}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Found at iter</span>
                            <span className="stat-val">{result.found_at_iteration}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Time</span>
                            <span className="stat-val">{result.time_ms} ms</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Cities</span>
                            <span className="stat-val">{cities.length}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Ants</span>
                            <span className="stat-val">{params.m}</span>
                        </div>
                    </div>
                )}
            </Section>

            <Section title="Algorithm" subtitle="Select variant and configure parameters">
                <div className="algo-selector">
                    <button className={`algo-chip ${algo === 'as' ? 'active' : ''}`}
                            onClick={() => setAlgo('as')}>AS</button>
                    <button className={`algo-chip ${algo === 'eas' ? 'active' : ''}`}
                            onClick={() => setAlgo('eas')}>Elitist AS</button>
                    <button className={`algo-chip ${algo === 'asrank' ? 'active' : ''}`}
                            onClick={() => setAlgo('asrank')}>AS_rank</button>
                </div>

                <div className="controls-row">
                    <Slider label="Ants m"          value={params.m}          min={5}    max={50}   step={1}
                            onChange={setP('m')} />
                    <Slider label="Iterations"      value={params.iterations} min={10}   max={200}  step={1}
                            onChange={setP('iterations')} />
                    <Slider label="α (pheromone)"   value={params.alpha}      min={0.1}  max={5.0}  step={0.1}
                            onChange={setP('alpha')} fmt={(v) => v.toFixed(1)} />
                </div>
                <div className="controls-row">
                    <Slider label="β (heuristic)"   value={params.beta}       min={0.1}  max={5.0}  step={0.1}
                            onChange={setP('beta')} fmt={(v) => v.toFixed(1)} />
                    <Slider label="ρ (evaporation)" value={params.rho}        min={0.01} max={0.99} step={0.01}
                            onChange={setP('rho')} fmt={(v) => v.toFixed(2)} />
                    <Slider label="Q"               value={params.Q}          min={0.1}  max={10.0} step={0.1}
                            onChange={setP('Q')} fmt={(v) => v.toFixed(1)} />
                </div>

                {algo === 'eas' && (
                    <div className="controls-row">
                        <Slider label="e (elitist weight)" value={params.e} min={1} max={10} step={1}
                                onChange={setP('e')} />
                        <div className="control-group" />
                        <div className="control-group" />
                    </div>
                )}
                {algo === 'asrank' && (
                    <div className="controls-row">
                        <Slider label="w (rank window)" value={params.w} min={2} max={10} step={1}
                                onChange={setP('w')} />
                        <div className="control-group" />
                        <div className="control-group" />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={run} disabled={loading || cities.length < 3}>
                        {loading ? <span className="spinner"></span> : null}
                        {loading ? 'Running...' : `Run ${algo === 'asrank' ? 'AS_rank' : algo.toUpperCase()}`}
                    </button>
                    <span className="config-chip">n = {cities.length}</span>
                    <span className="config-chip">{algo === 'asrank' ? 'AS_rank' : algo.toUpperCase()}</span>
                </div>
            </Section>

            {result && (
                <Section title="Results" subtitle="Best tour cost and convergence trajectory">
                    <div className="results-grid">
                        <div className="result-card">
                            <div className="label">Best Tour Length</div>
                            <div className="value">{result.best_cost}</div>
                        </div>
                        <div className="result-card">
                            <div className="label">Found at Iteration</div>
                            <div className="value">{result.found_at_iteration}</div>
                        </div>
                        <div className="result-card">
                            <div className="label">Time</div>
                            <div className="value">{result.time_ms}</div>
                            <div className="unit">ms</div>
                        </div>
                        <div className="result-card">
                            <div className="label">Iterations</div>
                            <div className="value">{params.iterations}</div>
                        </div>
                    </div>

                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={result.convergence}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="iteration" stroke="#64748b" minTickGap={25} tickMargin={10} />
                                <YAxis stroke="#64748b" tickMargin={10} width={60} />
                                <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    labelStyle={{ color: '#a3a3a3' }}
                                    itemStyle={{ color: '#ffffff' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="cost" name="Best tour length"
                                      stroke="#ffffff" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Section>
            )}
        </>
    )
}
