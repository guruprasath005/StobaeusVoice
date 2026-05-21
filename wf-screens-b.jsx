// Screens 8-14

// ───────────────────────────────────────────────────────────────
// 8. Patient Records
// ───────────────────────────────────────────────────────────────
function PatientRecordsScreen() {
  return (
    <ScreenFrame active="patients">
      <PageHead
        title="Patients"
        sub="2,847 records · 142 ABHA-linked this month"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <div className="wf-box-dash" style={{ padding:'6px 12px', fontSize: 12, color:'#666', minWidth: 220, display:'flex', alignItems:'center', gap: 6 }}><Icon name="search" size={13}/> Search by name, ABHA, MRN…</div>
            <button className="wf-btn wf-btn-primary"><Icon name="plus"/> New patient</button>
          </div>
        }
      />

      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* patient list */}
        <div style={{ flex:'0 0 260px', borderRight:'1px dashed #d4d4d2', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', display:'flex', gap: 6, borderBottom:'1px dashed #d4d4d2' }}>
            <span className="wf-pill" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9', fontSize: 10 }}>All</span>
            <span className="wf-pill" style={{ fontSize: 10 }}>My patients</span>
            <span className="wf-pill" style={{ fontSize: 10 }}>ABHA only</span>
          </div>
          <div style={{ overflow:'auto', flex: 1 }}>
            {[
              ['Ravi Kumar', '45M','14-5678', 'today', true, true],
              ['Anitha Devi','32F','14-9032','3d ago', false, true],
              ['Suresh Iyer','58M','14-1287','1w ago', false, true],
              ['Meera Joseph','29F','14-4458','2w ago', false, true],
              ['Karthik R.','6M','14-7711','3w ago', false, false],
              ['Lalitha N.','67F','14-0042','1mo ago', false, true],
              ['Pooja Nair','38F','14-3318','2mo ago', false, true],
              ['Arjun S.','22M','14-8821','3mo ago', false, false],
              ['Geeta Rao','55F','14-6655','4mo ago', false, true],
            ].map(([n,a,abha,t,sel,linked],i) => (
              <div key={i} style={{
                padding:'10px 14px', display:'flex', gap: 9, alignItems:'center',
                background: sel ? '#E0F2FE' : 'transparent',
                borderBottom:'1px dashed #ececea',
                borderLeft: sel ? '3px solid #0EA5E9' : '3px solid transparent',
              }}>
                <Avatar initial={n[0]} size={28} tone={sel ? '#bae6fd' : '#f3f3f1'} color="#0c4a6e" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, display:'flex', alignItems:'center', gap: 5 }}>
                    {n}
                    {linked && <span style={{ fontSize: 9, color:'#0EA5E9' }}>● ABHA</span>}
                  </div>
                  <div style={{ fontSize: 10, color:'#666' }}>{a} · {abha} · {t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* patient detail */}
        <div style={{ flex: 1, padding: 16, overflow:'auto', display:'flex', flexDirection:'column', gap: 12 }}>
          {/* header */}
          <div className="wf-card" style={{ padding: 14, display:'flex', alignItems:'center', gap: 12 }}>
            <Avatar initial="R" size={56} />
            <div style={{ flex: 1 }}>
              <div className="wf-hand" style={{ fontSize: 20, fontWeight: 700 }}>Ravi Kumar · 45M</div>
              <div style={{ fontSize: 11, color:'#666' }}>MRN APO-241102 · DOB 14 Mar 1981 · Blood: B+ · K/c/o T2DM, HTN</div>
              <div style={{ marginTop: 6, display:'flex', gap: 6 }}>
                <span className="wf-pill" style={{ background:'#E0F2FE', borderColor:'#0EA5E9', color:'#0c4a6e', fontSize: 10 }}>● ABHA linked · 14-5678-9012-3456</span>
                <span className="wf-chip" style={{ fontSize: 10 }}>Insurance: Star Health</span>
                <span className="wf-chip" style={{ fontSize: 10, gap: 4 }}><Icon name="phone" size={10}/> +91 98765 43210</span>
              </div>
            </div>
            <button className="wf-btn wf-btn-primary"><Icon name="mic"/> Start Consultation</button>
          </div>

          {/* tabs */}
          <div style={{ display:'flex', gap: 4, borderBottom:'1px dashed #d4d4d2' }}>
            {['Timeline','SOAP notes (12)','Prescriptions (8)','Labs','Imaging','Voice recordings'].map((t,i) => (
              <div key={t} style={{
                padding:'8px 12px', fontSize: 12,
                borderBottom: i === 0 ? '2px solid #0EA5E9' : '2px solid transparent',
                color: i === 0 ? '#0EA5E9' : '#666', fontWeight: i === 0 ? 600 : 400,
              }}>{t}</div>
            ))}
          </div>

          {/* timeline */}
          <div style={{ display:'flex', gap: 12 }}>
            <div style={{ flex: 1, position:'relative', paddingLeft: 18 }}>
              <div style={{ position:'absolute', left: 6, top: 4, bottom: 4, width: 2, background:'#d4d4d2' }}/>
              {[
                ['21 May 2026','Consultation · Dr. Priya Sharma','URTI · J06.9 · Rx Paracetamol, Levocetirizine','today','teal'],
                ['14 Apr 2026','Lab · HbA1c 7.2%','within target — continue metformin','5w ago','green'],
                ['12 Mar 2026','Consultation · Dr. Priya Sharma','Routine diabetes review · BP 132/86','10w ago','gray'],
                ['28 Jan 2026','Imaging · CT chest','no acute findings','16w ago','gray'],
                ['02 Dec 2025','Consultation · Dr. R. Menon','Viral fever · self-limited','24w ago','gray'],
              ].map(([d,t,sub,when,tone],i) => (
                <div key={i} style={{ position:'relative', marginBottom: 12 }}>
                  <div style={{ position:'absolute', left: -16, top: 4, width: 10, height: 10, borderRadius:'50%', background:'#fff', border:`2px solid ${tone === 'teal' ? '#0EA5E9' : tone === 'green' ? '#10B981' : '#9ca3af'}` }}/>
                  <div className="wf-box" style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <div className="wf-mono" style={{ fontSize: 10, color:'#666' }}>{d}</div>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{t}</div>
                      <div style={{ fontSize: 10, color:'#888' }}>{when}</div>
                    </div>
                    <div style={{ fontSize: 11, color:'#444', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ flex:'0 0 220px', display:'flex', flexDirection:'column', gap: 10 }}>
              <div className="wf-card-dash" style={{ padding: 10 }}>
                <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700 }}>Active medications</div>
                <ul style={{ margin:'4px 0 0', padding:'0 0 0 16px', fontSize: 11, lineHeight: 1.7 }}>
                  <li>Metformin 500mg BD</li>
                  <li>Telmisartan 40mg OD</li>
                  <li>Atorvastatin 10mg HS</li>
                </ul>
              </div>
              <div className="wf-card-dash" style={{ padding: 10 }}>
                <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700 }}>Allergies</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Penicillin · dust mites</div>
              </div>
              <div className="wf-card-dash" style={{ padding: 10 }}>
                <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700 }}>Vitals (latest)</div>
                <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>
                  BP 128/84 · HR 88 · Wt 78 kg · BMI 26.4
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 9. Radiology / Pathology Dictation
// ───────────────────────────────────────────────────────────────
function RadiologyScreen() {
  return (
    <ScreenFrame active="rad">
      <PageHead
        title="Radiology &amp; Pathology Dictation"
        sub="Dr. Priya Sharma · 47 reports today · avg 2:14 per report"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <button className="wf-btn"><Icon name="save"/> Save report</button>
            <button className="wf-btn wf-btn-primary"><Icon name="send"/> Send to referring doctor</button>
          </div>
        }
      />

      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, padding: 16, overflow:'hidden', display:'flex', flexDirection:'column', gap: 12 }}>
          {/* template selector */}
          <div>
            <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Template</div>
            <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
              {['CT Brain (plain)','Chest X-Ray','MRI Spine','USG Abdomen','Blood Report — CBC','Lipid Profile','HbA1c','Mammogram'].map((t,i) => (
                <span key={t} className="wf-pill" style={{
                  background: i === 1 ? '#0EA5E9' : '#fff',
                  color: i === 1 ? '#fff' : '#1a1a1a',
                  borderColor: i === 1 ? '#0EA5E9' : '#1a1a1a',
                  fontSize: 11, padding:'5px 10px',
                }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Two-pane: image / structured report */}
          <div style={{ display:'flex', gap: 12, flex: 1, minHeight: 0 }}>
            <div className="wf-card" style={{ flex:'0 0 38%', padding: 0, display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'10px 12px', borderBottom:'1px dashed #d4d4d2', display:'flex', alignItems:'center' }}>
                <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Image · Chest X-Ray PA</div>
                <span className="wf-chip" style={{ fontSize: 10 }}>Anitha Devi · 32F</span>
              </div>
              <div className="wf-img-ph" style={{ flex: 1, margin: 12, border:'1.5px dashed #6b6b6b' }}>
                [ DICOM viewer — CXR ]
              </div>
              <div style={{ padding:'8px 12px', borderTop:'1px dashed #d4d4d2', display:'flex', gap: 6 }}>
                <span className="wf-chip" style={{ fontSize: 10, gap: 4 }}><Icon name="zoomIn" size={11}/> zoom</span>
                <span className="wf-chip" style={{ fontSize: 10, gap: 4 }}><Icon name="move" size={11}/> pan</span>
                <span className="wf-chip" style={{ fontSize: 10, gap: 4 }}><Icon name="sliders" size={11}/> window</span>
                <span style={{ flex: 1 }}/>
                <span className="wf-chip" style={{ fontSize: 10 }}>1/2</span>
              </div>
            </div>

            <div className="wf-card" style={{ flex: 1, padding: 14, display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', alignItems:'center', marginBottom: 8 }}>
                <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Structured report</div>
                <span className="wf-chip" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9', fontSize: 10, gap: 4 }}><Icon name="mic" size={11}/> dictating · 00:01:42</span>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7, flex: 1, overflow:'auto' }}>
                <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', rowGap: 6, alignItems:'baseline' }}>
                  <div style={{ color:'#666', fontSize: 11 }}>TECHNIQUE</div>
                  <div>PA view of the chest acquired in full inspiration.</div>
                  <div style={{ color:'#666', fontSize: 11 }}>LUNGS</div>
                  <div>Both lung fields are clear. <span className="wf-underline">No focal consolidation</span>, mass, or pleural effusion.</div>
                  <div style={{ color:'#666', fontSize: 11 }}>HEART</div>
                  <div>Cardiothoracic ratio within normal limits.</div>
                  <div style={{ color:'#666', fontSize: 11 }}>MEDIASTINUM</div>
                  <div>Normal. No widening or lymphadenopathy.</div>
                  <div style={{ color:'#666', fontSize: 11 }}>BONES &amp; SOFT TISSUE</div>
                  <div>Unremarkable.</div>
                </div>
                <div className="wf-card-dash" style={{ padding: 10, marginTop: 12, borderColor:'#0EA5E9', background:'#F0F9FF' }}>
                  <div style={{ fontSize: 10, color:'#0EA5E9', fontWeight: 600, textTransform:'uppercase', marginBottom: 4 }}>IMPRESSION</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Normal study. No acute cardiopulmonary findings.</div>
                </div>
              </div>
              <div style={{ borderTop:'1px dashed #d4d4d2', paddingTop: 8, marginTop: 8, display:'flex', alignItems:'center', gap: 8 }}>
                <Waveform bars={32} height={28}/>
                <button className="wf-btn" style={{ padding:'5px 10px', fontSize: 11 }}><Icon name="pause" size={12}/></button>
                <button className="wf-btn" style={{ padding:'5px 10px', fontSize: 11 }}><Icon name="stop" size={12}/></button>
              </div>
            </div>
          </div>
        </div>

        {/* pending queue */}
        <div style={{ flex:'0 0 240px', borderLeft:'1px dashed #d4d4d2', padding: 14, display:'flex', flexDirection:'column', gap: 10 }}>
          <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Pending queue · 9</div>
          {[
            ['Suresh Iyer','MRI Spine','urgent','red'],
            ['Karthik R.','CXR follow-up','routine','teal'],
            ['Meera Joseph','USG Abdomen','routine','teal'],
            ['Lalitha N.','CT Brain','urgent','red'],
            ['Pooja Nair','Blood — CBC','routine','teal'],
            ['B. Shah','CXR portable','stat','red'],
          ].map(([n,t,p,tone],i) => (
            <div key={i} className="wf-box" style={{ padding:'8px 10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <span className={`dot ${tone}`}/>
                <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{n}</div>
                <span style={{ fontSize: 9, textTransform:'uppercase', color: tone === 'red' ? '#EF4444' : '#0EA5E9', fontWeight: 600 }}>{p}</span>
              </div>
              <div style={{ fontSize: 10, color:'#666', marginTop: 2 }}>{t}</div>
            </div>
          ))}
          <Note>Templates auto-fill structure — doctor only dictates findings.</Note>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 10. Prescription Manager
// ───────────────────────────────────────────────────────────────
function PrescriptionScreen() {
  return (
    <ScreenFrame active="rx">
      <PageHead
        title="Prescriptions · today"
        sub="22 generated · 18 sent via WhatsApp · 3 pending"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <span className="wf-chip" style={{ gap: 4 }}>Status: All <Icon name="chevDown" size={11}/></span>
            <button className="wf-btn"><Icon name="download"/> Export CSV</button>
            <button className="wf-btn wf-btn-primary"><Icon name="plus"/> New Rx</button>
          </div>
        }
      />
      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, padding: 16, overflow:'auto' }}>
          <div className="wf-card" style={{ padding: 0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 2fr .9fr .9fr 1fr', padding:'10px 14px', fontSize: 10, color:'#666', borderBottom:'1px dashed #d4d4d2', textTransform:'uppercase' }}>
              <div>Patient</div><div>Drugs</div><div>Sent</div><div>Channel</div><div>Status</div>
            </div>
            {[
              ['Ravi Kumar','45M','Paracetamol 650 · Levocetirizine 5','11:48','WhatsApp ✓','sent','green'],
              ['Anitha Devi','32F','Metformin 500 · Glipizide 5','11:18','WhatsApp ✓','sent','green'],
              ['Suresh Iyer','58M','Telmisartan 40 · Atorvastatin 10','10:42','Printed ✓','sent','green'],
              ['Meera Joseph','29F','Folic acid 5 · Iron sucrose','10:08','ABHA upload ✓','sent','green'],
              ['Karthik R.','6M','Ibuprofen syrup 100/5','09:55','—','pending','amber'],
              ['Lalitha N.','67F','Diclofenac 50 · PCM 650','09:22','WhatsApp ✓','sent','green'],
              ['Pooja Nair','38F','Levothyroxine 50mcg','09:00','Email ✓','sent','green'],
              ['Arjun S.','22M','Cefixime 200','08:42','—','pending','amber'],
            ].map(([n,a,drugs,t,ch,st,tone],i) => (
              <div key={i} className="wf-row" style={{ gridTemplateColumns:'1.2fr 2fr .9fr .9fr 1fr' }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Avatar initial={n[0]} size={24}/>
                  <div>
                    <div style={{ fontWeight: 600 }}>{n}</div>
                    <div style={{ fontSize: 10, color:'#888' }}>{a}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11 }}>{drugs}</div>
                <div className="wf-mono">{t}</div>
                <div style={{ fontSize: 11 }}>{ch}</div>
                <div>
                  <span className="wf-pill" style={{ fontSize: 10, padding:'2px 7px' }}>
                    <span className={`dot ${tone}`}/> {st}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* drug interaction checker + drug DB */}
        <div style={{ flex:'0 0 280px', borderLeft:'1px dashed #d4d4d2', padding: 14, display:'flex', flexDirection:'column', gap: 12 }}>
          <div className="wf-card-dash" style={{ padding: 12, borderColor:'#EF4444', background:'#FEF2F2' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
              <span className="wf-pill" style={{ background:'#EF4444', color:'#fff', borderColor:'#EF4444', fontSize: 10, gap: 4 }}><Icon name="alertTri" size={11}/> interaction</span>
              <span className="wf-hand" style={{ fontWeight: 700, fontSize: 13, color:'#7f1d1d' }}>2 active</span>
            </div>
            <div style={{ fontSize: 11, color:'#7f1d1d', lineHeight: 1.5 }}>
              <b>Ravi K.</b> · Metformin + Levocetirizine — minor monitoring<br/>
              <b>Anitha D.</b> · Metformin + Glipizide — risk of hypoglycaemia
            </div>
          </div>

          <div>
            <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Drug database · India</div>
            <div className="wf-box-dash" style={{ padding:'8px 10px', fontSize: 12, color:'#222', display:'flex', alignItems:'center', gap: 6 }}><Icon name="search" size={13}/> amoxi…</div>
            <div className="wf-card-dash" style={{ marginTop: 8, padding: 10, fontSize: 11, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600 }}>Amoxicillin</div>
              <div style={{ color:'#666' }}>Antibiotic · oral · CDSCO-approved</div>
              <div style={{ marginTop: 6, fontSize: 10, color:'#0EA5E9' }}>Suggested dosing:</div>
              <div style={{ fontSize: 11 }}>Adult: 500 mg TDS × 5–7d<br/>Peds: 25–50 mg/kg/day ÷ TDS</div>
            </div>
          </div>

          <div>
            <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Send options</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
              <span className="wf-chip" style={{ gap: 5 }}><Icon name="whatsapp" size={12}/> WhatsApp</span>
              <span className="wf-chip" style={{ gap: 5 }}><Icon name="printer" size={12}/> Print</span>
              <span className="wf-chip" style={{ gap: 5 }}><Icon name="mail" size={12}/> Email</span>
              <span className="wf-chip" style={{ gap: 5 }}><Icon name="cloud" size={12}/> ABHA upload</span>
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 11. Patient Voice Bot (Outbound Follow-up)
// ───────────────────────────────────────────────────────────────
function OutboundBotScreen() {
  return (
    <ScreenFrame active="outbound">
      <PageHead
        title="Patient Voice Bot · Outbound follow-up"
        sub="142 calls scheduled today · 3 escalations · avg call 1:48"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <button className="wf-btn"><Icon name="calendar"/> Schedule batch</button>
            <button className="wf-btn wf-btn-primary"><Icon name="play"/> Start queue</button>
          </div>
        }
      />
      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, padding: 16, display:'flex', flexDirection:'column', gap: 12, overflow:'hidden' }}>
          {/* stats strip */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
            <Stat label="Calls today" value="142" delta="+22 vs avg" />
            <Stat label="Avg response time" value="1:48" delta="-12s" deltaTone="teal" />
            <Stat label="Escalations" value="3" delta="critical" deltaTone="red" />
            <Stat label="Patients reached" value="89%" delta="+4%" />
          </div>

          {/* scheduled + live */}
          <div style={{ display:'flex', gap: 12, flex: 1, minHeight: 0 }}>
            <div className="wf-card" style={{ flex: 1, padding: 0, display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'10px 14px', borderBottom:'1px dashed #d4d4d2' }}>
                <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Scheduled queue</div>
              </div>
              <div style={{ flex: 1, overflow:'auto' }}>
                {[
                  ['Ravi Kumar','post-discharge D+3','Hindi','14:00','queued'],
                  ['Anitha Devi','glucose check-in','Tamil','14:05','queued'],
                  ['Suresh Iyer','BP review','English','14:10','queued'],
                  ['Karthik R. (parent)','viral fever D+2','Tamil','14:15','queued'],
                  ['Lalitha N.','knee Rx adherence','Hindi','14:20','queued'],
                  ['Pooja Nair','thyroid follow-up','English','14:25','queued'],
                ].map(([n,reason,lang,t,st],i) => (
                  <div key={i} className="wf-row" style={{ gridTemplateColumns:'1.2fr 1.4fr .8fr .6fr auto' }}>
                    <div style={{ fontWeight: 600 }}>{n}</div>
                    <div style={{ fontSize: 11, color:'#444' }}>{reason}</div>
                    <div><span className="wf-pill" style={{ fontSize: 10 }}>{lang}</span></div>
                    <div className="wf-mono">{t}</div>
                    <div style={{ fontSize: 11, color:'#888' }}>{st}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="wf-card" style={{ flex: 1, padding: 14, display:'flex', flexDirection:'column', gap: 10 }}>
              <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Script preview</div>
              <div className="wf-card-dash" style={{ padding: 10, fontSize: 12, lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}><b className="wf-teal">Bot:</b> "Namaste Ravi-ji, Apollo Hospital se call kar rahe hain. Discharge ke baad aap kaise feel kar rahe hain?"</p>
                <p style={{ margin:'8px 0 0' }}><b className="wf-teal">Bot:</b> "Kya bukhar, chest pain ya saans lene mein takleef ho rahi hai?"</p>
              </div>
              <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>Live call log</div>
              <div className="wf-card-dash" style={{ padding: 10, fontSize: 11, lineHeight: 1.6, flex: 1, overflow:'auto' }}>
                <p style={{ margin:'0 0 4px', color:'#666', fontSize: 10 }}>● live · S. Iyer · 00:47</p>
                <p style={{ margin:'0 0 4px' }}><b className="wf-teal">Bot:</b> Aap aaj kaise feel kar rahe hain?</p>
                <p style={{ margin:'0 0 4px' }}><b style={{ color:'#b45309' }}>PT:</b> Theek hoon, halki kamzori hai.</p>
                <p style={{ margin:'0 0 4px' }}><b className="wf-teal">Bot:</b> BP measure ki?</p>
                <p style={{ margin:'0 0 4px' }}><b style={{ color:'#b45309' }}>PT:</b> 132/88 thi subah.</p>
                <p style={{ margin:'0', color:'#888', fontStyle:'italic' }}>● listening…</p>
              </div>
              <div className="wf-card-dash" style={{ padding: 8, borderColor:'#EF4444', background:'#FEF2F2', fontSize: 11, color:'#7f1d1d', display:'flex', alignItems:'center', gap: 6 }}>
                <Icon name="alertTri" size={14}/> <span><b>Auto-escalation triggers:</b> "chest pain", "severe", "blood", "can't breathe" → notify on-call nurse.</span>
              </div>
            </div>
          </div>
        </div>

        {/* outcomes */}
        <div style={{ flex:'0 0 240px', borderLeft:'1px dashed #d4d4d2', padding: 14, display:'flex', flexDirection:'column', gap: 10 }}>
          <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Today's outcomes</div>
          {[
            ['Pooja N.','OK · meds going well','11:32','green'],
            ['Mahesh K.','OK · pain ↓','11:14','green'],
            ['Bharat S.','Needs attention · cough returning','10:58','amber'],
            ['Geeta R.','Escalated · chest tightness','10:32','red'],
            ['Lalitha N.','OK','10:08','green'],
            ['Karthik R.','OK · fever resolved','09:42','green'],
          ].map(([n,sum,t,tone],i) => (
            <div key={i} className="wf-box" style={{ padding:'7px 10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <span className={`dot ${tone}`}/>
                <div style={{ fontWeight: 600, fontSize: 12, flex: 1 }}>{n}</div>
                <div style={{ fontSize: 10, color:'#888' }}>{t}</div>
              </div>
              <div style={{ fontSize: 11, color:'#444', marginTop: 2 }}>{sum}</div>
            </div>
          ))}
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 12. Appointment Bot (Inbound)
// ───────────────────────────────────────────────────────────────
function AppointmentBotScreen() {
  return (
    <ScreenFrame active="appt">
      <PageHead
        title="Appointment Scheduling Bot · Inbound"
        sub="38 calls in last hour · 92% bot-resolved · 3 escalated to reception"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <span className="wf-chip" style={{ gap: 4 }}><Icon name="globe" size={12}/> Hindi · Tamil · Telugu · Kannada · English</span>
            <button className="wf-btn"><Icon name="settings"/> Bot settings</button>
          </div>
        }
      />
      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* live calls */}
        <div style={{ flex:'0 0 280px', borderRight:'1px dashed #d4d4d2', padding: 14, display:'flex', flexDirection:'column', gap: 10, overflow:'hidden' }}>
          <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Live call queue · 4 active</div>
          {[
            ['+91 98••• 43210','Hindi','Book OPD','01:12','green'],
            ['+91 90••• 11874','Tamil','Reschedule','00:48','green'],
            ['+91 99••• 92211','Telugu','Cancel','00:22','green'],
            ['+91 80••• 33301','English','Lab booking','00:11','amber'],
          ].map(([num,lang,intent,t,tone],i) => (
            <div key={i} className="wf-box" style={{ padding: 10 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
                <span className={`dot ${tone}`}/>
                <div className="wf-mono" style={{ fontSize: 11, flex: 1 }}>{num}</div>
                <div className="wf-mono" style={{ fontSize: 11, color:'#666' }}>{t}</div>
              </div>
              <div style={{ display:'flex', gap: 6, alignItems:'center', fontSize: 11 }}>
                <span className="wf-pill" style={{ fontSize: 10 }}>{lang}</span>
                <span style={{ color:'#444' }}>{intent}</span>
              </div>
              <Waveform bars={32} height={18}/>
            </div>
          ))}

          <div className="wf-card-dash" style={{ marginTop: 'auto', padding: 10, borderColor:'#F59E0B', background:'#FFFBEB' }}>
            <div style={{ fontSize: 11, color:'#7c2d12', fontWeight: 600 }}>3 escalated to reception →</div>
            <div style={{ fontSize: 10, color:'#7c2d12', marginTop: 2 }}>Each comes with full transcript.</div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 16, display:'flex', flexDirection:'column', gap: 12, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 8 }}>
            <Stat label="Calls today" value="284" delta="+12%" />
            <Stat label="Bot-resolved" value="92%" delta="+4%" deltaTone="teal" />
            <Stat label="Avg call" value="1:14" delta="-18s" deltaTone="teal" />
            <Stat label="Bookings made" value="167" delta="all via bot" />
          </div>

          {/* call transcript */}
          <div className="wf-card" style={{ flex: 1, padding: 14, display:'flex', gap: 14, minHeight: 0 }}>
            <div style={{ flex: 1, display:'flex', flexDirection:'column' }}>
              <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Live transcript · Tamil call</div>
              <div className="wf-card-dash" style={{ padding: 12, flex: 1, fontSize: 12, lineHeight: 1.6, overflow:'auto' }}>
                <p style={{ margin:'0 0 6px' }}><b className="wf-teal">Bot:</b> Vanakkam, Apollo Chennai. Yenna udhavi venum?</p>
                <p style={{ margin:'0 0 6px' }}><b style={{ color:'#b45309' }}>Caller:</b> Doctor appointment vaenum.</p>
                <p style={{ margin:'0 0 6px' }}><b className="wf-teal">Bot:</b> Endha department, sir?</p>
                <p style={{ margin:'0 0 6px' }}><b style={{ color:'#b45309' }}>Caller:</b> Cardiology, naalaikku.</p>
                <p style={{ margin:'0 0 6px' }}><b className="wf-teal">Bot:</b> Dr. Mohan irukkar 10:30am, Dr. Suresh irukkar 4pm. Yedhu venum?</p>
                <p style={{ margin:'0 0 6px' }}><b style={{ color:'#b45309' }}>Caller:</b> 10:30 sariyaana neram.</p>
                <p style={{ margin:'0', color:'#888', fontStyle:'italic' }}>● listening…</p>
              </div>
            </div>

            <div style={{ flex:'0 0 240px', display:'flex', flexDirection:'column', gap: 8 }}>
              <div className="wf-hand" style={{ fontSize: 13, fontWeight: 700 }}>Tomorrow · Cardiology</div>
              <div className="wf-card-dash" style={{ padding: 10 }}>
                {['08:00','09:00','10:00','10:30 ←','11:00','12:00','14:00','15:00','16:00'].map(s => {
                  const booked = ['09:00','11:00','15:00'].includes(s);
                  const live = s.includes('←');
                  return (
                    <div key={s} style={{
                      padding:'4px 8px', margin:'3px 0', borderRadius: 6, fontSize: 11,
                      background: live ? '#0EA5E9' : booked ? '#D1FAE5' : '#fff',
                      color: live ? '#fff' : '#222',
                      border:`1px ${live ? 'solid' : 'dashed'} ${live ? '#0EA5E9' : booked ? '#10B981' : '#d4d4d2'}`,
                      display:'flex', alignItems:'center', gap: 6,
                    }}>
                      <span className="wf-mono">{s}</span>
                      {booked && <span style={{ fontSize: 10 }}>booked via bot</span>}
                      {live && <span style={{ fontSize: 10 }}>← being booked now</span>}
                    </div>
                  );
                })}
              </div>
              <Note>Bot writes directly to the doctor's calendar.</Note>
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 13. Hospital Admin Dashboard
// ───────────────────────────────────────────────────────────────
function AdminDashboardScreen() {
  return (
    <ScreenFrame active="analytics">
      <PageHead
        title="Hospital Admin · Apollo Chennai"
        sub="Sanjay Reddy · CMIO · May 2026"
        right={
          <div style={{ display:'flex', gap: 6 }}>
            <span className="wf-chip" style={{ gap: 4 }}>May 2026 <Icon name="chevDown" size={11}/></span>
            <button className="wf-btn"><Icon name="download"/> Monthly report</button>
          </div>
        }
      />
      <div style={{ padding: 16, display:'flex', flexDirection:'column', gap: 12, flex: 1, minHeight: 0, overflow:'auto' }}>
        {/* top stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 10 }}>
          <Stat label="Notes generated · MTD" value="14,238" delta="+18% MoM" />
          <Stat label="Transcription cost saved" value="₹1,24,000" delta="this month" deltaTone="teal" />
          <Stat label="ICD coding accuracy" value="96.4%" delta="vs 89% manual" deltaTone="teal" />
          <Stat label="Doctors active / licensed" value="38 / 42" delta="90% utilisation" />
        </div>

        <div style={{ display:'flex', gap: 12 }}>
          {/* dept bar chart */}
          <div className="wf-card" style={{ flex: 1, padding: 14 }}>
            <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Notes by department</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap: 16, height: 150, padding:'0 8px' }}>
              {[
                ['OPD',5840,'#0EA5E9'],
                ['Radiology',2210,'#0EA5E9'],
                ['Cardiology',1850,'#0EA5E9'],
                ['Pediatrics',1420,'#0EA5E9'],
                ['Ortho',1180,'#0EA5E9'],
                ['Gyn',940,'#0EA5E9'],
                ['ENT',798,'#0EA5E9'],
              ].map(([d,v,c],i) => {
                const h = (v / 5840) * 130;
                return (
                  <div key={d} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4 }}>
                    <div className="wf-mono" style={{ fontSize: 10, color:'#666' }}>{v.toLocaleString()}</div>
                    <div style={{ width:'100%', height: h, background: c, border:'1.5px solid #1a1a1a', borderRadius:'6px 6px 0 0' }}/>
                    <div style={{ fontSize: 11 }}>{d}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ABDM compliance */}
          <div className="wf-card" style={{ flex:'0 0 280px', padding: 14 }}>
            <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>ABDM Compliance</div>
            {[
              ['M1','HFR registration','done','green'],
              ['M2','HPR — all doctors linked','done','green'],
              ['M3','PHR sharing · partial','in progress','amber'],
              ['M4','Health Information Exchange','pending','gray'],
            ].map(([m,t,st,tone],i) => (
              <div key={m} style={{ display:'flex', gap: 8, padding:'6px 0', borderBottom:'1px dashed #ececea' }}>
                <div style={{
                  width: 28, height: 28, borderRadius:'50%',
                  background: tone === 'green' ? '#10B981' : tone === 'amber' ? '#F59E0B' : '#9ca3af',
                  color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight: 700, fontSize: 11, flex:'0 0 28px',
                }}>{tone === 'green' ? '✓' : m}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{t}</div>
                  <div style={{ fontSize: 10, color:'#666' }}>{st}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* doctors table */}
        <div className="wf-card" style={{ padding: 0 }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px dashed #d4d4d2' }}>
            <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Doctor leaderboard · documentation compliance</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr .8fr .8fr .8fr', padding:'8px 14px', fontSize: 10, color:'#666', borderBottom:'1px dashed #d4d4d2', textTransform:'uppercase' }}>
            <div>Doctor</div><div>Department</div><div>Consults</div><div>Time saved</div><div>Compliance</div>
          </div>
          {[
            ['Dr. Priya Sharma','Internal Medicine',418,'52 hrs',98],
            ['Dr. Rohit Menon','Cardiology',312,'41 hrs',96],
            ['Dr. Kavita Iyer','Pediatrics',402,'48 hrs',95],
            ['Dr. Anand V.','Radiology',1180,'71 hrs',94],
            ['Dr. Naveen K.','Orthopaedics',288,'34 hrs',88],
            ['Dr. Shreya P.','Gynaecology',236,'28 hrs',82],
          ].map(([n,d,c,t,p],i) => (
            <div key={i} className="wf-row" style={{ gridTemplateColumns:'1.5fr 1fr .8fr .8fr .8fr' }}>
              <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
                <Avatar initial={n.split(' ').slice(-1)[0][0]} size={24}/>
                <div style={{ fontWeight: 600 }}>{n}</div>
              </div>
              <div>{d}</div>
              <div className="wf-mono">{c}</div>
              <div className="wf-mono">{t}</div>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <div style={{ width: 80, height: 6, background:'#f3f3f1', borderRadius: 3, overflow:'hidden' }}>
                  <div style={{ width:`${p}%`, height:'100%', background: p >= 95 ? '#10B981' : p >= 85 ? '#0EA5E9' : '#F59E0B' }}/>
                </div>
                <div className="wf-mono" style={{ width: 28 }}>{p}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenFrame>
  );
}

// ───────────────────────────────────────────────────────────────
// 14. Settings
// ───────────────────────────────────────────────────────────────
function SettingsScreen() {
  return (
    <ScreenFrame active="settings">
      <PageHead title="Settings" sub="Account, integrations, language, privacy" />
      <div style={{ display:'flex', flex: 1, minHeight: 0 }}>
        {/* settings nav */}
        <div style={{ flex:'0 0 200px', borderRight:'1px dashed #d4d4d2', padding: 14, display:'flex', flexDirection:'column', gap: 4 }}>
          {[
            ['Profile', true],
            ['EMR Integrations', false],
            ['Language', false],
            ['Notifications', false],
            ['Subscription', false],
            ['Data & Privacy', false],
            ['Firebase Account', false],
          ].map(([n,sel],i) => (
            <div key={n} style={{
              padding:'8px 10px', borderRadius: 6, fontSize: 12,
              background: sel ? '#E0F2FE' : 'transparent',
              color: sel ? '#0c4a6e' : '#333', fontWeight: sel ? 600 : 400,
              borderLeft: sel ? '3px solid #0EA5E9' : '3px solid transparent',
            }}>{n}</div>
          ))}
        </div>

        <div style={{ flex: 1, padding: 18, display:'flex', flexDirection:'column', gap: 14, overflow:'auto' }}>
          {/* Profile */}
          <div className="wf-card" style={{ padding: 14 }}>
            <div className="wf-hand" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Profile</div>
            <div style={{ display:'flex', gap: 14, alignItems:'flex-start' }}>
              <Avatar initial="P" size={70}/>
              <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
                {[
                  ['Name','Dr. Priya Sharma'],
                  ['Specialty','Internal Medicine'],
                  ['Hospital','Apollo Hospitals, Chennai'],
                  ['Medical Council ID','TMC-58921'],
                  ['Primary language','English + Hindi'],
                  ['Phone','+91 98404 12345'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color:'#666', marginBottom: 3 }}>{k}</div>
                    <div className="wf-box-dash" style={{ padding:'7px 10px', fontSize: 12 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EMR + Language side-by-side */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
            <div className="wf-card" style={{ padding: 14 }}>
              <div className="wf-hand" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>EMR Integrations</div>
              {[
                ['Practo','connected','green'],
                ['KareXpert','connected','green'],
                ['eHospital','not connected','gray'],
                ['HIMS Custom (FHIR)','connected','green'],
              ].map(([n,st,tone],i) => (
                <div key={n} className="wf-row" style={{ gridTemplateColumns:'1.4fr .8fr auto', padding:'9px 0' }}>
                  <div style={{ fontWeight: 600 }}>{n}</div>
                  <div style={{ fontSize: 11 }}><span className={`dot ${tone}`}/> {st}</div>
                  <div><button className="wf-btn" style={{ padding:'4px 9px', fontSize: 11 }}>{tone === 'green' ? 'Disconnect' : 'Connect'}</button></div>
                </div>
              ))}
            </div>

            <div className="wf-card" style={{ padding: 14 }}>
              <div className="wf-hand" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Transcription languages</div>
              <div style={{ fontSize: 10, color:'#666', marginBottom: 6 }}>Primary</div>
              <div style={{ display:'flex', gap: 6, flexWrap:'wrap', marginBottom: 12 }}>
                <span className="wf-pill" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9' }}>English</span>
                <span className="wf-pill" style={{ background:'#0EA5E9', color:'#fff', borderColor:'#0EA5E9' }}>Hindi</span>
              </div>
              <div style={{ fontSize: 10, color:'#666', marginBottom: 6 }}>Also detect</div>
              <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
                {['Tamil','Telugu','Kannada','Marathi','Bengali','Malayalam'].map(l => (
                  <span key={l} className="wf-pill" style={{ fontSize: 11 }}>{l}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Subscription + Privacy */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
            <div className="wf-card" style={{ padding: 14, background:'#F0F9FF', borderColor:'#0EA5E9' }}>
              <div className="wf-hand" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Subscription · Pro</div>
              <div style={{ fontSize: 11, color:'#0c4a6e', marginBottom: 8 }}>42 doctors licensed · 38 active · renews 14 Jun 2026</div>
              <div className="wf-hand" style={{ fontSize: 22, fontWeight: 700 }}>₹89,000<span style={{ fontSize: 12, fontWeight: 400 }}> /mo</span></div>
              <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
                <button className="wf-btn">Manage</button>
                <button className="wf-btn wf-btn-primary">Upgrade to Enterprise</button>
              </div>
            </div>

            <div className="wf-card" style={{ padding: 14 }}>
              <div className="wf-hand" style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Data &amp; Privacy</div>
              {[
                ['DPDP compliance mode','on'],
                ['Patient consent before record','on'],
                ['Store voice recordings','off'],
                ['ABHA share on consent only','on'],
              ].map(([k,v],i) => (
                <div key={k} className="wf-row" style={{ gridTemplateColumns:'1fr auto', padding:'7px 0', borderBottom: i < 3 ? '1px dashed #d4d4d2' : 'none' }}>
                  <div>{k}</div>
                  <div style={{
                    width: 36, height: 20, borderRadius: 999,
                    background: v === 'on' ? '#0EA5E9' : '#d4d4d2',
                    position:'relative', border:'1.25px solid #1a1a1a',
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius:'50%', background:'#fff',
                                  position:'absolute', top: 1, left: v === 'on' ? 18 : 2, border:'1px solid #1a1a1a' }}/>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 10, color:'#666', marginTop: 6 }}>Retention period: 7 years (clinical) · 90 days (raw audio)</div>
            </div>
          </div>

          {/* Firebase account */}
          <div className="wf-card" style={{ padding: 14, display:'flex', alignItems:'center', gap: 12 }}>
            <span style={{ width: 14, height: 14, borderRadius:'50%', background:
              'conic-gradient(#4285F4 0 25%, #34A853 25% 50%, #FBBC05 50% 75%, #EA4335 75%)' }}/>
            <div style={{ flex: 1 }}>
              <div className="wf-hand" style={{ fontSize: 14, fontWeight: 700 }}>Signed in via Google · Firebase</div>
              <div style={{ fontSize: 11, color:'#666' }}>priya.sharma@apollochennai.in · last sign-in 21 May 2026, 08:14</div>
            </div>
            <button className="wf-btn"><Icon name="logout"/> Log out</button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

Object.assign(window, {
  PatientRecordsScreen, RadiologyScreen, PrescriptionScreen,
  OutboundBotScreen, AppointmentBotScreen, AdminDashboardScreen, SettingsScreen,
});
