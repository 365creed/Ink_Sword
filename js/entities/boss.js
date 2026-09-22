export class Boss {
  constructor(ctx, x, y) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = 90;
    this.height = 130;
    this.hp = 300;
    this.isDead = false;
  }

  update(dt) {}
  render() {}
}
