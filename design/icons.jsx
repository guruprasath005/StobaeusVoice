// Lucide-style line icons as React components.
// Usage: <Icon name="mic" size={16} />

const ICON_PATHS = {
  // navigation
  home:       'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z',
  mic:        'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM19 11a7 7 0 0 1-14 0M12 18v3M9 21h6',
  users:      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  fileText:   'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6M9 9h2',
  radio:      'M5 17a8 8 0 0 1 0-10M8 14a4 4 0 0 1 0-6M16 10a4 4 0 0 1 0 6M19 7a8 8 0 0 1 0 10M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  hospital:   'M3 21h18M5 21V7l7-4 7 4v14M9 9h2M13 9h2M9 13h2M13 13h2M9 17h6',
  alertTri:   'M10.3 3.86 1.82 18a2 2 0 0 0 1.7 3h16.96a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  scan:       'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10',
  pill:       'M10.5 20.5a7 7 0 0 1-9.9-9.9l9.9-9.9a7 7 0 0 1 9.9 9.9zM8.5 8.5l7 7',
  phone:      'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  calendar:   'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
  barChart:   'M3 21h18M7 21V10M12 21V4M17 21v-7',
  settings:   'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.96l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  help:       'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  logout:     'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  plus:       'M12 5v14M5 12h14',
  check:      'M20 6 9 17l-5-5',
  x:          'M18 6 6 18M6 6l12 12',
  search:     'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  send:       'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  save:       'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  download:   'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload:     'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  mail:       'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6 12 13 2 6',
  printer:    'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  cloud:      'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  whatsapp:   'M3 21l1.65-3.8A9 9 0 1 1 8.5 21H8L3 21zM7.5 12a4.5 4.5 0 0 0 4.5 4.5l1-1.5h1.5l1 1.5c.5 0 1.5-.5 1.5-1.5L15.5 14l-1-1.5 1-1L14 10c-1 0-1.5 1-1.5 1.5l-1 1L10 11l-1-1.5 1-1-1-1.5L7.5 7.5C7 7.5 6 8.5 6 9.5l1.5 1z',
  message:    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  globe:      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  mapPin:     'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  volume:     'M11 5 6 9H2v6h4l5 4zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07',
  pause:      'M6 4h4v16H6zM14 4h4v16h-4z',
  stop:       'M5 5h14v14H5z',
  play:       'M5 3v18l15-9z',
  zoomIn:     'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6',
  move:       'M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  sliders:    'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  edit:       'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z',
  chevDown:   'M6 9l6 6 6-6',
  chevRight:  'M9 6l6 6-6 6',
  squareEmpty:'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  squareCheck:'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 12l3 3 5-6',
  activity:   'M22 12h-4l-3 9L9 3l-3 9H2',
  clipboard:  'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z',
  list:       'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  user:       'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  keyboard:   'M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12',
  layoutGrid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  shield:     'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  rx:         null, // text "Rx"
};

function Icon({ name, size = 16, color, strokeWidth = 1.75, style }) {
  if (name === 'rx') {
    return (
      <span style={{
        fontFamily:'serif', fontWeight: 700, fontSize: size * 0.95,
        fontStyle:'italic', color: color || 'currentColor',
        display:'inline-block', lineHeight: 1, ...style,
      }}>Rx</span>
    );
  }
  const d = ICON_PATHS[name];
  if (!d) {
    // unknown icon — render a small dot so layout doesn't collapse
    return <span style={{ display:'inline-block', width: size, height: size, ...style }}/>;
  }
  // Some paths contain multiple subpaths separated by uppercase moveto — we
  // render as a single <path> since lucide does the same.
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
         fill="none" stroke={color || 'currentColor'}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{ display:'inline-block', verticalAlign:'-2px', flex:`0 0 ${size}px`, ...style }}
         aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

Object.assign(window, { Icon });
