export class AudioManager {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master output with slight compression to glue everything together
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.0;
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 10;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.05;
        compressor.release.value = 0.3;
        this.masterGain.connect(compressor);
        compressor.connect(this.ctx.destination);

        // Fade master in slowly so it doesn't blast on start
        this.masterGain.gain.linearRampToValueAtTime(1.0, this.ctx.currentTime + 4.0);

        this._buildDrones();
        this._buildPulse();
        this._buildMelody();
        this._buildRumble();
        this._buildCreaks();
        this._buildWhispers(); // Add whisper layer for extra horror
    }

    // --- Layer 1: Deep, slow-breathing string drones in D minor ---
    _buildDrones() {
        // Enhanced horror chord progression: D minor → B♭ major → F minor → C diminished
        const droneFreqs = [
            { f: 36.71, detune: 0,   vol: 0.45 }, // D1 — sub bass
            { f: 58.27, detune: -2,  vol: 0.35 }, // B♭1 — unsettling tension
            { f: 87.31, detune: -3,  vol: 0.30 }, // F2 minor 3rd
            { f: 110.00, detune: 6,   vol: 0.25 }, // A2 5th
            { f: 130.81, detune: -6,  vol: 0.20 }, // C3 diminished 7th — dissonance
            { f: 155.56, detune: 4,   vol: 0.15 }, // G♭3 — additional tension
        ];

        droneFreqs.forEach(({ f, detune, vol }) => {
            // Two slightly detuned oscillators per note for a "chorus" string effect
            [-detune, detune].forEach(dt => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const lp = this.ctx.createBiquadFilter();

                osc.type = 'sawtooth';
                osc.frequency.value = f;
                osc.detune.value = dt;

                lp.type = 'lowpass';
                lp.frequency.value = 320;
                lp.Q.value = 0.8;

                gain.gain.value = vol * 0.5;

                // Slow tremolo — breathing effect
                const lfo = this.ctx.createOscillator();
                const lfoGain = this.ctx.createGain();
                lfo.type = 'sine';
                lfo.frequency.value = 0.18 + Math.random() * 0.08;
                lfoGain.gain.value = vol * 0.18;
                lfo.connect(lfoGain);
                lfoGain.connect(gain.gain);
                lfo.start();

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(this.masterGain);
                osc.start();
            });
        });
    }

    // --- Layer 2: Slow, ominous heartbeat-like pulse ---
    _buildPulse() {
        const bpm = 52; // Slow, dread-inducing tempo
        const interval = (60 / bpm) * 1000;

        const playBeat = (time) => {
            if (!this.initialized) return;
            const t = this.ctx.currentTime;

            // Low thud
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lp = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(55, t);
            osc.frequency.exponentialRampToValueAtTime(28, t + 0.35);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.7, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            lp.type = 'lowpass';
            lp.frequency.value = 180;

            osc.connect(lp);
            lp.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.5);

            // Soft high transient click on beat 2 (off-beat tension)
            setTimeout(() => {
                if (!this.initialized) return;
                const t2 = this.ctx.currentTime;
                const osc2 = this.ctx.createOscillator();
                const g2 = this.ctx.createGain();
                const hp = this.ctx.createBiquadFilter();

                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(1200, t2);
                osc2.frequency.exponentialRampToValueAtTime(200, t2 + 0.08);

                g2.gain.setValueAtTime(0, t2);
                g2.gain.linearRampToValueAtTime(0.12, t2 + 0.005);
                g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.1);

                hp.type = 'highpass';
                hp.frequency.value = 800;

                osc2.connect(hp);
                hp.connect(g2);
                g2.connect(this.masterGain);
                osc2.start(t2);
                osc2.stop(t2 + 0.1);
            }, interval * 0.55);

            setTimeout(playBeat, interval);
        };

        setTimeout(playBeat, 800);
    }

    // --- Layer 3: Slow, eerie minor melody (music box / plucked strings feel) ---
    _buildMelody() {
        // D natural minor scale: D E F G A Bb C D
        // Phrase in D minor — unsettling, unresolved
        const phrase = [
            { midi: 62, dur: 1.8 }, // D4
            { midi: 60, dur: 1.2 }, // C4
            { midi: 57, dur: 2.0 }, // A3
            { midi: 53, dur: 1.5 }, // F3
            { midi: 55, dur: 1.0 }, // G3
            { midi: 53, dur: 1.0 }, // F3
            { midi: 50, dur: 2.5 }, // D3
            { midi: 52, dur: 1.2 }, // E3 (slightly dissonant)
            { midi: 50, dur: 3.5 }, // D3 — long resolve
        ];

        const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

        const playPhrase = () => {
            if (!this.initialized) return;
            let delay = 0;

            phrase.forEach(({ midi, dur }) => {
                setTimeout(() => {
                    if (!this.initialized) return;
                    const t = this.ctx.currentTime;
                    const freq = midiToHz(midi);

                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const lp = this.ctx.createBiquadFilter();

                    // Triangle wave for a hollow, ghostly tone
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    osc.detune.value = (Math.random() - 0.5) * 8; // slight human imperfection

                    lp.type = 'lowpass';
                    lp.frequency.value = 1800;

                    // Pluck envelope: fast attack, slow decay
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.09, t + 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);

                    osc.connect(lp);
                    lp.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t);
                    osc.stop(t + dur);
                }, delay * 1000);

                delay += dur * 0.9;
            });

            // Repeat phrase with a long silence gap for tension
            const totalDur = phrase.reduce((s, n) => s + n.dur * 0.9, 0);
            setTimeout(playPhrase, (totalDur + 6.0) * 1000);
        };

        // Start melody after a few seconds so drones establish first
        setTimeout(playPhrase, 3500);
    }

    // --- Layer 4: Sub-bass rumble — constant unease ---
    _buildRumble() {
        // Brown noise via AudioWorklet isn't available everywhere, so we use
        // filtered white noise from a buffer for a deep rumble
        const bufferSize = this.ctx.sampleRate * 4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate brown noise
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 12; // boost amplitude
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 90;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.28;

        // Slow LFO swell on the rumble for an organic "breathing" feel
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.07;
        lfoGain.gain.value = 0.12;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        source.connect(lp);
        lp.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    // --- Layer 5: Random distant creaks and whispers for mystery ---
    _buildCreaks() {
        const playCreak = () => {
            if (!this.initialized) return;
            const t = this.ctx.currentTime;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const bp = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            const baseFreq = 180 + Math.random() * 220;
            osc.frequency.setValueAtTime(baseFreq, t);
            osc.frequency.linearRampToValueAtTime(baseFreq * (0.6 + Math.random() * 0.5), t + 0.6);

            bp.type = 'bandpass';
            bp.frequency.value = baseFreq;
            bp.Q.value = 4;

            const vol = 0.04 + Math.random() * 0.06;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol, t + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

            osc.connect(bp);
            bp.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.8);

            // Schedule next creak at a random interval (4–14 seconds)
            setTimeout(playCreak, 4000 + Math.random() * 10000);
        };

        setTimeout(playCreak, 2000 + Math.random() * 5000);
    }

    // --- Layer 6: Disturbing whispers for psychological horror ---
    _buildWhispers() {
        const playWhisper = () => {
            if (!this.initialized) return;
            const t = this.ctx.currentTime;

            // Create filtered noise for whisper effect
            const noise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Generate white noise
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() - 0.5) * 0.1;
            }
            
            buffer.copyToChannel(data, 0);
            noise.buffer = buffer;
            
            // Apply heavy filtering for whisper effect
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800 + Math.random() * 400; // Random vocal range
            filter.Q.value = 2;
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.03, t + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            noise.start(t);
            noise.stop(t + 1.5);
            
            // Schedule next whisper at random interval (8-20 seconds)
            setTimeout(playWhisper, 8000 + Math.random() * 12000);
        };
        
        setTimeout(playWhisper, 5000 + Math.random() * 10000);
    }

    playDialogueBlip() {
        if (!this.initialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(380 + Math.random() * 120, this.ctx.currentTime);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.055);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.055);
    }

    playVictorySound() {
        if (!this.initialized) return;

        const t = this.ctx.currentTime;
        
        // Create a triumphant ascending chord
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        frequencies.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + index * 0.1);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            const startTime = t + index * 0.1;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
            
            osc.start(startTime);
            osc.stop(startTime + 1.5);
        });
    }
}
