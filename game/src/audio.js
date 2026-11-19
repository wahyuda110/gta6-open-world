// Synthesised sound: every effect is built with WebAudio oscillators and noise, and a small
// bass-and-hat loop plays as the city's music. No audio file is loaded, so the game stays
// offline. The context is created on the first user gesture; until then calls are silent no-ops.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 40;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A slow two-bar bass line with a hat tick, scheduled on a timer.
  function musicTick() {
    if (!ctx || muted) return;
    const bass = [55, 55, 65.4, 49, 55, 55, 73.4, 82.4];
    const freq = bass[step % bass.length];
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.45);
    step += 1;
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (ctx && !musicTimer) musicTimer = window.setInterval(musicTick, 230);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() {
      return muted;
    },
    setEngine(speedRatio, driving) {
      if (!ctx || muted) return;
      const target = driving ? 0.05 + 0.09 * speedRatio : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(45 + 130 * speedRatio, ctx.currentTime, 0.1);
    },
    shoot() {
      noise(0.12, 0.5, 2400);
      tone(180, 0.1, 'square', 0.25, 60);
    },
    punch() {
      noise(0.08, 0.4, 700);
    },
    crash() {
      noise(0.35, 0.6, 500);
      tone(70, 0.3, 'sine', 0.4, 35);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.3);
      window.setTimeout(() => tone(990, 0.14, 'sine', 0.3), 90);
    },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'triangle', 0.35), i * 110));
    },
    siren() {
      tone(700, 0.5, 'sine', 0.12, 950);
      window.setTimeout(() => tone(950, 0.5, 'sine', 0.12, 700), 500);
    },
    wantedUp() {
      tone(220, 0.18, 'square', 0.2, 440);
    },
    busted() {
      [392, 311, 233].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'sawtooth', 0.25), i * 160));
    },
    click() {
      tone(880, 0.05, 'sine', 0.2);
    },
  };
}
