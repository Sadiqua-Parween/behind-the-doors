export class AudioManager {
    constructor() {
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // 1. Deep Sub-Bass Drone
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 45; // Sub-bass frequency

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;

        // Modulate the lowpass filter to create a "breathing" effect
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // 20-second cycle
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 60;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        const oscGain = this.ctx.createGain();
        oscGain.gain.value = 0.8;

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start();

        // 2. High Eerie Wind / Room Tone (Brown Noise)
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise approximation
            lastOut = data[i];
            data[i] *= 3.5; // Compensate for volume drop
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = buffer;
        noiseSrc.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 800; // Muffled wind sound

        const noiseLfo = this.ctx.createOscillator();
        noiseLfo.type = 'sine';
        noiseLfo.frequency.value = 0.1;
        const noiseLfoGain = this.ctx.createGain();
        noiseLfoGain.gain.value = 300;
        noiseLfo.connect(noiseLfoGain);
        noiseLfoGain.connect(noiseFilter.frequency);
        noiseLfo.start();

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.15; // Kept quiet in background

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSrc.start();
    }

    playDialogueBlip() {
        if (!this.initialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Randomize frequency slightly for more organic speech texture
        osc.frequency.setValueAtTime(400 + Math.random() * 150, this.ctx.currentTime);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Very quick sharp envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.06);
    }
}
