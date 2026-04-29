import { useState, useMemo, useRef } from 'react'
import { cards as initialCards, IMAGE_BASE, IMAGE_CODE, HAS_REVERSE, RARITY_ORDER, RARITY_CONFIG } from './cardData.js'
import './App.css'

function parseCSV(text) {
  const lines = text.trim().split('\n')
  return lines.slice(1).map((line, i) => {
    const cols = line.split(',')
    return {
      number: parseInt(cols[0]) || i + 1,
      name: cols[1]?.trim() || '',
      rarity: cols[2]?.trim() || 'C',
      regular: cols[3]?.trim() ? parseInt(cols[3]) : 0,
      reverse: cols[4]?.trim() ? parseInt(cols[4]) : 0,
      price: parseFloat(cols[5]) || 0,
      value: parseFloat(cols[6]) || 0,
    }
  })
}

function RarityBadge({ rarity }) {
  const config = RARITY_CONFIG[rarity] || { label: rarity, color: '#94a3b8' }
  if (!config.color) {
    return <span className="rarity-badge rarity-rainbow">{rarity}</span>
  }
  return (
    <span
      className="rarity-badge"
      style={{ background: config.color + '22', color: config.color, borderColor: config.color + '66' }}
      title={config.label}
    >
      {rarity}
    </span>
  )
}

function CardItem({ card, dimmed, showReverse }) {
  const isOwned = card.regular > 0 || card.reverse > 0
  const hasReverse = HAS_REVERSE.has(card.rarity)

  return (
    <div className={`card-item${!isOwned || dimmed ? ' unowned' : ''}`}>
      <div className="card-img-wrap">
        <img
          src={`${IMAGE_BASE}/${IMAGE_CODE}_${card.number}.png`}
          alt={card.name}
          loading="lazy"
          onError={(e) => { e.target.style.opacity = '0.2' }}
        />
        {!isOwned && <div className="missing-label">Missing</div>}
      </div>
      <div className="card-info">
        <div className="card-meta">
          <span className="card-name">{card.name}</span>
          <span className="card-number">#{String(card.number).padStart(3, '0')}</span>
          <RarityBadge rarity={card.rarity} />
        </div>
        <div className="card-footer">
          <div className="card-counts">
            {!showReverse && (
              <span className={`count regular${card.regular > 0 ? ' has' : ''}`} title="Regular copies">
                {card.regular}
              </span>
            )}
            {hasReverse && (
              <span className={`count reverse${card.reverse > 0 ? ' has' : ''}`} title="Reverse holo copies">
                {card.reverse}
              </span>
            )}
          </div>
          <div className="card-value">
            <span className="price">${card.price.toFixed(2)}</span>
            {card.value > 0 && <span className="value">${card.value.toFixed(2)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function App() {
  const [cards, setCards] = useState(initialCards)
  const [filterRarity, setFilterRarity] = useState('all')
  const [filterOwned, setFilterOwned] = useState('all')
  const [sortBy, setSortBy] = useState('number')
  const [sortDir, setSortDir] = useState('asc')
  const [filterReverse, setFilterReverse] = useState(false)
  const fileRef = useRef(null)

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir(key === 'number' ? 'asc' : 'desc')
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => setCards(parseCSV(evt.target.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  const rarities = useMemo(
    () => RARITY_ORDER.filter(r => cards.some(c => c.rarity === r)),
    [cards]
  )

  const filtered = useMemo(() => {
    const list = cards.filter(c => {
      if (filterRarity !== 'all' && c.rarity !== filterRarity) return false
      if (filterReverse) {
        if (!HAS_REVERSE.has(c.rarity)) return false
        if (filterOwned === 'owned' && c.reverse === 0) return false
        if (filterOwned === 'missing' && c.reverse > 0) return false
      } else {
        const owned = c.regular > 0 || c.reverse > 0
        if (filterOwned === 'owned' && !owned) return false
        if (filterOwned === 'missing' && owned) return false
      }
      return true
    })

    list.sort((a, b) => {
      let diff = 0
      if (sortBy === 'number')   diff = a.number - b.number
      if (sortBy === 'price')    diff = a.price - b.price
      if (sortBy === 'quantity') diff = (a.regular + a.reverse) - (b.regular + b.reverse)
      if (sortBy === 'value')    diff = (a.regular + a.reverse) * a.price - (b.regular + b.reverse) * b.price
      return sortDir === 'asc' ? diff : -diff
    })

    return list
  }, [cards, filterRarity, filterOwned, filterReverse, sortBy, sortDir])

  const ownedCount = useMemo(() => cards.filter(c => c.regular > 0 || c.reverse > 0).length, [cards])
  const totalCopies = useMemo(() => cards.reduce((s, c) => s + c.regular + c.reverse, 0), [cards])
  const totalValue = useMemo(() => cards.reduce((s, c) => s + c.value, 0), [cards])
  const missingValue = useMemo(() => cards.filter(c => c.regular === 0).reduce((s, c) => s + c.price, 0), [cards])
  const completion = Math.round((ownedCount / cards.length) * 100)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1>Perfect Order</h1>
            <p className="set-subtitle">Master Set · {cards.length} cards</p>
          </div>
          <button className="upload-btn" onClick={() => fileRef.current.click()}>
            <UploadIcon />
            Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        <div className="progress-summary" aria-label={`${completion}% collection complete`}>
          <div>
            <span className="progress-kicker">Collection progress</span>
            <span className="progress-percent">{completion}%</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <div className="stats-row">
          <StatCard label="Total" value={totalCopies} />
          <StatCard label="Owned" value={`${ownedCount} / ${cards.length}`} />
          <StatCard label="Missing" value={cards.length - ownedCount} />
          <StatCard label="Value" value={`$${totalValue.toFixed(2)}`} />
          <StatCard label="Missing Value" value={`$${missingValue.toFixed(2)}`} />
          <StatCard label="Packs" value={(totalCopies / 10).toFixed(1)} />
        </div>
      </header>

      <div className="filters-bar">
        <div className="filter-row">
          <div className="filter-group">
            <button
              className={`filter-btn${filterRarity === 'all' ? ' active' : ''}`}
              onClick={() => setFilterRarity('all')}
            >
              All
            </button>
            {rarities.map(r => {
              const color = RARITY_CONFIG[r]?.color
              const isActive = filterRarity === r
              return (
                <button
                  key={r}
                  className={`filter-btn${isActive ? ' active' : ''}`}
                  style={isActive && color ? { borderColor: color, color } : {}}
                  onClick={() => setFilterRarity(r)}
                  title={RARITY_CONFIG[r]?.label}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            {[
              { key: 'all', label: 'All' },
              { key: 'owned', label: 'Owned' },
              { key: 'missing', label: 'Missing' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-btn${filterOwned === key ? ' active' : ''}`}
                onClick={() => setFilterOwned(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <button
              className={`filter-btn${filterReverse ? ' active' : ''}`}
              onClick={() => setFilterReverse(r => !r)}
            >
              Reverse
            </button>
          </div>

          <div className="filter-group sort-group">
            <span className="filter-label">Sort</span>
            {[
              { key: 'number',   label: '#' },
              { key: 'price',    label: 'Price' },
              { key: 'quantity', label: 'Qty' },
              { key: 'value',    label: 'Value' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-btn${sortBy === key ? ' active' : ''}`}
                onClick={() => handleSort(key)}
              >
                {label}
                {sortBy === key && (
                  <span className="sort-arrow">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </button>
            ))}
          </div>

          <span className="filter-count">{filtered.length} cards</span>
        </div>
      </div>

      <main className="card-grid">
        {filtered.map(card => (
          <CardItem key={card.number} card={card} dimmed={filterReverse && card.reverse === 0} showReverse={filterReverse} />
        ))}
      </main>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
