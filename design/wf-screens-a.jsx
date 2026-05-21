// Screens 1-7

// ───────────────────────────────────────────────────────────────
// 1. Login / Sign Up
// ───────────────────────────────────────────────────────────────
function LoginScreen() {
  return (
    <div className="wf" style={{
      width:'100%', height:'100%', background:'#f8fafc',
      display:'flex', alignItems:'center', justifyContent:'center',
      border:'1.5px solid #1a1a1a', borderRadius: 12, position:'relative', overflow:'hidden',
    }}>
      {/* faint grid */}
      <div style={{ position:'absolute', inset:0, opacity:0.5, pointerEvents:'none',
        background:'radial-gradient(circle at 1px 1px, #d4d4d2 1px, transparent 0) 0 0/22px 22px' }} />

      <div className="wf-card" style={{ width: 380, padding: 28, position:'relative', boxShadow:'4px 4px 0 #1a1a1a' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10, justifyContent:'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background:'#0EA5E9', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Kalam', fontWeight:700, fontSize: 18 }}>S</div>
          <div className="wf-hand" style={{ fontSize: 20, fontWeight: 700 }}>
            Stobaeus<span style={{ color:'#0EA5E9' }}>Voice</span>
          </div>
        </div>
        <div style={{ textAlign:'center', fontSize: 12, color:'#666', marginBottom: 18 }}>
          Voice-first clinical intelligence for Indian hospitals
        </div>

        <button className="wf-btn" style={{ width:'100%', justifyContent:'center', padding:'10px 12px', marginBottom: 12 }}>
          <span style={{ width:14, height:14, borderRadius:'50%', background:
            'conic-gradient(#4285F4 0 25%, #34A853 25% 50%, #FBBC05 50% 75%, #EA4335 75%)' }}/>
          Continue with Google
        </button>

        <div style={{ display:'flex', alignItems:'center', gap: 10, margin:'12px 0', fontSize: 11, color:'#888' }}>
          <div style={{ flex:1, height:1, background:'#d1d1cf' }}/>or<div style={{ flex:1, height:1, background:'#d1d1cf' }}/>
        </div>

        {/* email / password */}
        <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 3 }}>Email</div>
            <div className="wf-box-dash" style={{ padding:'8px 10px', fontSize: 12, color:'#888' }}>priya.sharma@apollochennai.in</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 3 }}>Password</div>
            <div className="wf-box-dash" style={{ padding:'8px 10px', fontSize: 12, color:'#bbb', letterSpacing: 4 }}>••••••••••</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 3 }}>Hospital name <span style={{ color:'#999' }}>(sign-up only)</span></div>
            <div className="wf-box-dash" style={{ padding:'8px 10px', fontSize: 12, color:'#888' }}>Apollo Hospitals, Chennai</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 5 }}>I am a…</div>
            <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
              <span className="wf-pill" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9' }}>● Doctor</span>
              <span className="wf-pill">○ Radiologist</span>
              <span className="wf-pill">○ Nurse</span>
              <span className="wf-pill">○ Hospital Admin</span>
            </div>
          </div>
        </div>

        <button className="wf-btn wf-btn-primary" style={{ width:'100%', justifyContent:'center', marginTop: 16, padding:'10px 12px' }}>
          Sign in →
        </button>
        <div style={{ textAlign:'center', fontSize: 11, color:'#666', marginTop: 10 }}>
          New here? <span style={{ color:'#0EA5E9', textDecoration:'underline' }}>Create an account</span>
        </div>
      </div>

      <Note style={{ position:'absolute', bottom: 18, right: 24 }}>Firebase auth + role gate</Note>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// 2. Doctor Dashboard
// ───────────────────────────────────────────────────────────────
function DashboardScreen() {
  return (
    <ScreenFrame active="home">
      <PageHead
        title="Hello, Dr. Priya Sharma"
        sub="Tuesday, 21 May 2026 · Apollo Hospitals, Chennai · OPD-3"
        right={
          <div style={{ display:'flex', gap: 8 }}>
            <button className="wf-btn"><Icon name="calendar"/> Today</button>
            <button className="wf-btn wf-btn-primary"><Icon name="mic"/> Start Consultation</button>
          </div>
        }
      />

      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* main */}
        <div style={{ flex: 1, padding: '14px 20px', overflow:'hidden', display:'flex', flexDirection:'column', gap: 14 }}>
          {/* stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
            <Stat label="Consultations today" value="24" delta="+6 vs yest." />
            <Stat label="Time saved" value="3.2 hrs" delta="vs manual notes" deltaTone="teal" />
            <Stat label="Notes generated" value="24" delta="100% from voice" />
            <Stat label="Documentation efficiency" value="94%" delta="+8%" />
          </div>

          {/* performance chart */}
          <div className="wf-card" style={{ padding: 14 }}>
            <div style={{ display:'flex', alignItems:'center' }}>
              <div className="wf-hand" style={{ fontSize: 16, fontWeight: 700, flex:1 }}>Performance — this week vs last</div>
              <span className="wf-chip"><span className="dot teal"/> This week</span>
              <span className="wf-chip" style={{ marginLeft:4 }}><span className="dot gray"/> Last week</span>
            </div>
            <ChartLine height={110} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: 10, color:'#888', padding:'0 22px' }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>

          {/* recent consultations table */}
          <div className="wf-card" style={{ padding: 0, flex: 1, minHeight: 0, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px dashed #d4d4d2', display:'flex', alignItems:'center' }}>
              <div className="wf-hand" style={{ fontSize: 16, fontWeight:700, flex:1 }}>Recent consultations</div>
              <span style={{ fontSize: 11, color:'#0EA5E9', textDecoration:'underline' }}>View all →</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr .7fr 1fr .8fr .6fr', padding:'8px 14px', fontSize: 10, color:'#666', borderBottom:'1px dashed #d4d4d2' }}>
              <div>PATIENT</div><div>TIME</div><div>STATUS</div><div>ICD-10</div><div></div>
            </div>
            {[
              ['Ravi Kumar', '45M', '11:42', 'pending',  'J06.9', 'green'],
              ['Anitha Devi', '32F', '11:10', 'approved', 'E11.9', 'teal'],
              ['Suresh Iyer', '58M', '10:38', 'pushed',   'I10',   'amber'],
              ['Meera Joseph', '29F', '10:05', 'approved', 'O26.8', 'teal'],
              ['Karthik R.', '6M',   '09:42', 'approved', 'J20.9', 'teal'],
              ['Lalitha N.', '67F',  '09:15', 'pushed',  'M54.5', 'amber'],
            ].map(([n,a,t,st,icd,tone],i) => (
              <div key={i} className="wf-row" style={{ gridTemplateColumns:'1.4fr .7fr 1fr .8fr .6fr' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Avatar initial={n[0]} size={24} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{n}</div>
                    <div style={{ color:'#888', fontSize: 10 }}>{a}</div>
                  </div>
                </div>
                <div className="wf-mono">{t}</div>
                <div><span className="wf-pill" style={{ fontSize: 10, padding:'2px 7px' }}><span className={`dot ${tone}`}/> {st}</span></div>
                <div className="wf-mono" style={{ color:'#0EA5E9' }}>{icd}</div>
                <div style={{ textAlign:'right', color:'#888' }}>•••</div>
              </div>
            ))}
          </div>
        </div>

        {/* right panel */}
        <div style={{ flex: '0 0 260px', borderLeft:'1.5px dashed #d4d4d2', padding: 14, display:'flex', flexDirection:'column', gap: 12, overflow:'hidden' }}>
          <div>
            <div className="wf-hand" style={{ fontSize: 15, fontWeight:700, marginBottom: 6 }}>Today's queue</div>
            <div className="wf-box" style={{ padding: 0 }}>
              {[
                ['Pooja Nair', '12:00', 'Follow-up'],
                ['Arjun S.',  '12:30', 'New'],
                ['Geeta Rao', '13:00', 'Lab review'],
                ['Mahesh K.', '13:30', 'New'],
              ].map(([n,t,k],i) => (
                <div key={i} className="wf-row" style={{ gridTemplateColumns:'1fr auto', padding:'8px 10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{n}</div>
                    <div style={{ fontSize: 10, color:'#666' }}>{k}</div>
                  </div>
                  <div className="wf-mono" style={{ fontSize: 11 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <div className="wf-hand" style={{ fontSize: 15, fontWeight:700, marginBottom: 6 }}>Activity</div>
            <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
              {[
                ['fileText','Note pushed to KareXpert for Ravi Kumar','2m'],
                ['rx','Prescription sent via WhatsApp · Anitha D.','9m'],
                ['alertTri','Drug interaction flagged on bed-12 Rx','14m'],
                ['phone','Follow-up bot called Suresh I. · OK','27m'],
                ['scan','Radiology report ready — Karthik R.','41m'],
              ].map(([ic,txt,t],i) => (
                <div key={i} style={{ display:'flex', gap: 8, fontSize: 11 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border:'1.25px solid #1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 10, flex:'0 0 22px' }}><Icon name={ic} size={12}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ lineHeight: 1.3 }}>{txt}</div>
                    <div style={{ color:'#888', fontSize: 10 }}>{t} ago</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 3. Active Consultation
// ───────────────────────────────────────────────────────────────
function ActiveConsultScreen() {
  return (
    <ScreenFrame active="consult">
      {/* patient strip */}
      <div style={{ padding:'14px 22px', borderBottom:'1px dashed #d4d4d2', display:'flex', alignItems:'center', gap: 14 }}>
        <Avatar initial="R" size={36} />
        <div style={{ flex: 1 }}>
          <div className="wf-hand" style={{ fontSize: 18, fontWeight: 700 }}>Ravi Kumar · 45M</div>
          <div style={{ fontSize: 11, color:'#666' }}>ABHA: 14-5678-9012-3456 ✓ linked · MRN APO-241102 · Last visit: 14 Apr 2026</div>
        </div>
        <span className="wf-chip" style={{ background:'#FEE2E2', borderColor:'#EF4444', color:'#7f1d1d', gap: 5 }}><span className="dot red"/> REC</span>
        <span className="wf-chip">Hindi + English detected</span>
        <span className="wf-chip wf-mono" style={{ fontSize:13 }}>00:04:32</span>
      </div>

      {/* center recording UI */}
      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* live transcript */}
        <div style={{ flex: 1, padding: 18, display:'flex', flexDirection:'column', minWidth: 0 }}>
          <div className="wf-hand" style={{ fontSize: 14, color:'#666', marginBottom: 8 }}>Live transcript</div>
          <div className="wf-card-dash" style={{ padding: 14, flex: 1, overflow:'hidden', fontSize: 12, lineHeight: 1.6 }}>
            <div style={{ color:'#0EA5E9', fontSize: 10, marginBottom: 2 }}>DR · 11:42:14</div>
            <div style={{ marginBottom: 8 }}>Achha Ravi ji, kab se yeh problem ho rahi hai?</div>
            <div style={{ color:'#b45309', fontSize: 10, marginBottom: 2 }}>PATIENT · 11:42:21</div>
            <div style={{ marginBottom: 8 }}>Doctor sahab, teen din se cough ho rahi hai, raat ko buri tarah aati hai. Halki fever bhi hai.</div>
            <div style={{ color:'#0EA5E9', fontSize: 10, marginBottom: 2 }}>DR · 11:42:46</div>
            <div style={{ marginBottom: 8 }}>Any chest pain or breathlessness?</div>
            <div style={{ color:'#b45309', fontSize: 10, marginBottom: 2 }}>PATIENT · 11:42:51</div>
            <div style={{ marginBottom: 8 }}>Saans lene mein thoda bhaari lagta hai, chest pain nahi hai.</div>
            <div style={{ color:'#888', fontStyle:'italic', fontSize: 11 }}>● transcribing…</div>
          </div>
        </div>

        {/* mic center */}
        <div style={{ flex: '0 0 280px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: 18, borderLeft:'1px dashed #d4d4d2', borderRight:'1px dashed #d4d4d2' }}>
          <div style={{ position:'relative', width: 160, height: 160, display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 18 }}>
            <div style={{ position:'absolute', inset:-22, borderRadius:'50%', border:'2px dashed #0EA5E9', opacity:0.35 }}/>
            <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:'2px solid #0EA5E9', opacity:0.6 }}/>
            <div style={{ width: 130, height: 130, borderRadius:'50%', background:'#0EA5E9',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'#fff', boxShadow:'0 0 60px rgba(14,165,233,0.5)' }}>
              <Icon name="mic" size={64} strokeWidth={1.6}/>
            </div>
          </div>
          <div className="wf-cav" style={{ fontSize: 22, color:'#0EA5E9', marginBottom: 6 }}>Listening…</div>
          <Waveform bars={28} color="#0EA5E9" height={42} />
          <div style={{ marginTop: 18, display:'flex', gap: 8 }}>
            <button className="wf-btn"><Icon name="pause"/> Pause</button>
            <button className="wf-btn wf-btn-primary"><Icon name="stop"/> Stop &amp; Generate</button>
          </div>
          <button className="wf-btn" style={{ marginTop: 8, fontSize: 11, padding:'5px 10px' }}>Cancel</button>
        </div>

        {/* extracted entities */}
        <div style={{ flex: '0 0 260px', padding: 18, overflow:'hidden', display:'flex', flexDirection:'column', gap: 12 }}>
          <div className="wf-hand" style={{ fontSize: 14, color:'#666' }}>Clinical entities <span style={{ color:'#0EA5E9' }}>● live</span></div>
          <div className="wf-card-dash" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 4 }}>SYMPTOMS</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 4 }}>
              {['cough · 3 days','low-grade fever','SOB on exertion','night cough'].map(c => (
                <span key={c} className="wf-chip" style={{ fontSize: 10, padding:'2px 7px' }}>{c}</span>
              ))}
            </div>
          </div>
          <div className="wf-card-dash" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 4 }}>VITALS (mentioned)</div>
            <div style={{ fontSize: 11, lineHeight: 1.6 }}>
              Temp <b>99.4°F</b> · HR <b>88</b> · SpO₂ <b>96%</b>
            </div>
          </div>
          <div className="wf-card-dash" style={{ padding: 10 }}>
            <div style={{ fontSize: 10, color:'#666', marginBottom: 4 }}>MEDICATIONS</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 4 }}>
              <span className="wf-chip" style={{ fontSize: 10 }}>Paracetamol 650mg</span>
              <span className="wf-chip" style={{ fontSize: 10 }}>Levocetirizine 5mg</span>
            </div>
          </div>
          <Note>Entities update as the doctor talks.</Note>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 4. SOAP Note Review
// ───────────────────────────────────────────────────────────────
function SoapScreen() {
  return (
    <ScreenFrame active="soap">
      <PageHead
        title="SOAP Note · Ravi Kumar"
        sub="Generated from 6:14 of audio · ABHA-linked · Draft — not yet pushed"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <button className="wf-btn"><Icon name="mic"/> Edit with voice</button>
            <button className="wf-btn"><Icon name="keyboard"/> Edit text</button>
            <button className="wf-btn"><Icon name="whatsapp"/> Send Rx · WhatsApp</button>
            <button className="wf-btn wf-btn-primary"><Icon name="check"/> Approve &amp; Push to EMR</button>
          </div>
        }
      />

      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* raw transcript */}
        <div style={{ flex: '0 0 38%', borderRight:'1px dashed #d4d4d2', padding: 16, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Raw transcript <span style={{ fontSize: 10, color:'#888' }}>(source of truth)</span></div>
          <div className="wf-card-dash" style={{ padding: 12, flex: 1, fontSize: 11, lineHeight: 1.55, color:'#333' }}>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#0EA5E9' }}>DR:</b> Achha Ravi ji, kab se yeh problem ho rahi hai?</p>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#b45309' }}>PT:</b> Doctor sahab, <span className="wf-underline">teen din se cough</span> ho rahi hai. Halki <span className="wf-underline">fever</span> bhi hai.</p>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#0EA5E9' }}>DR:</b> Chest pain ya breathlessness?</p>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#b45309' }}>PT:</b> <span className="wf-underline">Saans bhaari</span> lagta hai, chest pain nahi.</p>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#0EA5E9' }}>DR:</b> Koi allergy, koi current medication?</p>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#b45309' }}>PT:</b> Metformin chal rahi hai, sugar ke liye.</p>
            <p style={{ margin:'0 0 8px' }}><b style={{ color:'#0EA5E9' }}>DR:</b> Throat check karte hain… mild congestion. Paracetamol aur ek antihistamine de raha hoon, 5 din.</p>
            <p style={{ margin:'0', color:'#888', fontStyle:'italic' }}>+ 2:18 more</p>
          </div>
        </div>

        {/* SOAP */}
        <div style={{ flex: 1, padding: 16, overflow:'auto', display:'flex', flexDirection:'column', gap: 10 }}>
          {[
            ['S — Subjective', '45M, c/o productive cough × 3 days with nocturnal worsening, low-grade fever, mild dyspnea on exertion. No chest pain. K/c/o T2DM on Metformin.'],
            ['O — Objective', 'Temp 99.4°F · HR 88 · SpO₂ 96% RA · BP 128/84 · RR 18. Throat: mild pharyngeal congestion. Chest: clear to auscultation b/l. No lymphadenopathy.'],
            ['A — Assessment', null],
            ['P — Plan', 'Tab Paracetamol 650mg TDS × 5d; Tab Levocetirizine 5mg HS × 5d; steam inhalation BD; review SOS or if fever > 101°F. Continue Metformin 500mg BD.'],
          ].map(([h, body], i) => (
            <div key={h} className="wf-card" style={{ padding: 12, position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 6 }}>
                <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{h}</div>
                <span style={{ fontSize: 10, color:'#0EA5E9', textDecoration:'underline' }}>edit</span>
              </div>
              {body && <div style={{ fontSize: 12, lineHeight: 1.55, color:'#222' }}>{body}</div>}
              {!body && (
                <>
                  <div style={{ fontSize: 12, lineHeight: 1.55, color:'#222' }}>
                    Acute upper respiratory tract infection, viral, with mild reactive airway component. T2DM — well controlled.
                  </div>
                  <div className="wf-card-dash" style={{ marginTop: 10, padding: 10, borderColor:'#0EA5E9', background:'#F0F9FF' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <span className="wf-pill" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9', fontSize: 10 }}>ICD-10</span>
                      <div className="wf-mono" style={{ fontSize: 13, fontWeight: 600 }}>J06.9</div>
                      <div style={{ fontSize: 12, flex: 1 }}>Acute upper respiratory infection, unspecified</div>
                      <span className="wf-chip" style={{ background:'#10B981', color:'#fff', borderColor:'#10B981', fontSize: 10 }}>94% confident</span>
                    </div>
                    <div style={{ fontSize: 10, color:'#0c4a6e', marginTop: 6 }}>Alt: J20.9 Acute bronchitis (62%) · J00 Common cold (48%)</div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Prescription card */}
          <div className="wf-card" style={{ padding: 12 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 8 }}>
              <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Prescription · extracted</div>
              <span className="wf-pill wf-bg-red" style={{ fontSize: 10, borderColor:'#EF4444', color:'#7f1d1d', display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="alertTri" size={11}/> 1 interaction</span>
            </div>
            <div className="wf-box" style={{ padding: 0, fontSize: 12 }}>
              {[
                ['Paracetamol','650 mg','TDS','5 days', ''],
                ['Levocetirizine','5 mg','HS','5 days',''],
                ['Metformin','500 mg','BD','continue','interaction'],
              ].map(([d,dose,freq,dur,flag],i) => (
                <div key={i} className="wf-row" style={{ gridTemplateColumns:'1.4fr .7fr .7fr 1fr auto', padding:'7px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{d}</div>
                  <div className="wf-mono">{dose}</div>
                  <div className="wf-mono">{freq}</div>
                  <div className="wf-mono">{dur}</div>
                  <div>{flag && <span className="wf-chip wf-bg-red" style={{ fontSize: 10, borderColor:'#EF4444', color:'#7f1d1d', gap: 3 }}><Icon name="alertTri" size={10}/> check</span>}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, padding: 8, background:'#FEF2F2', border:'1px dashed #EF4444', borderRadius: 6, fontSize: 11, color:'#7f1d1d' }}>
              <b>Interaction:</b> Levocetirizine + Metformin — minor: monitor for drowsiness with diabetic dosing schedule.
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 5. Voice Agent — hands-free
// ───────────────────────────────────────────────────────────────
function VoiceAgentScreen() {
  return (
    <ScreenFrame active="voice">
      {/* top status: which ward */}
      <div style={{ padding:'12px 22px', borderBottom:'1px dashed #d4d4d2', display:'flex', alignItems:'center', gap: 10 }}>
        <span className="wf-pill" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9', display:'inline-flex', alignItems:'center', gap: 4 }}><Icon name="mapPin" size={11}/> Ward 3-B · ICU</span>
        <span className="wf-chip" style={{ gap: 4 }}><Icon name="volume" size={11}/> Mic open · push-to-talk off</span>
        <div style={{ flex: 1 }}/>
        <span className="wf-cav" style={{ color:'#0EA5E9', fontSize: 14 }}>hands-free · designed for walking</span>
      </div>

      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* command history */}
        <div style={{ flex: '0 0 280px', padding: 16, borderRight:'1px dashed #d4d4d2', overflow:'hidden' }}>
          <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Voice command history</div>
          <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
            {[
              ['"Update bed 7 BP to 140 over 90"', '→ Vitals saved · Ravi Kumar', '2m'],
              ['"Add note to bed 12 — patient stable"', '→ Note appended · Anitha Devi', '8m'],
              ['"Show last report for 204"', '→ Opened: CT Brain 18 May', '14m'],
              ['"Schedule follow-up for tomorrow 11am"', '→ Booked · S. Iyer', '22m'],
              ['"Order CBC for bed 9"', '→ Lab requested · Karthik R.', '36m'],
            ].map(([said,did,t],i) => (
              <div key={i} className="wf-card-dash" style={{ padding: 9 }}>
                <div style={{ fontSize: 11, fontStyle:'italic', color:'#222' }}>{said}</div>
                <div style={{ fontSize: 10, color:'#0EA5E9', marginTop: 3 }}>{did}</div>
                <div style={{ fontSize: 9, color:'#888', marginTop: 2 }}>{t} ago</div>
              </div>
            ))}
          </div>
        </div>

        {/* center mic */}
        <div style={{ flex: 1, padding: 24, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'relative', width: 220, height: 220, display:'flex', alignItems:'center', justifyContent:'center', marginBottom: 22 }}>
            <div style={{ position:'absolute', inset:-28, borderRadius:'50%', border:'2px dashed #0EA5E9', opacity:0.3 }}/>
            <div style={{ position:'absolute', inset:-12, borderRadius:'50%', border:'2px solid #0EA5E9', opacity:0.5 }}/>
            <div style={{ width: 180, height: 180, borderRadius:'50%', background:'#0EA5E9',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'#fff' }}>
              <Icon name="mic" size={96} strokeWidth={1.5}/>
            </div>
          </div>
          <div className="wf-cav" style={{ fontSize: 30, color:'#0EA5E9' }}>Speak a command…</div>
          <div style={{ fontSize: 12, color:'#666', marginTop: 4, marginBottom: 22 }}>or tap a suggestion</div>

          <div style={{ display:'flex', flexWrap:'wrap', gap: 8, justifyContent:'center', maxWidth: 480 }}>
            {[
              'Update Ravi Kumar vitals',
              'Add note to bed 12',
              'Schedule follow-up for tomorrow',
              'Show last report for patient 204',
              'Order ECG for bed 7',
              'Read alerts',
            ].map(c => (
              <span key={c} className="wf-chip" style={{ fontSize: 13, padding:'8px 14px' }}>"{c}"</span>
            ))}
          </div>
        </div>

        {/* recent updates */}
        <div style={{ flex: '0 0 240px', padding: 16, borderLeft:'1px dashed #d4d4d2', overflow:'hidden' }}>
          <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recent updates</div>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {[
              ['Bed 7','BP 140/90','2m', 'green'],
              ['Bed 12','Note added','8m','teal'],
              ['Bed 4','Pain → 6/10','11m','amber'],
              ['Bed 9','SpO₂ 92%','15m','amber'],
              ['Bed 2','Discharged','22m','gray'],
              ['Bed 14','HR 110','28m','red'],
            ].map(([b,info,t,tone],i) => (
              <div key={i} className="wf-box" style={{ display:'flex', alignItems:'center', gap: 8, padding:'7px 10px' }}>
                <span className={`dot ${tone}`}/>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <b className="wf-mono">{b}</b> · {info}
                </div>
                <div style={{ fontSize: 10, color:'#888' }}>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 6. Nurse Station
// ───────────────────────────────────────────────────────────────
function NurseStationScreen() {
  const beds = [
    [1,'R. Kumar','stable','green'],
    [2,'A. Devi','stable','green'],
    [3,'M. Joseph','attn','amber'],
    [4,'S. Iyer','stable','green'],
    [5,'(empty)','-','gray'],
    [6,'K. Bose','stable','green'],
    [7,'L. Nair','attn','amber'],
    [8,'P. Rao','critical','red'],
    [9,'G. Patel','attn','amber'],
    [10,'V. Singh','stable','green'],
    [11,'(empty)','-','gray'],
    [12,'D. Mehta','stable','green'],
    [13,'(empty)','-','gray'],
    [14,'B. Shah','critical','red'],
    [15,'N. Khan','stable','green'],
    [16,'C. Pillai','attn','amber'],
  ];
  return (
    <ScreenFrame active="nurse">
      <PageHead
        title="Nurse Station · Ward 3-B"
        sub="Nurse Anjali Krishnan · Shift 7:00 – 19:00 · 13/16 beds occupied"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <button className="wf-btn"><Icon name="clipboard"/> Handoff notes</button>
            <button className="wf-btn wf-btn-primary"><Icon name="mic"/> Voice log a bed</button>
          </div>
        }
      />

      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, padding: 16, display:'flex', flexDirection:'column', gap: 14, overflow:'hidden' }}>
          {/* legend */}
          <div style={{ display:'flex', gap: 10, fontSize: 11, alignItems:'center' }}>
            <span className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Bed map</span>
            <span className="wf-chip"><span className="dot green"/> Stable</span>
            <span className="wf-chip"><span className="dot amber"/> Needs attention</span>
            <span className="wf-chip"><span className="dot red"/> Critical</span>
            <span className="wf-chip"><span className="dot gray"/> Empty</span>
          </div>

          {/* bed grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
            {beds.map(([n,name,st,tone]) => (
              <div key={n} className="bed" style={{
                background: tone === 'red' ? '#FEE2E2' : tone === 'amber' ? '#FEF3C7' : tone === 'gray' ? '#f3f3f1' : '#fff',
              }}>
                <div className="bednum">B-{n}</div>
                <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
                  <span className={`dot ${tone}`}/>
                  <div style={{ fontSize: 10, color:'#555', textTransform:'uppercase' }}>{st}</div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{name}</div>
                {st !== '-' && <div style={{ fontSize: 10, color:'#444', marginTop: 2 }}>HR 88 · BP 128/84</div>}
                {st !== '-' && (
                  <div style={{ position:'absolute', bottom: 6, right: 8, color:'#0EA5E9', display:'flex' }}><Icon name="mic" size={14}/></div>
                )}
              </div>
            ))}
          </div>

          {/* vitals quick entry */}
          <div className="wf-card-dash" style={{ padding: 12, borderColor:'#0EA5E9' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
              <Icon name="mic" size={20} color="#0EA5E9"/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color:'#0c4a6e' }}>Quick vitals · just talk</div>
                <div className="wf-cav" style={{ fontSize: 18, color:'#0EA5E9' }}>"Bed 4, BP 130 over 85, temp 99.2, sat 97"</div>
              </div>
              <span className="wf-chip" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9', gap: 4 }}><Icon name="check" size={11}/> saved</span>
            </div>
          </div>
        </div>

        {/* right column */}
        <div style={{ flex: '0 0 280px', borderLeft:'1px dashed #d4d4d2', padding: 16, display:'flex', flexDirection:'column', gap: 12, overflow:'hidden' }}>
          <div>
            <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Pending tasks</div>
            <div className="wf-box" style={{ padding: 0 }}>
              {[
                ['squareEmpty','Meds — Bed 8 · Metformin 500mg','due 12:00','red'],
                ['squareEmpty','Vitals round — Beds 1–8','12:30','amber'],
                ['squareEmpty','Dressing — Bed 14','13:00','red'],
                ['squareCheck','Insulin — Bed 6','done 11:00','green'],
                ['squareEmpty','Sample collection — Bed 9','13:30','amber'],
              ].map(([c,txt,t,tone],i) => (
                <div key={i} className="wf-row" style={{ gridTemplateColumns:'auto 1fr auto', padding:'7px 10px' }}>
                  <Icon name={c} size={14} color={c === 'squareCheck' ? '#10B981' : '#999'} style={{ marginRight: 6 }}/>
                  <div style={{ fontSize: 11 }}>{txt}</div>
                  <span className={`dot ${tone}`} style={{ marginLeft: 6 }}/>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nurse calls</div>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {[
                ['B-8','3m','responded 1:24'],
                ['B-14','11m','responded 0:48'],
                ['B-3','24m','responded 2:10'],
              ].map(([b,t,r],i) => (
                <div key={i} className="wf-box" style={{ padding:'6px 10px', display:'flex', alignItems:'center', gap: 8, fontSize: 11 }}>
                  <span className="wf-mono">{b}</span>
                  <div style={{ flex: 1, color:'#666' }}>{r}</div>
                  <span style={{ color:'#888' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="wf-card-dash" style={{ padding: 10 }}>
            <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Handoff from night shift</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color:'#333' }}>
              "Bed 8 had two episodes of low sat overnight, doctor aware. Bed 14 wound looking better, dressing due at 1pm…"
            </div>
            <div style={{ fontSize: 10, color:'#0EA5E9', marginTop: 4, display:'flex', alignItems:'center', gap: 4 }}><Icon name="mic" size={11}/> auto-transcribed · 2:14</div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 7. Clinical Decision Alerts
// ───────────────────────────────────────────────────────────────
function AlertsScreen() {
  const alerts = [
    ['critical','red','Ravi Kumar · 45M · OPD','Chest pain + SOB reported in last consult — consider ECG before discharge','Order ECG','5m'],
    ['critical','red','Bed 12 · Anitha Devi · 32F','Drug interaction: Metformin + new prescription (Glipizide)','Review Rx','12m'],
    ['warning','amber','Patient 204 · Suresh Iyer','HbA1c elevated 3 months ago (8.4%) — follow-up pending','Schedule visit','41m'],
    ['warning','amber','Bed 14 · Bharat Shah','Discharge due today — discharge summary not generated','Generate summary','1h'],
    ['warning','amber','Meera Joseph · 29F · G2P1','BP trending up across last 3 visits (132 → 138 → 145)','Open chart','2h'],
    ['info','teal','New ABDM guideline','M3 milestone documents pending — 4 fields missing','Open compliance','3h'],
    ['info','teal','Karthik R. · 6M','Vaccination due in 7 days · DPT booster','Send WhatsApp','5h'],
  ];
  return (
    <ScreenFrame active="alerts">
      <PageHead
        title="Clinical Decision Alerts"
        sub="14 active · 2 critical · 3 require action in next 2h"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <span className="wf-chip" style={{ gap: 4 }}>All departments <Icon name="chevDown" size={11}/></span>
            <span className="wf-chip" style={{ gap: 4 }}>All severities <Icon name="chevDown" size={11}/></span>
            <span className="wf-chip" style={{ gap: 4 }}>Today <Icon name="chevDown" size={11}/></span>
            <button className="wf-btn"><Icon name="download"/> Export</button>
          </div>
        }
      />

      <div style={{ padding: 16, display:'flex', gap: 14, flex: 1, minHeight: 0, overflow:'hidden' }}>
        {/* severity summary */}
        <div style={{ flex: '0 0 200px', display:'flex', flexDirection:'column', gap: 10 }}>
          {[
            ['Critical','2','#EF4444','#FEE2E2'],
            ['Warning','5','#F59E0B','#FEF3C7'],
            ['Info','7','#0EA5E9','#E0F2FE'],
          ].map(([k,v,c,bg]) => (
            <div key={k} className="wf-card" style={{ padding: 14, background: bg, borderColor: c }}>
              <div style={{ fontSize: 11, color: c, fontWeight: 600, textTransform:'uppercase' }}>{k}</div>
              <div className="wf-hand" style={{ fontSize: 32, fontWeight: 700, color: c }}>{v}</div>
              <div style={{ fontSize: 11, color:'#444' }}>open alerts</div>
            </div>
          ))}
          <div className="wf-card-dash" style={{ padding: 10 }}>
            <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700 }}>By department</div>
            <div style={{ marginTop: 6, display:'flex', flexDirection:'column', gap: 4, fontSize: 11 }}>
              {[['OPD',6],['ICU',3],['Cardiology',2],['Pediatrics',2],['Radiology',1]].map(([d,c]) => (
                <div key={d} style={{ display:'flex', alignItems:'center', gap: 6 }}>
                  <div style={{ flex: 1 }}>{d}</div>
                  <div style={{ width: 60, height: 5, borderRadius: 3, background:'#f3f3f1', overflow:'hidden' }}>
                    <div style={{ width: `${c*15}%`, height:'100%', background:'#0EA5E9' }}/>
                  </div>
                  <div className="wf-mono" style={{ width: 18, textAlign:'right' }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* alert list */}
        <div style={{ flex: 1, overflow:'auto', display:'flex', flexDirection:'column', gap: 10 }}>
          {alerts.map(([sev, tone, who, why, action, t], i) => {
            const c = tone === 'red' ? '#EF4444' : tone === 'amber' ? '#F59E0B' : '#0EA5E9';
            return (
              <div key={i} className="wf-card" style={{ padding: 0, borderLeftWidth: 6, borderLeftColor: c, display:'flex' }}>
                <div style={{ padding: 14, flex: 1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
                    <span className="wf-pill" style={{ background: c, color:'#fff', borderColor: c, fontSize: 10, textTransform:'uppercase' }}>{sev}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{who}</span>
                    <span style={{ flex: 1 }}/>
                    <span style={{ fontSize: 11, color:'#888' }}>{t} ago</span>
                  </div>
                  <div style={{ fontSize: 12, color:'#222', lineHeight: 1.5 }}>{why}</div>
                </div>
                <div style={{ padding: 14, display:'flex', alignItems:'center', gap: 6 }}>
                  <button className="wf-btn">Snooze</button>
                  <button className="wf-btn wf-btn-primary">{action} →</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenFrame>
  );
}

Object.assign(window, {
  LoginScreen, DashboardScreen, ActiveConsultScreen, SoapScreen,
  VoiceAgentScreen, NurseStationScreen, AlertsScreen,
});
