export function drawSkyline(ctx){
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;

  const b = [
    [20,420,50,200],
    [90,380,60,240],
    [170,410,45,210],
    [230,360,70,260],
    [310,400,40,220]
  ];

  b.forEach(v=>ctx.strokeRect(...v));
  ctx.globalAlpha = 1;
}
