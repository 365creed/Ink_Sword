// stage.js
export class StageSystem {
  constructor(engine) {
    this.engine = engine;
    this.spawnTimer = 0;
  }

  update(dt) {
    this.spawnTimer += dt;
    // 4초마다 새로운 적 자동 출현
    if (this.spawnTimer > 4) {
      this.spawnTimer = 0;
      if (this.engine.enemies.length < 4) {
        const spawnX = Math.random() > 0.5 ? 1200 : 80;
        this.engine.enemies.push(new this.engine.EnemyClass(this.engine.ctx, spawnX, 535));
      }
    }
  }
}
