export const SOURCE_COLORS = [
  { bg: '#e74c3c', border: '#c0392b', light: '#fdf2f2', name: 'Red' },
  { bg: '#3498db', border: '#2980b9', light: '#ebf5fb', name: 'Blue' },
  { bg: '#27ae60', border: '#1e8449', light: '#eafaf1', name: 'Green' },
  { bg: '#f39c12', border: '#d68910', light: '#fef9e7', name: 'Orange' },
  { bg: '#9b59b6', border: '#7d3c98', light: '#f5eef8', name: 'Purple' },
  { bg: '#16a085', border: '#117a65', light: '#e8f8f5', name: 'Teal' },
];

export const TRANSPORT_MODES = [
  { id: 'transit', label: 'Transit', icon: '🚇', desc: 'Tube / Rail / Bus' },
  { id: 'bike',    label: 'Cycling', icon: '🚲', desc: 'Cycle routes' },
  { id: 'walk',    label: 'Walking', icon: '🚶', desc: 'On foot' },
  { id: 'car',     label: 'Driving', icon: '🚗', desc: 'By car' },
];

export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function formatDistance(metres) {
  if (!metres && metres !== 0) return '';
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}
