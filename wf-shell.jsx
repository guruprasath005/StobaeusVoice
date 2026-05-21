// Shared wireframe shell pieces: Sidebar, 3-col Screen frame, helpers.

const NAV_ITEMS = [
  { ico: 'home',       label: 'Home',              key: 'home' },
  { ico: 'mic',        label: 'Consultation',      key: 'consult' },
  { ico: 'users',      label: 'Patients',          key: 'patients' },
  { ico: 'fileText',   label: 'SOAP Notes',        key: 'soap' },
  { ico: 'radio',      label: 'Voice Agent',       key: 'voice' },
  { ico: 'hospital',   label: 'Nurse Station',     key: 'nurse' },
  { ico: 'alertTri',   label: 'Clinical Alerts',   key: 'alerts' },
  { ico: 'scan',       label: 'Radiology',         key: 'rad' },
  { ico: 'pill',       label: 'Prescriptions',     key: 'rx' },
  { ico: 'phone',      label: 'Patient Voice Bot', key: 'outbound' },
  { ico: 'calendar',   label: 'Appointment Bot',   key: 'appt' },
  { ico: 'barChart',   label: 'Analytics',         key: 'analytics' },
  { ico: 'settings',   label: 'Settings',          key: 'settings' },
];

function Sidebar({ active = 'home', dark = false }) {
  return (
    <div style={{
      width: 200, flex: '0 0 200px',
      borderRight: '1.5px solid ' + (dark ? '#334155' : '#1a1a1a'),
      padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4,
      background: dark ? '#0f172a' : '#fff',
      color: dark ? '#cbd5e1' : '#1a1a1a',
      borderRadius: '12px 0 0 12px',
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding: '6px 8px 16px' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, background:'#0EA5E9', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize: 13,
          fontFamily:'Kalam, cursive',
        }}>S</div>
        <div style={{ fontFamily:'Kalam, cursive', fontWeight:700, fontSize: 15 }}>
          Stobaeus<span style={{ color:'#0EA5E9' }}>Voice</span>
        </div>
      </div>

      {NAV_ITEMS.map(n => (
        <div key={n.key} className={'wf-nav' + (n.key === active ? ' active' : '')}
             style={ n.key === active ? {} : { color: dark ? '#cbd5e1' : '#2a2a2a' } }>
          <Icon name={n.ico} size={15} />
          <span>{n.label}</span>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      {/* Upgrade card */}
      <div className="wf-box-dash" style={{
        padding: 10, fontSize: 11, textAlign:'center',
        background: dark ? '#1e293b' : '#E0F2FE', borderColor: dark ? '#475569' : '#0EA5E9',
        color: dark ? '#cbd5e1' : '#0c4a6e',
      }}>
        <div className="wf-hand" style={{ fontWeight:700, marginBottom: 4 }}>Upgrade to Pro</div>
        <div style={{ marginBottom: 6, lineHeight: 1.3 }}>Unlock multi-doctor + ABDM full</div>
        <div className="wf-btn wf-btn-primary" style={{ padding: '5px 10px', fontSize: 11 }}>Upgrade</div>
      </div>

      <div style={{ marginTop: 8, display:'flex', flexDirection:'column', gap: 2 }}>
        <div className="wf-nav"><Icon name="help" size={15}/><span>Help</span></div>
        <div className="wf-nav"><Icon name="logout" size={15}/><span>Log out</span></div>
      </div>
    </div>
  );
}

// ScreenFrame: gives every artboard the outer rounded card + optional sidebar.
function ScreenFrame({ children, sidebar = true, active = 'home', dark = false, noBorder = false, label = '' }) {
  const bg = dark ? '#0f172a' : '#fff';
  const fg = dark ? '#e2e8f0' : '#1a1a1a';
  return (
    <div className="wf" style={{
      display:'flex', height:'100%', width:'100%',
      background: bg, color: fg,
      border: noBorder ? 'none' : '1.5px solid ' + (dark ? '#334155' : '#1a1a1a'),
      borderRadius: 12, overflow: 'hidden',
    }}>
      {sidebar && <Sidebar active={active} dark={dark} />}
      <div style={{ flex: 1, minWidth: 0, display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  );
}

// Page header inside the main column
function PageHead({ title, sub, right, dark }) {
  return (
    <div style={{ padding: '18px 22px 12px', borderBottom: '1px dashed ' + (dark ? '#334155' : '#d4d4d2'),
                  display:'flex', alignItems:'flex-end', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div className="wf-hand" style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: dark ? '#94a3b8' : '#666', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// Big stat card (lo-fi)
function Stat({ label, value, delta, deltaTone = 'green' }) {
  const tone = { green:'#10B981', amber:'#F59E0B', red:'#EF4444', teal:'#0EA5E9' }[deltaTone] || '#10B981';
  return (
    <div className="wf-card" style={{ padding: 12 }}>
      <div style={{ fontSize: 11, color:'#666' }}>{label}</div>
      <div style={{ fontFamily:'Kalam, cursive', fontSize: 26, fontWeight: 700, marginTop: 2 }}>{value}</div>
      {delta && <div style={{ fontSize: 11, color: tone, marginTop: 2 }}>▲ {delta}</div>}
    </div>
  );
}

// Hand-drawn line chart placeholder (SVG path)
function ChartLine({ width = 420, height = 110 }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ display:'block' }}>
      {/* grid */}
      {[0.25,0.5,0.75].map(y => (
        <line key={y} x1="20" x2={width-10} y1={height*y} y2={height*y}
              stroke="#e5e5e3" strokeDasharray="3 4" strokeWidth="1" />
      ))}
      {/* this week (teal) */}
      <path d={`M 24 ${height-30} C 60 ${height-50}, 90 ${height-20}, 130 ${height-55}
               S 220 ${height-80}, 260 ${height-70} S 340 ${height-90}, ${width-20} ${height-95}`}
            fill="none" stroke="#0EA5E9" strokeWidth="2.25" strokeLinecap="round" />
      {/* last week (gray dashed) */}
      <path d={`M 24 ${height-40} C 70 ${height-30}, 120 ${height-60}, 160 ${height-45}
               S 250 ${height-55}, 290 ${height-50} S 360 ${height-65}, ${width-20} ${height-60}`}
            fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeDasharray="5 4" />
      <circle cx={width-20} cy={height-95} r="4" fill="#0EA5E9" />
    </svg>
  );
}

// Waveform placeholder
function Waveform({ bars = 48, color = '#0EA5E9', height = 48 }) {
  const heights = Array.from({ length: bars }, (_, i) => {
    const t = i / bars;
    return 6 + Math.abs(Math.sin(i * 0.6) * Math.cos(i * 0.3) * 0.9 + Math.sin(i*1.7)*0.4) * (height - 8);
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 3, height }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 3, height: h, borderRadius: 2, background: color,
          opacity: 0.6 + Math.sin(i*0.4) * 0.4,
        }}/>
      ))}
    </div>
  );
}

// Avatar circle
function Avatar({ initial = 'P', tone = '#E0F2FE', color = '#0369A1', size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: tone, color, border: '1.25px solid #1a1a1a',
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontFamily:'Kalam, cursive', fontWeight:700, fontSize: size * 0.45, flex:`0 0 ${size}px`,
    }}>{initial}</div>
  );
}

// Margin note (handwritten teal label, like a designer's annotation)
function Note({ children, style }) {
  return (
    <div className="wf-cav" style={{ color:'#0EA5E9', fontSize: 16, lineHeight: 1.2, ...style }}>
      ✎ {children}
    </div>
  );
}

Object.assign(window, { Sidebar, ScreenFrame, PageHead, Stat, ChartLine, Waveform, Avatar, Note, NAV_ITEMS });
