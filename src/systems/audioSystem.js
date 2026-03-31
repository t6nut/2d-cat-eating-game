export function startBackgroundMusic(scene) {
  if (scene.musicEvent) {
    scene.musicEvent.remove(false);
    scene.musicEvent = null;
  }

  scene.musicStep = 0;
  scene.musicEvent = scene.time.addEvent({
    delay: 280,
    loop: true,
    callback: () => scene.playMusicStep(),
  });
}

export function stopBackgroundMusic(scene) {
  if (scene.musicEvent) {
    scene.musicEvent.remove(false);
    scene.musicEvent = null;
  }
}

export function playMusicStep(scene) {
  if (!scene.audioCtx) {
    return;
  }

  const sequence = [0, 4, 7, 4, 9, 7, 4, 2];
  const semitone = sequence[scene.musicStep % sequence.length];
  scene.musicStep += 1;

  const now = scene.audioCtx.currentTime;
  const freq = 196 * (2 ** (semitone / 12));
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.022, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}

export function resumeAudio(scene) {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }
  if (!scene.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    scene.audioCtx = new Ctx();
  }
  if (scene.audioCtx.state === 'suspended') {
    scene.audioCtx.resume();
  }
}

export function playEnemyEatSound(scene, strength) {
  if (!scene.audioCtx) {
    return;
  }
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  const now = scene.audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(170 + strength * 8, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.055, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

export function playCatchSound(scene, strength) {
  if (!scene.audioCtx) {
    return;
  }
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  const now = scene.audioCtx.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320 + strength * 16, now);
  osc.frequency.exponentialRampToValueAtTime(450 + strength * 22, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.065, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

export function playEatSound(scene, strength) {
  if (!scene.audioCtx) {
    return;
  }
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  const now = scene.audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(190 + strength * 12, now);
  osc.frequency.exponentialRampToValueAtTime(130 + strength * 10, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

export function playAirplaneSound(scene) {
  if (!scene.audioCtx) {
    return;
  }
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  const now = scene.audioCtx.currentTime;
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(84, now);
  osc.frequency.linearRampToValueAtTime(68, now + 1.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.18);
  gain.gain.linearRampToValueAtTime(0.028, now + 0.92);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.12);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 1.15);
}

export function playDogBarkSound(scene) {
  if (!scene.audioCtx) {
    return;
  }
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  const now = scene.audioCtx.currentTime;
  osc.type = 'square';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.05);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.085, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playZombieStompSound(scene) {
  if (!scene.audioCtx) {
    return;
  }
  const osc = scene.audioCtx.createOscillator();
  const gain = scene.audioCtx.createGain();
  const now = scene.audioCtx.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(230, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.075, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  osc.connect(gain);
  gain.connect(scene.audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

export function playChefTossSound(scene) {
  if (!scene.audioCtx) {
    return;
  }

  const now = scene.audioCtx.currentTime;
  const notes = [740, 920, 1180];

  for (let i = 0; i < notes.length; i += 1) {
    const start = now + i * 0.055;
    const osc = scene.audioCtx.createOscillator();
    const gain = scene.audioCtx.createGain();
    osc.type = i === notes.length - 1 ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(notes[i], start);
    osc.frequency.exponentialRampToValueAtTime(notes[i] * 1.06, start + 0.045);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.036, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
    osc.connect(gain);
    gain.connect(scene.audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.09);
  }
}
