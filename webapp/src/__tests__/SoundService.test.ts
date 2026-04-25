import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { soundService } from '../SoundService';

describe('SoundService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Simulate pristine load
    soundService.settings = { muteMove: false, muteWin: false, muteLoss: false, muteBGM: false, theme: 'ysound' };
    
    // Mock the HTML Audio element API
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes default settings', () => {
    expect(soundService.settings.theme).toBe('ysound');
    expect(soundService.settings.muteBGM).toBe(false);
  });

  it('updates settings and persists to localStorage safely', () => {
    soundService.updateSettings({ muteBGM: true, theme: 'retro' });
    expect(soundService.settings.muteBGM).toBe(true);
    expect(soundService.settings.theme).toBe('retro');
    
    // Check localStorage sanitization
    const saved = JSON.parse(localStorage.getItem('soundSettings') || '{}');
    expect(saved.muteBGM).toBe(true);
    expect(saved.theme).toBe('retro');
  });

  it('sanitizes bad themes by using ysound fallback', () => {
    soundService.updateSettings({ theme: 'hacked_theme' });
    const saved = JSON.parse(localStorage.getItem('soundSettings') || '{}');
    expect(saved.theme).toBe('ysound'); // Ensure it falls back
  });

  it('plays move sound when not muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.playMove();
    expect(playSpy).toHaveBeenCalled();
  });

  it('blocks move sound when muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.updateSettings({ muteMove: true });
    soundService.playMove();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('plays bot move sound', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.playBotMove();
    expect(playSpy).toHaveBeenCalled();
  });

  it('plays win sound when not muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.playWin();
    expect(playSpy).toHaveBeenCalled();
  });

  it('blocks win sound when muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.updateSettings({ muteWin: true });
    soundService.playWin();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('plays loss sound when not muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.playLoss();
    expect(playSpy).toHaveBeenCalled();
  });

  it('blocks loss sound when muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.updateSettings({ muteLoss: true });
    soundService.playLoss();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('starts BGM when not muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.startBGM();
    expect(playSpy).toHaveBeenCalled();
  });

  it('does not start BGM when muted', () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    soundService.updateSettings({ muteBGM: true });
    soundService.startBGM();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('stops BGM', () => {
    const pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause');
    soundService.stopBGM();
    expect(pauseSpy).toHaveBeenCalled();
  });
});
