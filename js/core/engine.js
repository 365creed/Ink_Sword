import { Layers } from "../render/layers.js";
import { updateScene, drawScene } from "./state.js";

export class Engine {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 360;
    this.height = 640;

    this.resize();
    Layers.init(this.width, this.height, this.ctx);

    window.addEventListener("resize",()=>this.resize());
  }

  resize(){
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  start(){
    const loop = ()=>{
      this.ctx.clearRect(0,0,this.width,this.height);
      updateScene();
      drawScene(this.ctx);
      requestAnimationFrame(loop);
    };
    loop();
  }
}
