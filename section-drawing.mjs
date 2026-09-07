import { svgPath } from './section-grammar.mjs';
const line=(a,b,attributes='')=>`<line x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" ${attributes}/>`;
export function sectionSVG(frame,bounds,{id='section',mini=false,construction=false,lines=false,previous}={}) {
  const width=bounds.maxX-bounds.minX, h=bounds.maxY;
  const pad=mini?width*.05:width*.09;
  const box=[bounds.minX-pad,-h-h*.10,width+2*pad,h*1.21];
  const weight=h*(mini?.005:.0032), path=svgPath(frame.points);
  let markup=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img" aria-label="Step ${frame.index}: ${frame.kind==='S'?'triangle':frame.kind==='E'?'expansion':'contraction'}"><title>Section Machine — step ${frame.index}</title>`;
  markup+=line([bounds.minX-pad*.3,0],[bounds.maxX+pad*.3,0],`stroke="#c9cdc3" stroke-width="${weight*.8}"`);
  if(!mini) markup+=line([0,-h*.025],[0,h*1.045],`stroke="#d2d5cc" stroke-width="${weight*.65}" stroke-dasharray="${weight*5} ${weight*5}"`);
  markup+=`<path d="${path}" fill="${lines?'white':'#171916'}" stroke="#171916" stroke-width="${lines?weight:weight*.35}" stroke-linejoin="miter"/>`;
  if(construction && !mini) {
    markup+=`<defs><clipPath id="clip-${id}"><path d="${path}"/></clipPath><marker id="arrow-${id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse"><path d="M0 0L5 2.5L0 5" fill="none" stroke="${frame.kind==='E'?'#66836b':'#ba7657'}" stroke-width=".9"/></marker></defs>`;
    markup+=`<g clip-path="url(#clip-${id})" stroke="${lines?'#b1b8a9':'#bbc4b6'}" stroke-width="${weight*.7}">`;
    for(const segment of frame.construction) for(const sign of [-1,1]) markup+=line(...segment.map(([x,y])=>[x*sign,y]));
    markup+='</g>';
    if(previous) markup+=`<path d="${svgPath(previous.points)}" fill="none" stroke="#a9aea0" stroke-width="${weight*.85}" stroke-dasharray="${weight*4} ${weight*5}"/>`;
    const seen=new Set();
    for(const segment of frame.motions) for(const sign of [-1,1]) {
      const [a,b]=segment.map(([x,y])=>[x*sign,y]), key=[...a,...b].map(x=>x.toFixed(5)).join(',');
      if(seen.has(key)||Math.hypot(b[0]-a[0],b[1]-a[1])<h*.002)continue;
      seen.add(key);
      markup+=line(a,b,`stroke="${frame.kind==='E'?'#66836b':'#ba7657'}" stroke-width="${weight*1.2}" marker-end="url(#arrow-${id})"`);
    }
    for(const [x,y] of frame.points) markup+=`<circle cx="${x}" cy="${-y}" r="${weight*1.5}" fill="white" stroke="#555f50" stroke-width="${weight*.65}"/>`;
    const nave=frame.openings.find(o=>o.center===0);
    if(nave?.springing>0) {
      const radius=nave.half.at(-1)[0],height=nave.springing;
      markup+=line([-radius,height],[radius,height],`stroke="#8a9581" stroke-width="${weight*.65}" stroke-dasharray="${weight*4} ${weight*5}"`);
      markup+=`<text x="0" y="${-height-h*.018}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${h*.019}" letter-spacing="${h*.003}" fill="#718065">SPRINGING</text>`;
    }
  }
  if(!mini) {
    if(frame.openings.length) markup+=`<text x="0" y="${-h*.20}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${h*.021}" letter-spacing="${h*.007}" fill="#8a9181">NAVE</text>`;
    markup+=`<text x="0" y="${h*.070}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${h*.019}" letter-spacing="${h*.005}" fill="#969b8e">TRANSVERSE SECTION</text>`;
  }
  return markup+'</svg>';
}
