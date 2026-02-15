let current = null;

export function setScene(scene){
  current = scene;
}

export function resizeScene(w,h){
  if(current && current.resize) current.resize(w,h);
}

export function updateScene(){
  if(current && current.update) current.update();
}

export function drawScene(ctx){
  if(current && current.draw) current.draw(ctx);
}
