// Alert Sound Generator - Creates non-intrusive emergency alert sounds
// Uses Web Audio API for dynamic sound generation

class AlertSoundManager {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
  }

  // Initialize AudioContext
  _initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  // Play emergency alert tone (subtle, non-intrusive)
  // Uses a siren-like pattern with ascending tones
  async playEmergencyTone() {
    if (this.isPlaying) return;
    
    try {
      this.isPlaying = true;
      const audioContext = this._initAudioContext();
      const now = audioContext.currentTime;
      
      // Create oscillators for siren effect
      const frequencies = [
        { freq: 800, duration: 0.3 },
        { freq: 1000, duration: 0.3 },
        { freq: 800, duration: 0.3 },
        { freq: 1200, duration: 0.3 }
      ];

      let currentTime = now;

      for (const tone of frequencies) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = tone.freq;
        oscillator.type = "sine";

        // Fade in
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.05);
        
        // Fade out
        gainNode.gain.linearRampToValueAtTime(0.1, currentTime + tone.duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + tone.duration);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + tone.duration);

        currentTime += tone.duration;
      }

      // Wait for sound to finish
      await new Promise(resolve => setTimeout(resolve, currentTime - now + 100));
      this.isPlaying = false;
    } catch (error) {
      console.error("Error playing emergency tone:", error);
      this.isPlaying = false;
    }
  }

  // Play brief high-priority alert beep
  playHighPriorityBeep() {
    try {
      const audioContext = this._initAudioContext();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1400; // High frequency for urgency
      oscillator.type = "sine";

      // Quick beep
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (error) {
      console.error("Error playing beep:", error);
    }
  }

  // Play confirmation sound (positive)
  playConfirmation() {
    try {
      const audioContext = this._initAudioContext();
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch (error) {
      console.error("Error playing confirmation:", error);
    }
  }
}

export const soundManager = new AlertSoundManager();
