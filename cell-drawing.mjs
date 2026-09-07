import {svgPath} from './cell-grammar.mjs';
export function sectionSVG(frame,bounds,{mini=false,construction=false,lines=false,cells=false,previous,id='cells'}={}){
  const w=bounds.maxX-bounds.minX,h=bounds.maxY,pad=w*(mini?.05:.09),weight=h*(mini?.004:.0023);
  const box=[bounds.minX-pad,-h*1.08,w+pad*2,h*1.20];
  const line=([a,b],attrs='')=>`<line x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" ${attrs}/>`;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img" aria-label="Step ${frame.index}: ${frame.cells.length} material cells, ${frame.openingCount} voids"><title>Recursive material cells — step ${frame.index}</title>`;
  s+=line([[bounds.minX,0],[bounds.maxX,0]],`stroke="#c9cdc3" stroke-width="${weight}"`);
  s+=`<path d="${svgPath(frame.points)}" fill="${lines?'white':'#222721'}" stroke="#222721" stroke-width="${weight*.5}"/>`;
  if(cells){
    for(const cell of frame.cells){const level=cell.generation,tone=(cell.id.match(/L/g)||[]).length;const fill=['#d8e0cf','#b3c4a6','#809e83','#b8bc9e','#d3c8af'][(level+tone)%5];
      s+=`<path d="${svgPath(cell.points)}" fill="${fill}" stroke="#53604e" stroke-width="${weight*.8}"><title>Cell ${cell.id}; parent ${cell.parent??'none'}; generation ${level}</title></path>`;
    }
  }
  if(construction&&!mini){
    if(previous)s+=`<path d="${svgPath(previous.points)}" fill="none" stroke="#aab19f" stroke-width="${weight*.8}" stroke-dasharray="${weight*4} ${weight*4}"/>`;
    s+=`<defs><marker id="arrow-${id}" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5" fill="none" stroke="${frame.kind==='E'?'#658970':'#bd795a'}" stroke-width=".8"/></marker></defs>`;
    for(const motion of frame.motions)if(Math.hypot(motion[0][0]-motion[1][0],motion[0][1]-motion[1][1])>h*.006)s+=line(motion,`stroke="${frame.kind==='E'?'#658970':'#bd795a'}" stroke-width="${weight*1.1}" marker-end="url(#arrow-${id})"`);
    for(const p of frame.points)s+=`<circle cx="${p[0]}" cy="${-p[1]}" r="${weight*1.2}" fill="white" stroke="#67755d" stroke-width="${weight*.7}"/>`;
  }
  if((cells||construction)&&!mini)for(const seam of frame.seams)s+=line(seam,`stroke="${cells?'#4d6246':'#bac8ad'}" stroke-width="${weight*.8}" stroke-dasharray="${weight*3} ${weight*3}"`);
  if(!mini){s+=line([[0,0],[0,h*1.04]],`stroke="#9ca78f" stroke-width="${weight*.6}" stroke-dasharray="${weight*4} ${weight*4}"`);s+=`<text x="0" y="${h*.065}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${h*.021}" letter-spacing="${h*.004}" fill="#899180">${cells?'SHARED JUNCTIONS · PARENT / CHILD CELLS':'MATERIAL / VOID · ONE RECURSIVE GRAMMAR'}</text>`;}
  return s+'</svg>';
}
