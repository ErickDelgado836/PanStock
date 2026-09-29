/**
 * Audio synthesis utilities for PanStock using the Web Audio API.
 * 100% native, zero external asset downloads, zero latency, and cross-browser compatible.
 */

let lastBlockedSoundTime = 0;

/**
 * Plays a calm, airy, and soothing ambient welcome bloom inspired by the Windows 11 startup sound.
 * Characterized by soft swelling attacks (no percussive hammer clicks), warm low-end foundation,
 * and a peaceful Eb major harmonic progression (Eb3 -> Eb4 -> Bb4 -> Eb5 -> G5).
 * Non-invasive, relaxing, and modern.
 */
export function playLoginSuccessSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Smooth ambient low-pass filter (warm & silky, cuts any digital harshness)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.Q.setValueAtTime(0.7, now);

    // Master volume: rich, clearly audible and clear
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.24, now);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Windows 11-style ambient swells (Eb major chord progression)
    // Key feature: slow swell attack (60ms-90ms) so notes breathe in like ambient light, rather than a struck key.
    const swells = [
      // 1. Deep warm foundation swell (Eb3)
      { freq: 155.56, start: 0.00, attack: 0.09, duration: 1.50, vol: 0.38 },
      // 2. Mid foundation swell (Eb4)
      { freq: 311.13, start: 0.00, attack: 0.08, duration: 1.45, vol: 0.42 },
      // 3. Harmonious fifth swell (Bb4)
      { freq: 466.16, start: 0.14, attack: 0.075, duration: 1.35, vol: 0.38 },
      // 4. Octave lift swell (Eb5)
      { freq: 622.25, start: 0.28, attack: 0.070, duration: 1.25, vol: 0.30 },
      // 5. Resolving peaceful major third (G5)
      { freq: 783.99, start: 0.42, attack: 0.080, duration: 1.30, vol: 0.25 },
    ];

    swells.forEach((s) => {
      const startTime = now + s.start;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(s.freq, startTime);

      // Gentle swell in (ambient bloom), then smooth exponential decay
      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(s.vol, startTime + s.attack);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + s.duration);

      osc.connect(noteGain);
      noteGain.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + s.duration + 0.05);
    });

    // Safely close the context after the ambient wash resolves
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 2000);
  } catch {
    // Fail silently if browser audio is disabled
  }
}

/**
 * Plays a discreet, subtle, and non-invasive acoustic "blocked / action not allowed" sound.
 * Designed like a muted double wooden tap / soft haptic bump (similar to modern OS invalid action response).
 * Soft, low-frequency and polite — never loud, screechy, or alarming.
 */
export function playActionBlockedSound() {
  try {
    // Throttle to avoid sound overlap if multiple warnings trigger simultaneously
    const currentTimeMs = Date.now();
    if (currentTimeMs - lastBlockedSoundTime < 350) return;
    lastBlockedSoundTime = currentTimeMs;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Low-pass filter to keep sound warm, muted, and completely non-jarring
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now); // Clearly audible volume

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Two soft, muted low wooden taps ("tuk... tuk")
    const taps = [
      { freq: 175, time: 0.00, duration: 0.06, vol: 0.35 },
      { freq: 135, time: 0.08, duration: 0.07, vol: 0.28 },
    ];

    taps.forEach((tap) => {
      const t = now + tap.time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(tap.freq, t);
      osc.frequency.exponentialRampToValueAtTime(tap.freq * 0.72, t + tap.duration);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(tap.vol, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tap.duration);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + tap.duration + 0.02);
    });

    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    }, 400);
  } catch {
    // Fail silently
  }
}
