import { GameState } from './js/core/state.js';
import { Engine } from './js/core/engine.js';
import { SoundSystem } from './js/core/sound.js';
import { AuthSystem } from './js/systems/auth.js';
import { StorySystem } from './js/systems/story.js';
import { ChapterSystem } from './js/systems/chapter.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. 오프라인 구동용 PWA Service Worker 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker 등록 안내 (로컬 파일 열기 시 무시 가능):', err);
    });
  }

  // 2. 캔버스 및 핵심 서브시스템 초기화
  const canvas = document.getElementById('game-canvas');
  Engine.init(canvas);
  StorySystem.init();
  Engine.storySystem = StorySystem;
  AuthSystem.init();

  // 3. 메인 루프 가동 (타이틀 화면에서도 배경 수묵 산수화가 살아 움직임)
  Engine.start();

  // 4. [화폭으로 들어가기] 게임 시작 버튼 이벤트
  const btnStart = document.getElementById('btn-start-game');
  btnStart?.addEventListener('click', () => {
    SoundSystem.init();
    SoundSystem.playChargeSlash();

    document.getElementById('title-screen')?.classList.add('hidden');
    document.getElementById('hud')?.classList.remove('hidden');

    GameState.isPaused = false;
    GameState.playerStats.hp = GameState.playerStats.maxHp;

    const targetStage = GameState.saveData.stage || 1;
    ChapterSystem.loadStage(targetStage);
  });

  // 5. 인게임 일시정지(타이틀 복귀) 버튼 이벤트
  const btnPause = document.getElementById('btn-pause');
  btnPause?.addEventListener('click', () => {
    GameState.isPaused = true;
    document.getElementById('hud')?.classList.add('hidden');
    document.getElementById('title-screen')?.classList.remove('hidden');
    AuthSystem.refreshAllUI();
  });
});
