import { GameState } from '../core/state.js';
import { StorageSystem } from '../core/storage.js';
import { Engine } from '../core/engine.js';
import { STAGE_DATA } from './stageData.js';
import { StageManager } from './stage.js';
import { StorySystem } from './story.js';
import { BrushEffects } from '../effects/brush.js';
import { AuthSystem } from './auth.js';

export const ChapterSystem = {
  loadStage(stageNumber) {
    const config = STAGE_DATA[stageNumber] || STAGE_DATA[1];
    GameState.saveData.stage = config.id;
    StorageSystem.saveCurrentSlot();
    AuthSystem.refreshAllUI();

    const stageInstance = new StageManager(config, (isFinalEnding) => {
      if (isFinalEnding) {
        // 엔딩 완료 후 타이틀로 복귀 및 스테이지 1로 순환 준비
        GameState.saveData.stage = 1;
        StorageSystem.saveCurrentSlot();
        document.getElementById('hud')?.classList.add('hidden');
        document.getElementById('title-screen')?.classList.remove('hidden');
        AuthSystem.refreshAllUI();
      } else {
        // 다음 스테이지로 두루마리 덧칠 전환
        const nextStageId = config.id + 1;
        BrushEffects.triggerRepaintRevive(() => {
          this.loadStage(nextStageId);
        });
      }
    });

    Engine.activeStage = stageInstance;
    Engine.player = stageInstance.player;
    Engine.camera.x = Math.max(0, stageInstance.player.x - 300);

    // 스테이지 진입 스토리 재생
    if (config.introScript) {
      StorySystem.playScript(config.introScript);
    }
  }
};
