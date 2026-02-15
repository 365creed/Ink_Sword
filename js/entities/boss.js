import { Layers } from "../render/layers.js";
import { drawBrush } from "../render/brush.js";
import { bleedInk } from "../render/ink.js";
import { drawSkyline } from "../render/skyline.js";
import { setScene } from "../core/state.js";
import { PlayScene } from "./play.js";

const CHARS = [
  [{x:180,y:200},{x:180,y:300}],                // 一
  [{x:160,y:200},{x:200,y:200},{x:180,y:300}],  // 二
  [{x:160,y:220},{x:200,y:220},{x:160,y:300},{x:200,y:300}],
  [{x:150,y:200},{x:210,y:200},{x:180,y:260},{x:180,y:330}],
  [{x:160,y:220},{x:200,y:220},{x:160,y:300},{x:200,y:300},{x:180,y:350}]
];

export class IntroScene{
  constructor(){
    this.step = 0;
    this.timer = 0;
    Layers.clear();
  }

  update(){
    this.timer++;
    bleedInk(Layers.ink.getContext("2d"));

    if(this.timer === 10){
      drawBrush(Layers.ink.getContext("2d"), CHARS[this.step]);
    }

    if(this.timer > 90){
      this.step++;
      this.timer = 0;
      Layers.ink.getContext("2d").clearRect(0,0,360,640);
      if(this.step >= CHARS.length){
        setScene(new PlayScene());
      }
    }
  }

  draw(){
    drawSkyline(Layers.bg.getContext("2d"));
    Layers.compose();
  }
}
