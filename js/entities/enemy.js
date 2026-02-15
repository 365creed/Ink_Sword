export class Enemy {
  constructor(x,y){
    this.x = x;
    this.y = y;

    this.w = 40;
    this.h = 60;

    this.speed = 100;

    this.hp = 50;
    this.alive = true;

    this.damage = 10;
  }

  update(dt, player){
    if(!this.alive) return;

    // 플레이어 추적
    if(player.x < this.x){
      this.x -= this.speed * dt;
    }else{
      this.x += this.speed * dt;
    }

    if(this.hp <= 0){
      this.alive = false;
    }
  }

  draw(ctx){
    if(!this.alive) return;

    ctx.fillStyle = "gray";
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
