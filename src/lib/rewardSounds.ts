/**
 * Reward Sound Engine — Procedural Web Audio API
 * Zero external assets. All sounds synthesized in real-time.
 * ~120 lines, 0 bytes of audio files.
 */

let ctx: AudioContext | null = null;
let muted = false;

// Initialize AudioContext on first user interaction (browser policy)
function getCtx(): AudioContext | null {
    if (muted) return null;
    if (!ctx) {
        try {
            ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        } catch {
            return null;
        }
    }
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    return ctx;
}

// ─── Mute control ───────────────────────────────────────────────────────

const MUTE_KEY = 'quizy_reward_muted';

export function setMuted(value: boolean): void {
    muted = value;
    if (typeof window !== 'undefined') {
        localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    }
}

export function isMuted(): boolean {
    if (typeof window !== 'undefined' && !muted) {
        const stored = localStorage.getItem(MUTE_KEY);
        if (stored === '1') {
            muted = true;
        }
    }
    return muted;
}

// ─── Sound primitives ───────────────────────────────────────────────────

function playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.15,
    delay = 0,
): void {
    const c = getCtx();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.02);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.01);
}

function playNoise(duration: number, volume = 0.08, filterFreq = 800): void {
    const c = getCtx();
    if (!c) return;

    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const source = c.createBufferSource();
    source.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    source.start();
    source.stop(c.currentTime + duration + 0.01);
}

// ─── Public sound API ───────────────────────────────────────────────────

/** Soft whoosh — box arrival */
export function playArrival(): void {
    playNoise(0.3, 0.06, 600);
    playTone(220, 0.25, 'sine', 0.04);
}

/** Short blip — countdown tick */
export function playCountdownTick(): void {
    playTone(880, 0.08, 'sine', 0.1);
}

/** Mechanical click — box unlock */
export function playUnlock(): void {
    playTone(440, 0.05, 'square', 0.08);
    playTone(660, 0.08, 'square', 0.06, 0.05);
    playNoise(0.1, 0.04, 2000);
}

/** Ascending chime — reward reveal */
export function playReveal(): void {
    playTone(523, 0.2, 'sine', 0.12);       // C5
    playTone(659, 0.25, 'sine', 0.12, 0.12); // E5
    playTone(784, 0.3, 'sine', 0.1, 0.24);   // G5
}

/** Three-note arpeggio — claim success */
export function playSuccess(): void {
    playTone(523, 0.15, 'sine', 0.1);        // C5
    playTone(659, 0.15, 'sine', 0.1, 0.1);   // E5
    playTone(1047, 0.3, 'sine', 0.08, 0.2);  // C6
}
