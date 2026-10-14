import { GameState } from '../core/state.js';
import { SoundSystem } from '../core/sound.js';

export const STORY_SCRIPTS = {
  STAGE_1_INTRO: [
    {
      seal: '화공',
      name: '이름을 버린 화공 (주인공)',
      text: '비단 두루마리 안쪽은 이토록 서늘한 묵빛이더냐... 요괴 놈들, 내 아이를 납치해 이런 그림 속에 숨어들다니.'
    },
    {
      seal: '화주',
      name: '화폭에 울리는 목소리',
      text: '어리석은 아비여. 이곳은 먹물이 곧 법이요, 여백이 곧 죽음인 화폭(畫幅)의 세계다. 발을 들이는 순간 네 몸도 한 줄기 먹선에 불과하거늘.'
    },
    {
      seal: '화공',
      name: '이름을 버린 화공',
      text: '법이든 계율이든 상관없다. 이 산수화를 전부 갈기갈기 찢어발겨서라도... 반드시 내 아이의 손을 잡고 나가겠다.'
    }
  ],

  STAGE_2_INTRO: [
    {
      seal: '망령',
      name: '대나무 숲의 파수꾼',
      text: '멈추어라! 네가 검을 휘두를 때마다 아름다운 화폭이 검붉은 피로 얼룩지고 있다. 정녕 무엇을 위해 이 세계를 부수는 것이냐!'
    },
    {
      seal: '화공',
      name: '이름을 버린 화공',
      text: '비켜라. 내 아이의 울음소리가 저 매화나무 정자 너머에서 들려온다. 가로막는 것은 정자든 산이든 모두 베어버릴 뿐이다.'
    }
  ],

  STAGE_3_BOSS_INTRO: [
    {
      seal: '매화',
      name: '사군자 : 매화검귀(梅花劍鬼)',
      text: '결국 화폭의 심장부까지 기어들어 왔구나. 네 몸에 밴 그 지독한 혈묵과 덧칠의 냄새... 너는 이미 사람이 아니라 야차(夜叉)다.'
    },
    {
      seal: '화공',
      name: '이름을 버린 화공',
      text: '입 닥쳐라 요괴 놈! 내 아이를 내놓아라!!'
    },
    {
      seal: '매화',
      name: '사군자 : 매화검귀(梅花劍鬼)',
      text: '아직도 깨닫지 못한 것이냐... 네가 찢어발긴 이 화폭이 누구의 기억으로 그려진 것인지를! 좋다, 내 검으로 그 미망(迷妄)을 베어주마!'
    }
  ],

  ENDING_TRUE: [
    {
      seal: '진실',
      name: '부서진 매화가지 너머의 기억',
      text: '매화검귀가 흩어지자, 찢어진 화선지 틈으로 현실의 기억이 쏟아져 들어온다. 화실을 덮쳤던 차가운 불길과... 품 안에서 이미 싸늘하게 식어버렸던 아이의 작은 손.'
    },
    {
      seal: '화공',
      name: '이름을 버린 화공',
      text: '아아... 그랬던 거였나. 요괴가 납치한 게 아니었어. 죽어가는 아이의 영혼을 붙잡으려고... 내가 피 섞인 먹물로 이 화폭을 그려 아이를 가두었던 거였어...'
    },
    {
      seal: '아이',
      name: '화폭에 남은 아이의 목소리',
      text: '"아버지, 이제 울지 마세요. 아버지가 그려주신 이 산수화 속에서 저는 충분히 행복했어요. 이제 저도, 아버지도... 붓을 놓아도 괜찮아요."'
    },
    {
      seal: '해원',
      name: '【 진엔딩 : 마지막 여백(餘白) 】',
      text: '화공은 피 묻은 묵검을 내려놓고, 아이의 영혼이 새 한 마리가 되어 하얀 여백 너머로 날아가는 모습을 조용히 올려다보았다. (모든 고서화 잔편 수집 달성)'
    }
  ],

  ENDING_MADNESS: [
    {
      seal: '광기',
      name: '일그러진 먹물의 심연',
      text: '매화검귀를 베어 넘겼으나, 그 자리에 아이는 없었다. 수없이 죽고 덧칠(부활)되기를 반복하며 화공의 몸은 이미 형체를 알 수 없는 거대한 흑묵의 괴물로 변해 있었다.'
    },
    {
      seal: '화공',
      name: '야차가 된 화공',
      text: '없어... 여기도 내 아이가 없어! 누가 감히 내 아이를 숨겼느냐! 이 화폭도 가짜다, 전부 부숴버리겠다... 전부 지워버리겠어!!'
    },
    {
      seal: '업보',
      name: '【 광기 엔딩 : 화폭의 새로운 악귀 】',
      text: '아이가 이미 죽었다는 진실(기억 잔편)을 온전히 마주하지 못한 화공은, 스스로가 아이의 안식처를 영원히 배회하며 파괴하는 화폭의 망령이 되고 말았다. (Tip: 스테이지의 모든 기억 잔편을 모으고 덧칠 횟수를 줄이면 진엔딩에 도달합니다.)'
    }
  ]
};

export const StorySystem = {
  queue: [],
  onComplete: null,

  init() {
    const storyBox = document.getElementById('story-box');
    storyBox?.addEventListener('click', () => this.next());
  },

  playScript(scriptKey, onCompleteCallback = null) {
    const script = STORY_SCRIPTS[scriptKey];
    if (!script || script.length === 0) {
      if (onCompleteCallback) onCompleteCallback();
      return;
    }

    this.queue = [...script];
    this.onComplete = onCompleteCallback;
    GameState.inDialogue = true;

    const storyBox = document.getElementById('story-box');
    storyBox?.classList.remove('hidden');
    this._renderCurrentLine();
  },

  next() {
    if (!GameState.inDialogue) return;
    SoundSystem.playSlash(1);
    this.queue.shift();

    if (this.queue.length === 0) {
      GameState.inDialogue = false;
      document.getElementById('story-box')?.classList.add('hidden');
      if (this.onComplete) {
        const cb = this.onComplete;
        this.onComplete = null;
        cb();
      }
    } else {
      this._renderCurrentLine();
    }
  },

  _renderCurrentLine() {
    const current = this.queue[0];
    if (!current) return;

    const sealEl = document.getElementById('speaker-seal');
    const nameEl = document.getElementById('speaker-name');
    const textEl = document.getElementById('dialogue-text');

    if (sealEl) sealEl.textContent = current.seal;
    if (nameEl) nameEl.textContent = current.name;
    if (textEl) textEl.textContent = current.text;
  }
};
