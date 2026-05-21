// Assemble all 14 screens onto the design canvas.

const W = 1400;
const H = 900;
const LOGIN_W = 720;
const LOGIN_H = 720;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "sketchy": true,
  "annotations": true,
  "density": "regular",
  "borders": "dashed",
  "surface": "paper",
  "navIcons": true
}/*EDITMODE-END*/;

const SURFACES = {
  paper:  { bg: '#f0eee9', name: 'Paper' },
  white:  { bg: '#ffffff', name: 'White' },
  cool:   { bg: '#eef2f7', name: 'Cool' },
  warm:   { bg: '#f6f0e8', name: 'Warm' },
};

function TweakStyleOverrides({ t }) {
  // Build a CSS string that overrides wireframe styles based on current tweaks.
  const css = [];

  if (!t.sketchy) {
    // Drop hand-drawn fonts — switch to Inter for headings, Caveat→Inter italic for notes
    css.push(`.wf-hand{font-family:Inter,sans-serif !important;font-weight:600 !important;}`);
    css.push(`.wf-cav{font-family:Inter,sans-serif !important;font-style:italic !important;font-size:13px !important;}`);
  }

  if (!t.annotations) {
    css.push(`.wf-cav{display:none !important;}`);
  }

  if (t.density === 'compact') {
    css.push(`.wf-card{padding:9px !important;} .wf-card-dash{padding:9px !important;} .wf-row{padding:6px 10px !important;font-size:11px !important;}`);
  } else if (t.density === 'comfy') {
    css.push(`.wf-card{padding:18px !important;} .wf-card-dash{padding:18px !important;} .wf-row{padding:12px 16px !important;}`);
  }

  if (t.borders === 'solid') {
    css.push(`.wf-box-dash,.wf-card-dash{border-style:solid !important;}`);
  } else if (t.borders === 'light') {
    css.push(`.wf-box,.wf-card,.wf-box-dash,.wf-card-dash,.bed{border-width:1px !important;border-color:#bfbfbd !important;}`);
    css.push(`.wf-box-dash,.wf-card-dash{border-style:dashed !important;border-color:#bfbfbd !important;}`);
  }

  if (!t.navIcons) {
    css.push(`.wf-nav svg{display:none !important;}`);
  }

  // Canvas surface tint
  const surfaceBg = (SURFACES[t.surface] || SURFACES.paper).bg;
  css.push(`body{background:${surfaceBg} !important;}`);

  return <style>{css.join('\n')}</style>;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <React.Fragment>
      <TweakStyleOverrides t={t} />

      <DesignCanvas>
        <DCSection id="auth" title="Auth" subtitle="01 — Login & sign-up">
          <DCArtboard id="s01" label="01 · Login / Sign Up" width={LOGIN_W} height={LOGIN_H}>
            <LoginScreen />
          </DCArtboard>
        </DCSection>

        <DCSection id="doctor" title="Doctor workflow" subtitle="02–05 — main consult loop">
          <DCArtboard id="s02" label="02 · Doctor Dashboard"        width={W} height={H}><DashboardScreen /></DCArtboard>
          <DCArtboard id="s03" label="03 · Active Consultation"     width={W} height={H}><ActiveConsultScreen /></DCArtboard>
          <DCArtboard id="s04" label="04 · SOAP Note Review"        width={W} height={H}><SoapScreen /></DCArtboard>
          <DCArtboard id="s05" label="05 · Voice Agent (hands-free)" width={W} height={H}><VoiceAgentScreen /></DCArtboard>
        </DCSection>

        <DCSection id="ward" title="Ward & decision support" subtitle="06–07 — bedside + alerts">
          <DCArtboard id="s06" label="06 · Nurse Station"           width={W} height={H}><NurseStationScreen /></DCArtboard>
          <DCArtboard id="s07" label="07 · Clinical Decision Alerts" width={W} height={H}><AlertsScreen /></DCArtboard>
        </DCSection>

        <DCSection id="records" title="Records & dictation" subtitle="08–10 — patient data + Rx">
          <DCArtboard id="s08" label="08 · Patient Records"         width={W} height={H}><PatientRecordsScreen /></DCArtboard>
          <DCArtboard id="s09" label="09 · Radiology / Path. Dictation" width={W} height={H}><RadiologyScreen /></DCArtboard>
          <DCArtboard id="s10" label="10 · Prescription Manager"    width={W} height={H}><PrescriptionScreen /></DCArtboard>
        </DCSection>

        <DCSection id="bots" title="Voice bots" subtitle="11–12 — outbound + inbound">
          <DCArtboard id="s11" label="11 · Patient Voice Bot (outbound)" width={W} height={H}><OutboundBotScreen /></DCArtboard>
          <DCArtboard id="s12" label="12 · Appointment Bot (inbound)"    width={W} height={H}><AppointmentBotScreen /></DCArtboard>
        </DCSection>

        <DCSection id="admin" title="Admin & settings" subtitle="13–14 — hospital ops">
          <DCArtboard id="s13" label="13 · Hospital Admin Dashboard" width={W} height={H}><AdminDashboardScreen /></DCArtboard>
          <DCArtboard id="s14" label="14 · Settings"                 width={W} height={H}><SettingsScreen /></DCArtboard>
        </DCSection>

        <DCPostIt top={40} left={40} width={300}>
          <div style={{ fontFamily:'Kalam, cursive', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            StobaeusVoice · wireframes v1
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            14 screens · low-fi exploration.
            Hand-drawn fonts + dashed boxes = "not final."
            Teal (#0EA5E9) is the only product accent; reds/ambers only for clinical severity.
            Open Tweaks (top toolbar) to swap fidelity, density, surface.
          </div>
        </DCPostIt>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Fidelity" />
        <TweakToggle label="Sketchy fonts"
          value={t.sketchy}
          onChange={(v) => setTweak('sketchy', v)} />
        <TweakToggle label="Designer annotations"
          value={t.annotations}
          onChange={(v) => setTweak('annotations', v)} />
        <TweakRadio label="Borders"
          value={t.borders}
          options={['dashed','solid','light']}
          onChange={(v) => setTweak('borders', v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="Density"
          value={t.density}
          options={['compact','regular','comfy']}
          onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="Sidebar icons"
          value={t.navIcons}
          onChange={(v) => setTweak('navIcons', v)} />

        <TweakSection label="Canvas" />
        <TweakSelect label="Surface"
          value={t.surface}
          options={Object.keys(SURFACES)}
          onChange={(v) => setTweak('surface', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
