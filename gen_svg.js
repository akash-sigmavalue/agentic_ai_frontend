const cards = [
  {x: 735, y: 60},
  {x: 465, y: 180},
  {x: 1278, y: 164},
  {x: 1368, y: 322},
  {x: 1368, y: 479},
  {x: 1353, y: 645},
  {x: 495, y: 782},
  {x: 810, y: 790},
  {x: 1218, y: 790}
];
const center = {x: 750, y: 427};
const radius = 210;

cards.forEach((c, i) => {
  const dx = center.x - c.x;
  const dy = center.y - c.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const endDist = Math.max(0, dist - radius);
  
  const ex = c.x + (dx / dist) * endDist;
  const ey = c.y + (dy / dist) * endDist;
  
  const cx = c.x + dx * 0.4 + dy * 0.15;
  const cy = c.y + dy * 0.4 - dx * 0.15;
  
  console.log(`<path d="M${Math.round(c.x)} ${Math.round(c.y)} Q ${Math.round(cx)} ${Math.round(cy)} ${Math.round(ex)} ${Math.round(ey)}"/>`);
});
