export class Player {
  constructor(x,y){
    this.x = x;
    this.y = y;

    this.w = 40;
    this.h = 60;

    this.speed = 220;

    this.hp = 100;
    this.alive = true;

    this.attackCooldown = 0;
    this.attackRange = 60;
    this.damage = 25;

    this.keys = {};

    window.addEventListener("keydown",(e)=>this.keys[e.key]=true);
    window.addEventListener("keyup",(e)=>this.keys[e.key]=false);
  }

  update(dt){
    if(!this.alive) return;

    // 이동
    if(this.keys["ArrowRight"]) this.x += this.speed * dt;
    if(this.keys["ArrowLeft"]) this.x -= this.speed * dt;

    // 공격 쿨
    if(this.attackCooldown > 0){
      this.attackCooldown -= dt;
    }

    // 공격
    if(this.keys[" "] && this.attackCooldown <= 0){
      this.attackCooldown = 0.5;
      this.isAttacking = true;
      setTimeout(()=> this.isAttacking=false, 150);
    }

    if(this.hp <= 0){
      this.alive = false;
    }
  }

  draw(ctx){
    ctx.fillStyle = "white";
    ctx.fillRect(this.x,this.y,this.w,this.h);

    if(this.isAttacking){
      ctx.fillStyle = "red";
      ctx.fillRect(
        this.x + this.w,
        this.y + 10,
        this.attackRange,
        10
      );
    }
  }

  takeDamage(dmg){
    this.hp -= dmg;
    if(this.hp <= 0){
      this.hp = 0;
      this.alive = false;
    }
  }

  getAttackHitbox(){
    if(!this.isAttacking) return null;

    return {
      x: this.x + this.w,
      y: this.y + 10,
      w: this.attackRange,
      h: 10
    };
  }
}
