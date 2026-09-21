export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.lastTime = 0;
    this.isRunning = false;
  }

  init() {
    console.log("게임 엔진 초기화 완료");
    // 초기 엔티티 및 시스템 바인딩 공간
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((time) => this.loop(time));
  }

  update(dt) {
    // 게임 로직 업데이트
  }

  render() {
    // 수묵화풍 배경 및 캔버스 클리어
    this.ctx.fillStyle = "#121212";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 초기 구동 확인용 수묵화풍 텍스트 안내 (추후 게임 그래픽으로 대체)
    this.ctx.fillStyle = "#666666";
    this.ctx.font = "20px 'Noto Serif KR', serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("수묵검객 (Ink Sword) 로딩 완료 - 게임 시작 대기 중", this.width / 2, this.height / 2);
  }
}
