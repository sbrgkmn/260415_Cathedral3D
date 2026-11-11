import {prepareFaceTones,facetGray,hiddenClosureEdges} from './drawing-style.mjs?v=49';
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function drawingSVG(model,view='iso',weights={outline:2.4,inner:.8,triangles:.25},shade=.3,reference=model){
 const basis=view==='plan'?[[1,0,0],[0,-1,0],[0,0,1]]:view==='elevation'?[[1,0,0],[0,0,-1],[0,-1,0]]:[[Math.SQRT1_2,-Math.SQRT1_2,0],[1/Math.sqrt(6),1/Math.sqrt(6),-Math.sqrt(2/3)],[1,1,1]];
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),mesh=model.solid;
 const pts=mesh.vertices.map(v=>[dot(v,basis[0]),dot(v,basis[1]),dot(v,basis[2])]);
 const referencePoints=reference.solid.vertices.map(v=>[dot(v,basis[0]),dot(v,basis[1])]);
 const bounds=[0,1].map(i=>[Math.min(...referencePoints.map(p=>p[i])),Math.max(...referencePoints.map(p=>p[i]))]);
 const scale=Math.min(...bounds.map(([a,b])=>1440/(b-a||1)));
 const xy=pts.map(p=>p.slice(0,2).map((v,i)=>800+(v-(bounds[i][0]+bounds[i][1])/2)*scale));
 const fronts=mesh.faces.map(f=>{const [a,b,c]=f.map(i=>mesh.vertices[i]),u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);return dot([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],basis[2])>1e-9;});
 const edges=new Map();mesh.faces.forEach((f,j)=>f.forEach((a,i)=>{const k=key(a,f[(i+1)%3]);if(!edges.has(k))edges.set(k,[]);edges.get(k).push(fronts[j]);}));
 prepareFaceTones(mesh);const hidden=hiddenClosureEdges(mesh);
 const order=mesh.faces.map((f,i)=>({f,i,z:f.reduce((s,id)=>s+pts[id][2],0)})).filter(o=>fronts[o.i]).sort((a,b)=>a.z-b.z);
 const num=n=>n.toFixed(3),point=id=>xy[id].map(num).join(',');
 const faces=order.map(({f})=>{const gray=facetGray(mesh.vertices,f,shade),poly=`<polygon points="${f.map(point).join(' ')}" fill="rgb(${gray},${gray},${gray})" stroke="none"/>`;
 return poly+f.map((a,i)=>{const b=f[(i+1)%3];return hidden.has(key(a,b))?'':`<path d="M${point(a)} L${point(b)}" fill="none" stroke="black" stroke-width="${weights.triangles*2}"/>`;}).join('')+f.map((a,i)=>{const b=f[(i+1)%3],s=edges.get(key(a,b));return s.some(x=>!x)?`<path d="M${point(a)} L${point(b)}" fill="none" stroke="black" stroke-width="${weights.inner*2}"/>`:'';}).join('');}).join('');
 // A silhouette of the complete visible drawing distinguishes the outer edge from internal folds.
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600"><defs><g id="form" stroke-linejoin="round" stroke-linecap="round">${faces}</g><filter id="border" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="${weights.outline}" result="expanded"/><feFlood flood-color="black"/><feComposite in2="expanded" operator="in"/></filter></defs><rect width="1600" height="1600" fill="white"/><use href="#form" filter="url(#border)"/><use href="#form"/></svg>`;
}


export function drawingSheetSVG(model,weights,shade){
 const panels=['elevation','iso','plan'].map((view,i)=>drawingSVG(model,view,weights,shade)
  .replace('<svg ','<svg x="'+(i*1600)+'" y="0" ')
  .replaceAll('id="form"',`id="form-${view}"`).replaceAll('href="#form"',`href="#form-${view}"`)
  .replaceAll('id="border"',`id="border-${view}"`).replaceAll('url(#border)',`url(#border-${view})`)).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="4800" height="1600" viewBox="0 0 4800 1600">${panels}</svg>`;
}
