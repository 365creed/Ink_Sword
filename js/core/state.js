// 문방사우 : 명묵(名墨) 데이터베이스 (무기 및 사슬 속성)
export const INK_TYPES = {
  black: {
    id: 'black',
    name: '현묵 (玄墨 - 기본 먹)',
    sealChar: '墨',
    color: '#141413',
    trailColor: 'rgba(20, 20, 19, 0.75)',
    atkMul: 1.0,
    speedMul: 1.0,
    chainCooldownMul: 1.0,
    desc: '가장 정통적인 묵빛. 검격 시 먹물 안개를 남겨 적의 시야와 이동을 둔화시킨다.'
  },
  vermilion: {
    id: 'vermilion',
    name: '주묵 (朱墨 - 붉은 인주 먹)',
    sealChar: '朱',
    color: '#c92a2a',
    trailColor: 'rgba(201, 42, 42, 0.8)',
    atkMul: 1.35,
    speedMul: 1.05,
    chainCooldownMul: 1.1,
    desc: '화염과 분노를 머금은 붉은 먹. 베어낸 자리에 타오르는 화염 먹물을 남겨 지속 피해를 준다.'
  },
  azure: {
    id: 'azure',
    name: '청묵 (靑墨 - 푸른 서리 먹)',
    sealChar: '靑',
    color: '#1c5d99',
    trailColor: 'rgba(28, 93, 153, 0.75)',
    atkMul: 0.9,
    speedMul: 1.25,
    chainCooldownMul: 0.65,
    desc: '바람과 서리를 품은 푸른 먹. 대시 속도와 묵사슬 회전력이 대폭 상승하며 적을 얼린다.'
  },
  gold: {
    id: 'gold',
    name: '금묵 (金墨 - 황금 비단 먹)',
    sealChar: '金',
    color: '#c59b27',
    trailColor: 'rgba(197, 155, 39, 0.85)',
    atkMul: 1.15,
    speedMul: 1.0,
    chainCooldownMul: 0.9,
    desc: '왕실의 화첩에 쓰이던 금빛 먹. 적의 공격 순간에 베기를 시전하면 완벽한 튕겨내기(패링)가 발동된다.'
  }
};

// 낙관(落款) 데이터베이스 (메가맨 제로의 칩/파츠 개념 - 최대 2개 장착)
export const SEALS_DATA = {
  slash_wave: {
    id: 'slash_wave',
    name: '파천(破天)의 낙관',
    desc: '차지 베기(발도술) 시 전방으로 화폭을 찢는 거대한 초승달 검기가 날아간다.',
    unlockedByDefault: true
  },
  chain_blade: {
    id: 'chain_blade',
    name: '유수(流水)의 낙관',
    desc: '묵사슬을 타고 날아가는 도중 부딪히는 모든 적을 자동으로 베어 넘긴다.',
    unlockedByDefault: true
  },
  blood_frenzy: {
    id: 'blood_frenzy',
    name: '혈귀(血鬼)의 낙관',
    desc: '혈묵(업보) 수치가 50% 이상일 때 공격 속도와 사슬 사거리가 30% 증가한다.',
    unlockedByDefault: false
  },
  void_step: {
    id: 'void_step',
    name: '허공답보(虛空踏步)의 낙관',
    desc: '공중 도약(점프) 횟수가 1회 추가되며, 여백의 금기 패널티 누적 속도가 절반으로 줄어든다.',
    unlockedByDefault: false
  },
  ink_shield: {
    id: 'ink_shield',
    name: '묵갑(墨甲)의 낙관',
    desc: '혈묵 100% 광폭화 상태에서 즉사 공격을 1회 방어하고 혈묵을 0%로 초기화한다.',
    unlockedByDefault: false
  },
  reaper_brush: {
    id: 'reaper_brush',
    name: '탈혼필(奪魂筆)의 낙관',
    desc: '적을 처치할 때마다 잃은 기력(HP)의 5%를 즉시 덧칠하여 회복한다.',
    unlockedByDefault: false
  }
};

// 고서화 잔편 (아이의 기억 조각 - 스토리 진엔딩 조건)
export const MEMORIES_DATA = [
  {
    id: 'mem_1',
    title: '첫 번째 잔편 : 매화나무 아래의 약속',
    text: '"아버지, 나 나비 그려주세요! 날개가 아주아주 큰 나비요!" 아이는 먹물이 코끝에 묻는 줄도 모르고 해맑게 웃었다.'
  },
  {
    id: 'mem_2',
    title: '두 번째 잔편 : 찢어진 화선지와 핏자국',
    text: '그날 밤, 화실을 덮친 것은 요괴가 아니었다. 역모의 누명을 씌운 관군들의 차가운 칼날이었다.'
  },
  {
    id: 'mem_3',
    title: '세 번째 잔편 : 마지막 붓질',
    text: '점점 식어가는 아이의 작은 손을 잡고, 나는 피 섞인 먹물로 화폭에 아이의 영혼을 그려 넣었다. 깨어나지 못할 꿈속에라도 살게 하려고.'
  },
  {
    id: 'mem_4',
    title: '마지막 잔편 : 화폭의 주인',
    text: '아이의 안식처를 부수고 있던 침입자는 다른 누구도 아닌, 아이의 죽음을 부정하며 미쳐버린 나 자신이었다.'
  }
];

// 화폭의 금기(수묵화 세계 규칙) 프리셋
export const PAINTING_RULES = {
  VOID_EROSION: {
    id: 'VOID_EROSION',
    title: '여백(餘白)의 금기',
    desc: '먹물이 칠해진 발판에서 떨어져 백지(공중)에 2.5초 이상 머물면 존재가 지워져 기력이 깎인다.',
    maxPenaltyTime: 2.5
  },
  STILLNESS_CURSE: {
    id: 'STILLNESS_CURSE',
    title: '정중동(靜中動)의 금기',
    desc: '그림 속에서 1.5초 이상 멈춰 있으면 몸이 배경의 수묵화로 굳어버려 지속 피해를 입는다.',
    maxPenaltyTime: 1.5
  },
  BLOOD_TAX: {
    id: 'BLOOD_TAX',
    title: '살생(殺生)의 금기',
    desc: '검을 휘두를 때마다 혈묵이 급격히 차오르지만, 5초간 적을 베지 못하면 자신의 피가 마른다.',
    maxPenaltyTime: 5.0
  }
};

// 초기 기본 세이브 데이터 생성 팩토리
export function createDefaultSaveData(slotIndex = 0) {
  return {
    slotIndex,
    updatedAt: new Date().toLocaleString('ko-KR'),
    chapter: 1,
    stage: 1,
    deathCount: 0, // 덧칠(부활) 횟수 - 높을수록 캐릭터 외형이 먹물 괴물로 변함
    karma: 0,      // 혈묵 수치 (0 ~ 100)
    equippedInk: 'black',
    unlockedInks: ['black', 'vermilion', 'azure', 'gold'], // 테스트 및 즉시 체험을 위해 4대 명묵 기본 해금
    equippedSeals: ['slash_wave', 'chain_blade'],
    unlockedSeals: ['slash_wave', 'chain_blade', 'blood_frenzy', 'void_step', 'ink_shield', 'reaper_brush'],
    collectedMemories: ['mem_1'], // 1번 기억 기본 보유
    clearedStages: []
  };
}

// 런타임 전역 상태 객체
export const GameState = {
  currentUser: null, // 현재 로그인한 호패(ID), null이면 'guest'
  activeSlot: 0,
  saveData: createDefaultSaveData(0),

  // 인게임 실시간 상태
  isRunning: false,
  isPaused: false,
  inDialogue: false,
  timeScale: 1.0,   // 산나비식 슬로우 모션(불릿 타임) 제어용
  hitStopTimer: 0,  // 타격감(히트스톱) 제어용

  playerStats: {
    hp: 100,
    maxHp: 100,
    karma: 0,       // 0 ~ 100% (100% 도달 시 광폭화: 공격력 2배, 피격 시 즉사)
    isBerserk: false,
    rulePenaltyRatio: 0 // 현재 화폭의 금기 위반 게이지 (0.0 ~ 1.0)
  },

  currentRule: PAINTING_RULES.VOID_EROSION,

  // 장착 아이템 효과 계산 헬퍼
  getActiveInk() {
    return INK_TYPES[this.saveData.equippedInk] || INK_TYPES.black;
  },

  hasSeal(sealId) {
    return this.saveData.equippedSeals.includes(sealId);
  },

  addKarma(amount) {
    this.playerStats.karma = Math.min(100, Math.max(0, this.playerStats.karma + amount));
    this.playerStats.isBerserk = this.playerStats.karma >= 100;
    this.saveData.karma = this.playerStats.karma;
  },

  recordDeathAndRepaint() {
    this.saveData.deathCount += 1;
    this.playerStats.hp = this.playerStats.maxHp;
    this.playerStats.karma = 0;
    this.playerStats.isBerserk = false;
    this.playerStats.rulePenaltyRatio = 0;
  }
};
