export const SoundSystem = {
  ctx: null,
  isMuted: false,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // 화이트 노이즈 버퍼 생성 (칼바람, 붓질, 먹물 튀는 소리용)
  _createNoiseBuffer(duration = 0.2) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  },

  // 1. 묵검 베기 (날카로운 바람 소리 + 동양풍 현 울림)
  playSlash(comboStep = 1) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = 600 + comboStep * 220;
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.16);
    filter.Q.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.17);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  },

  // 2. 발도 차지 베기 (묵직한 대나무 베는 소리 + 거문고 저음 울림)
  playChargeSlash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 저음 현 울림
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);

    // 갈필 바람 소리
    this.playSlash(4);
  },

  // 3. 묵사슬 발사 (산나비 스타일 쇠사슬 마찰음)
  playChainThrow() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1280, now + 0.09);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  },

  // 4. 묵사슬 적중/고정 (묵직한 금속 꽂히는 소리)
  playChainLatch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.setValueAtTime(1420, now + 0.03);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  },

  // 5. 대시 (묵영보 - 붓이 종이를 스치는 소리)
  playDash() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.14);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.linearRampToValueAtTime(200, now + 0.14);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  },

  // 6. 적 타격 / 처치 (먹물 터지는 타격음 + 가야금 뜯는 배음)
  playHit(isKill = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // 동양 5음계(궁상각치우) 기반 주파수 선택
    const pentatonic = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
    const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];

    osc.type = isKill ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isKill ? note * 0.5 : note, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + (isKill ? 0.28 : 0.12));

    gain.gain.setValueAtTime(isKill ? 0.45 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (isKill ? 0.28 : 0.12));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (isKill ? 0.29 : 0.13));
  },

  // 7. 금묵 패링(튕겨내기) 성공음 (청아한 종/징 울림)
  playParry() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [880, 1318.5, 1760].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.56);
    });
  },

  // 8. 탈묵(사망) 및 거대한 붓 덧칠(부활) 사운드
  playRepaintRevive() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 묵직한 북(법고) 울림 + 거대한 붓 쓸기
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.7);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.76);
  }
};
