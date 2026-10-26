
import { useEffect, useRef, useState } from 'react'
import './App.css'

type Square = { r: number; c: number }

const SIZE = 8

const MOVES: Square[] = [
  { r: -2, c: -1 }, { r: -2, c: 1 },
  { r: -1, c: -2 }, { r: -1, c: 2 },
  { r: 1, c: -2 }, { r: 1, c: 2 },
  { r: 2, c: -1 }, { r: 2, c: 1 },
]

const key = (s: Square) => `${s.r},${s.c}`
const inside = (s: Square) =>
  s.r >= 0 && s.r < SIZE && s.c >= 0 && s.c < SIZE

function getLegalMoves(pos: Square, used: Set<string>) {
  return MOVES
    .map(m => ({ r: pos.r + m.r, c: pos.c + m.c }))
    .filter(s => inside(s) && !used.has(key(s)))
}

// Backtracking + Warnsdorff's heuristic
function solveTour(start: Square): Square[] | null {
  const board = Array.from(
    { length: SIZE },
    () => Array<number>(SIZE).fill(-1),
  )
  const path: Square[] = [start]
  board[start.r][start.c] = 0

  function search(pos: Square, step: number): boolean {
    if (step === SIZE * SIZE) return true

    const candidates = MOVES
      .map(m => ({ r: pos.r + m.r, c: pos.c + m.c }))
      .filter(s => inside(s) && board[s.r][s.c] === -1)
      .map(s => ({
        square: s,
        degree: MOVES.filter(m => {
          const n = { r: s.r + m.r, c: s.c + m.c }
          return inside(n) && board[n.r][n.c] === -1
        }).length,
      }))
      .sort((a, b) => a.degree - b.degree)

    for (const { square } of candidates) {
      board[square.r][square.c] = step
      path.push(square)

      if (search(square, step + 1)) return true

      path.pop()
      board[square.r][square.c] = -1
    }

    return false
  }

  return search(start, 1) ? [...path] : null
}

export default function App() {
  const [start, setStart] = useState<Square>({ r: 7, c: 0 })
  const [path, setPath] = useState<Square[]>([{ r: 7, c: 0 }])
  const [hasChosenStart, setHasChosenStart] = useState(false)
  const [speed, setSpeed] = useState(120)
  const [playing, setPlaying] = useState(false)
  const [message, setMessage] = useState(
    'Choose a starting square, then move the knight or start the automatic solver.',
  )
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runId = useRef(0)

  const current = path[path.length - 1]
  const visited = new Set(path.map(key))
  const complete = path.length === 64
  const progress = Math.round(path.length / 64 * 100)

  const legal = playing || complete || !hasChosenStart
    ? new Set<string>()
    : new Set(getLegalMoves(current, visited).map(key))

  function reset() {
    runId.current++
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setPlaying(false)
    setPath([start])
    setHasChosenStart(true)
    setMessage('Choose a legal move or start the automatic solver.')
  }

  function chooseSquare(s: Square) {
    if (playing) return

    // Allow changing the starting square before the first move.
    if (!hasChosenStart && path.length === 1 && !complete) {
      setStart(s)
      setPath([s])
      setHasChosenStart(true)
      setMessage('Starting square selected. Move the knight or find the solution.')
      return
    }

    if (!legal.has(key(s))) return

    const next = [...path, s]
    setPath(next)
    setMessage(
      next.length === 64
        ? 'Congratulations! All 64 squares have been visited.'
        : `Move ${next.length - 1}. ${64 - next.length} squares remaining.`,
    )
  }

  async function solve() {
    reset()

    // Wait for the next tick so the reset can take effect.
    await new Promise(resolve => setTimeout(resolve, 0))

    const id = runId.current
    const result = solveTour(start)

    if (!result) {
      setMessage('No route was found.')
      return
    }

    setPath([result[0]])
    setPlaying(true)
    setMessage('The algorithm is following the route...')

    for (let i = 1; i < result.length; i++) {
      await new Promise<void>(resolve => {
        timer.current = setTimeout(resolve, speed)
      })

      if (runId.current !== id) return
      setPath(result.slice(0, i + 1))
    }

    if (runId.current === id) {
      setPlaying(false)
      setMessage('Tour complete! 64 of 64 squares visited.')
    }
  }

  useEffect(() => {
    return () => {
      runId.current++
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function stepNumber(s: Square) {
    const i = path.findIndex(p => key(p) === key(s))
    return i < 0 ? '' : i + 1
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-icon">♞</div>
        <div className="brand-text">
          <span className="eyebrow">ALGORITHM LAB / 01</span>
          <h1>Knight's Tour</h1>
        </div>
        <span className="status"><i /> React + TypeScript</span>
      </header>

      <section className="intro">
        <span className="eyebrow">COMPUTER SCIENCE PROBLEM</span>
        <h2>One knight. 64 squares.<br />
          <span>One complete tour.</span>
        </h2>
        <p>Visit every square exactly once using legal knight moves.</p>
      </section>

      <section className="workspace">
        <div className="board-panel">
          <div className="panel-heading">
            <div>
              <h3>Chessboard</h3>
              <p>Move {path.length} of 64</p>
            </div>
            <strong className="counter">{String(path.length).padStart(2, '0')}
              <small> / 64</small>
            </strong>
          </div>

          <div className="board-wrap">
            <div className="ranks">
              {Array.from({ length: 8 }, (_, i) => <span key={i}>{8 - i}</span>)}
            </div>

            <div className="board">
              {Array.from({ length: 8 }, (_, r) =>
                Array.from({ length: 8 }, (_, c) => {
                  const s = { r, c }
                  const k = key(s)
                  const isCurrent = k === key(current)
                  const isVisited = visited.has(k)
                  const isLegal = legal.has(k)

                  return (
                    <button
                      key={k}
                      aria-label={`Square ${String.fromCharCode(97 + c)}${8 - r}`}
                      className={[
                        'square',
                        (r + c) % 2 === 0 ? 'light' : 'dark',
                        isCurrent ? 'current' : '',
                        isVisited && !isCurrent ? 'visited' : '',
                        isLegal ? 'possible' : '',
                      ].join(' ')}
                      onClick={() => chooseSquare(s)}
                    >
                      {isCurrent
                        ? <span className="knight">♞</span>
                        : stepNumber(s)
                          ? <span className="step">{stepNumber(s)}</span>
                          : isLegal
                            ? <span className="dot" />
                            : null}
                    </button>
                  )
                }),
              )}
            </div>
          </div>

          <div className="files">
            {Array.from({ length: 8 }, (_, i) =>
              <span key={i}>{String.fromCharCode(97 + i)}</span>,
            )}
          </div>

          <div className="legend">
            <span><i className="legend-knight" /> Knight</span>
            <span><i className="legend-move" /> Legal move</span>
            <span><i className="legend-visited" /> Visited</span>
          </div>
        </div>

        <aside className="control-panel">
          <div className="eyebrow">CONTROL CENTER</div>
          <h3>Explore the tour</h3>
          <p className="description">Play manually or let the algorithm solve the problem.</p>

          <button className="primary" disabled={playing || complete} onClick={solve}>
            ▶ &nbsp; Find a solution
          </button>
          <button className="secondary" disabled={!playing} onClick={reset}>
            ■ &nbsp; Stop animation
          </button>
          <button className="secondary" onClick={reset}>
            ↺ &nbsp; Reset board
          </button>

          <div className="speed-control">
            <div className="label-row">
              <label htmlFor="speed">Animation speed</label>
              <span>{speed} ms</span>
            </div>
            <input
              id="speed"
              type="range"
              min="30"
              max="600"
              step="30"
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
            />
            <div className="range-labels"><span>Fast</span><span>Slow</span></div>
          </div>

          <div className="progress-section">
            <div className="label-row">
              <span>Progress</span><strong>{progress}%</strong>
            </div>
            <div className="progress-track">
              <div style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-bottom">
              <span>{path.length} visited</span>
              <span>{64 - path.length} remaining</span>
            </div>
          </div>

          <div className={`message ${complete ? 'success' : ''}`}>
            <span>{complete ? '✓' : '✳'}</span>
            {message}
          </div>
        </aside>
      </section>

      <footer>
        <span>KNIGHT'S TOUR</span>
        <span>BACKTRACKING + WARNSDORFF HEURISTIC</span>
      </footer>
    </main>
  )
}
