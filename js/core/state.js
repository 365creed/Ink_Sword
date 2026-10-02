// js/core/state.js
const GameState = {
  // 모드: 'TITLE', 'STAGE_INTRO', 'PLAYING', 'PAUSED', 'GAME_OVER', 'GAME_CLEAR'
  state: 'TITLE',
  
  // 플레이 모드 분기: 'STORY' (일반) | 'SPEEDRUN' (스킵+기록경쟁)
  gameMode: 'STORY',
  
  // 클리어 및 해금 여부
  gameCleared: false,
  speedRunnerUnlocked: false,
  
  // 진행도
  currentChapter: 1,
  currentStage: 1,
  
  // 시간 기록
  speedRunTime: 0,     // 스피드런 총 누적 초
  stageTime: 0,        // 현재 스테이지 진행 초
  
  // 카메라 및 아레나 락
  isCameraLocked: false,
  cameraLockX: 0,
  cameraX: 0,
  
  init() {
    const saved = StorageManager.load();
    this.gameCleared = saved.gameCleared || false;
    this.speedRunnerUnlocked = saved.speedRunnerUnlocked || false;
  },

  resetRun(mode = 'STORY') {
    this.gameMode = mode;
    this.currentChapter = 1;
    this.currentStage = 1;
    this.speedRunTime = 0;
    this.stageTime = 0;
    this.isCameraLocked = false;
    this.cameraLockX = 0;
    this.cameraX = 0;
  },

  lockCamera(lockX) {
    this.isCameraLocked = true;
    this.cameraLockX = lockX;
  },

  unlockCamera() {
    this.isCameraLocked = false;
  }
};
