let current = null;

export function setScene(scene){
  current = scene;
}

export function updateScene(){
  if(current) current.update();
}

export function drawScene(ctx){
  if(current) current.draw(ctx);
}
