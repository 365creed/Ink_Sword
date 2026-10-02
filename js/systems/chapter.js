// js/systems/chapter.js
const ChapterSystem = {
  transitionTimer: 0,
  isActive: false,
  nextChapter: 1,

  startTransition(chapterNum) {
    this.nextChapter = chapterNum;
    this.isActive = true;
    this.transitionTimer = 3.0;
    GameState.state = 'CHAPTER_TRANSITION';
  },

  skip() {
    if (this.isActive) {
      this.isActive = false;
      this.transitionTimer = 0;
      stageManager.initStage(this.nextChapter, 1);
    }
  },

  update(dt) {
    if (!this.isActive) return;

    this.transitionTimer -= dt;
    if (this.transitionTimer <= 0) {
      this.skip();
    }
  },

  render(ctx) {
    if (!this.isActive) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.save();
    ctx.fillStyle = '#0f0f11';
    ctx.fillRect(0, 0, W, H);

    const chapterNames = {
      1: { hanja: '江西', name: '제 1 막 — 강서 (나루터와 갈대숲)' },
      2: { hanja: '江北', name: '제 2 막 — 강북 (도성 관문과 성벽)' },
      3: { hanja: '江東', name: '제 3 막 — 강동 (수문과 뇌우)' },
      4: { hanja: '江南', name: '제 4 막 — 강남 (불탄 저잣거리)' },
      5: { hanja: '漢陽宮', name: '제 5 막 — 한양궁 (침식된 근정전)' }
    };

    const cur = chapterNames[this.nextChapter] || chapterNames[1];

    ctx.fillStyle = '#eae6dd';
    ctx.font = 'bold 64px "Batang", serif';
    ctx.textAlign = 'center';
    ctx.fillText(cur.hanja, W / 2, H * 0.42);

    ctx.font = '18px "Batang", serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(cur.name, W / 2, H * 0.55);

    ctx.font = '12px "Batang", serif';
    ctx.fillStyle = '#8b1e1e';
    ctx.fillText('[ Space / Enter / 터치 : 건너뛰기 ]', W / 2, H * 0.82);

    ctx.restore();
  }
};
