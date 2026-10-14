import { PAINTING_RULES } from '../core/state.js';

export const STAGE_DATA = {
  1: {
    id: 1,
    chapterTitle: '제 1 화폭 : 찢어진 산수화(山水畫)',
    subtitle: '화주의 계율 — 여백(餘白)의 금기',
    rule: PAINTING_RULES.VOID_EROSION,
    introScript: 'STAGE_1_INTRO',
    playerSpawn: { x: 120, y: 520 },
    goalPortal: { x: 2850, y: 340 },

    // 먹물로 그려진 발판 및 벽 (x, y, w, h)
    platforms: [
      { x: 0, y: 600, w: 750, h: 140 },
      { x: 860, y: 540, w: 320, h: 180 },
      { x: 1320, y: 460, w: 280, h: 260 },
      // 메가맨식 수직 벽차기 협곡 구간
      { x: 1720, y: 220, w: 45, h: 480 },
      { x: 1920, y: 180, w: 45, h: 420 },
      { x: 1920, y: 520, w: 420, h: 200 },
      // 산나비식 허공 사슬 파쿠르 구간
      { x: 2680, y: 400, w: 360, h: 320 }
    ],

    // 산나비 스타일 묵사슬 고리 포인트 (천장/허공의 먹물 고리)
    grapplePoints: [
      { x: 780, y: 300 },
      { x: 1240, y: 240 },
      { x: 1650, y: 190 },
      { x: 2420, y: 210 },
      { x: 2600, y: 190 }
    ],

    // 파괴 가능한 화폭 기물 (석등, 정자 기둥 - 파괴 시 혈묵 상승 및 체력 회복 먹물 드랍)
    props: [
      { x: 420, y: 560, type: 'LANTERN' },
      { x: 1020, y: 500, type: 'PAVILION_PILLAR' },
      { x: 2100, y: 480, type: 'LANTERN' }
    ],

    // 숨겨진 아이의 기억 조각
    memoryItem: {
      id: 'mem_2',
      x: 1820,
      y: 150
    },

    enemies: [
      { x: 520, y: 550, type: 'INK_GHOST' },
      { x: 980, y: 480, type: 'ARCHER' },
      { x: 1450, y: 400, type: 'INK_GHOST' },
      { x: 2080, y: 460, type: 'WARDEN' },
      { x: 2220, y: 460, type: 'ARCHER' }
    ],

    boss: null
  },

  2: {
    id: 2,
    chapterTitle: '제 2 화폭 : 피에 젖은 대나무 숲(竹林)',
    subtitle: '화주의 계율 — 정중동(靜中動)의 금기',
    rule: PAINTING_RULES.STILLNESS_CURSE,
    introScript: 'STAGE_2_INTRO',
    playerSpawn: { x: 100, y: 500 },
    goalPortal: { x: 3100, y: 380 },

    platforms: [
      { x: 0, y: 580, w: 520, h: 140 },
      { x: 720, y: 520, w: 260, h: 200 },
      { x: 1200, y: 470, w: 260, h: 250 },
      { x: 1700, y: 540, w: 380, h: 180 },
      { x: 2250, y: 420, w: 240, h: 300 },
      { x: 2820, y: 440, w: 420, h: 280 }
    ],

    grapplePoints: [
      { x: 600, y: 260 },
      { x: 1080, y: 220 },
      { x: 1560, y: 250 },
      { x: 2140, y: 200 },
      { x: 2650, y: 210 }
    ],

    props: [
      { x: 350, y: 540, type: 'PAVILION_PILLAR' },
      { x: 1320, y: 430, type: 'LANTERN' },
      { x: 1880, y: 500, type: 'PAVILION_PILLAR' },
      { x: 2350, y: 380, type: 'LANTERN' }
    ],

    memoryItem: {
      id: 'mem_3',
      x: 2140,
      y: 120
    },

    enemies: [
      { x: 420, y: 520, type: 'INK_GHOST' },
      { x: 850, y: 460, type: 'ARCHER' },
      { x: 1340, y: 410, type: 'WARDEN' },
      { x: 1820, y: 480, type: 'INK_GHOST' },
      { x: 1960, y: 480, type: 'ARCHER' },
      { x: 2380, y: 360, type: 'WARDEN' },
      { x: 2920, y: 380, type: 'INK_GHOST' }
    ],

    boss: null
  },

  3: {
    id: 3,
    chapterTitle: '제 3 화폭 : 매화검귀의 정자(梅花亭)',
    subtitle: '화주의 계율 — 살생(殺生)의 금기',
    rule: PAINTING_RULES.BLOOD_TAX,
    introScript: 'STAGE_3_BOSS_INTRO',
    playerSpawn: { x: 180, y: 520 },
    goalPortal: null, // 보스 처치 시 엔딩 진입

    platforms: [
      // 보스 아레나 및 양측 벽점프 기둥
      { x: 0, y: 600, w: 1500, h: 140 },
      { x: 0, y: 120, w: 50, h: 480 },
      { x: 1450, y: 120, w: 50, h: 480 },
      { x: 280, y: 430, w: 180, h: 24, oneWay: true },
      { x: 1040, y: 430, w: 180, h: 24, oneWay: true }
    ],

    // 보스전 공중 기동용 상단 묵사슬 고리 3개
    grapplePoints: [
      { x: 370, y: 200 },
      { x: 750, y: 160 },
      { x: 1130, y: 200 }
    ],

    props: [
      { x: 360, y: 560, type: 'LANTERN' },
      { x: 1140, y: 560, type: 'LANTERN' }
    ],

    memoryItem: {
      id: 'mem_4',
      x: 750,
      y: 95
    },

    enemies: [],

    boss: {
      x: 1120,
      y: 520,
      name: '사군자 제1화신 : 매화검귀(梅花劍鬼)',
      maxHp: 680
    }
  }
};
