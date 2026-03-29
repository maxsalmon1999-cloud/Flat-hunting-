import { useState, useRef } from 'react';
import IsochroneTab from './tabs/IsochroneTab.jsx';
import SearchAreaTab from './tabs/SearchAreaTab.jsx';
import ListingsTab from './tabs/ListingsTab.jsx';
import { SOURCE_COLORS } from './utils/colors.js';

let _id = 0;
const uid = () => ++_id;

const DEFAULT_SOURCES = [
  { id: uid(), label: 'Work A', address: '', latlng: null, colorIdx: 0 },
  { id: uid(), label: 'Work B', address: '', latlng: null, colorIdx: 1 },
];

const TABS = [
  { label: 'Isochrone Map', icon: '🗺', desc: 'Travel time catchment areas' },
  { label: 'Search Zone', icon: '✏️', desc: 'Draw area & set requirements' },
  { label: 'Listings', icon: '🏠', desc: 'Swipe through matching flats' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  // ── Tab 1: isochrone state ────────────────────────────────────────────────
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [isoMode, setIsoMode] = useState('transit');
  const [timeLimit, setTimeLimit] = useState(30);
  const [isochrones, setIsochrones] = useState([]);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('tt_key') || '');

  // ── Tab 2: search criteria ────────────────────────────────────────────────
  const [drawnArea, setDrawnArea] = useState(null);
  const [criteria, setCriteria] = useState({ minPrice: 800, maxPrice: 1800, amenities: [] });

  // ── Tab 3: listings ───────────────────────────────────────────────────────
  const [listings, setListings] = useState([]);
  const [savedListings, setSavedListings] = useState([]);

  const switchToListings = () => setActiveTab(2);

  return (
    <div className="app">
      <nav className="tab-nav">
        <div className="tab-nav__brand">London Flat Hunter</div>
        <div className="tab-nav__tabs">
          {TABS.map((tab, i) => (
            <button
              key={i}
              className={`tab-btn${activeTab === i ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab(i)}
              title={tab.desc}
            >
              <span className="tab-btn__icon">{tab.icon}</span>
              <span className="tab-btn__label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="tab-content">
        {activeTab === 0 && (
          <IsochroneTab
            sources={sources}
            setSources={setSources}
            mode={isoMode}
            setMode={setIsoMode}
            timeLimit={timeLimit}
            setTimeLimit={setTimeLimit}
            isochrones={isochrones}
            setIsochrones={setIsochrones}
            apiKey={apiKey}
            setApiKey={setApiKey}
          />
        )}

        {activeTab === 1 && (
          <SearchAreaTab
            isochrones={isochrones}
            drawnArea={drawnArea}
            setDrawnArea={setDrawnArea}
            criteria={criteria}
            setCriteria={setCriteria}
            onSearch={switchToListings}
          />
        )}

        {activeTab === 2 && (
          <ListingsTab
            drawnArea={drawnArea}
            criteria={criteria}
            listings={listings}
            setListings={setListings}
            savedListings={savedListings}
            setSavedListings={setSavedListings}
          />
        )}
      </div>
    </div>
  );
}
