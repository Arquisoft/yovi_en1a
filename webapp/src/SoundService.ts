export interface SoundSettings {
  muteMove: boolean;
  muteWin: boolean;
  muteLoss: boolean;
  muteBGM: boolean;
  theme: string;
}

export const AVAILABLE_PACKS = ['ysound', 'retro', 'funky'];

class SoundService {
  public settings: SoundSettings;
  private moveAudio = new Audio();
  private botMoveAudio = new Audio();
  private winAudio = new Audio();
  private lossAudio = new Audio();
  private bgmAudio = new Audio();

  constructor() {
    const defaults: SoundSettings = { muteMove: false, muteWin: false, muteLoss: false, muteBGM: false, theme: 'ysound' };
    try {
      const saved = localStorage.getItem('soundSettings');
      this.settings = saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      this.settings = defaults;
    }
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.2;
    this.loadTheme(this.settings.theme);
  }

  private save() {
    const settings = {
      muteMove: Boolean(this.settings.muteMove),
      muteWin: Boolean(this.settings.muteWin),
      muteLoss: Boolean(this.settings.muteLoss),
      muteBGM: Boolean(this.settings.muteBGM),
      theme: AVAILABLE_PACKS.includes(this.settings.theme) ? String(this.settings.theme) : 'ysound'
    };
    try { localStorage.setItem('soundSettings', JSON.stringify(sanitized)); } catch { }
  }

  private loadTheme(theme: string) {
    this.moveAudio.src = `/sounds/${theme}/move.mp3`;
    this.botMoveAudio.src = `/sounds/${theme}/botmove.mp3`;
    this.winAudio.src = `/sounds/${theme}/win.mp3`;
    this.lossAudio.src = `/sounds/${theme}/loss.mp3`;
    const wasPlaying = !this.bgmAudio.paused;
    this.bgmAudio.src = `/sounds/${theme}/bgm.mp3`;
    if (wasPlaying) this.bgmAudio.play().catch(() => { });
  }

  updateSettings(updates: Partial<SoundSettings>) {
    const oldTheme = this.settings.theme;
    this.settings = { ...this.settings, ...updates };
    this.save();
    if (updates.theme && updates.theme !== oldTheme) {
      this.loadTheme(updates.theme);
    }
    if (this.settings.muteBGM) this.stopBGM();
  }

  private play(audio: HTMLAudioElement) {
    audio.currentTime = 0;
    audio.play().catch(() => { });
  }

  playMove() { if (!this.settings.muteMove) this.play(this.moveAudio); }
  playBotMove() { if (!this.settings.muteMove) this.play(this.botMoveAudio); }
  playLoss() { if (!this.settings.muteLoss) this.play(this.lossAudio); }
  playWin() { if (!this.settings.muteWin) this.play(this.winAudio); }

  startBGM() {
    if (this.settings.muteBGM) return;
    this.bgmAudio.play().catch(() => { });
  }

  stopBGM() {
    this.bgmAudio.pause();
  }
}

export const soundService = new SoundService();
