export class Boss {
  constructor(x,y){
    this.x = x;
    this.y = y;

    this.w = 120;
    this.h = 120;

    this.hp = 300;
    this.alive = true;

    this.phase = 1;
    this.damage = 20;

    this.speed = 80;
  }

  update(dt, player){
    if(!this.alive) return;

    // 단순 이동 패턴
    if(player.x < this.x){
      this.x -= this.speed * dt;
    }else{
      this.x += this.speed * dt;
    }

    // 페이즈 변화
    if(this.hp < 150){
      this.phase = 2;
      this.speed = 140;
    }

    if(this.hp <= 0){
      this.alive = false;
    }
  }

  draw(ctx){
    if(!this.alive) return;

    ctx.fillStyle = this.phase === 1 ? "purple" : "red";
    ctx.fillRect(this.x,this.y,this.w,this.h);
  }

  takeDamage(dmg){
    this.hp -= dmg;
  }

  getHitbox(){
    return {
      x:this.x,
      y:this.y,
      w:this.w,
      h:this.h
    };
  }
}
