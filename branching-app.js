import {facetGray,prepareFaceTones,silhouetteClasses} from './drawing-style.mjs?v=31';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {variationRecipes} from './branching-variations.mjs';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildBranching,MOUNTAIN_DEFAULTS,RANGE_DEFAULTS} from './branching.mjs?v=31';
const DEFAULTS={...MOUNTAIN_DEFAULTS,nave:1,packing:.6,tipNose:.6,marginSteps:1,balanceMode:1,baseRiseRatio:.3};
import {encodeBinarySTL} from './polarity.mjs';
const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
const lineWeights={outline:2.4,inner:.8,triangles:.3,ridges:1.2};
let shadeStrength=.45,softShadows=true;
try{const saved=JSON.parse(localStorage.getItem('cathedral-shading')||'null');if(saved){shadeStrength=Math.max(0,Math.min(1,Number(saved.strength)||0));softShadows=saved.shadows!==false;}}catch{}
try{const saved=JSON.parse(localStorage.getItem('cathedral-lineweights')||'{}');for(const key of Object.keys(lineWeights))if(Number.isFinite(saved[key])&&saved[key]>=0)lineWeights[key]=saved[key];}catch{}
let draft={...DEFAULTS,...Object.fromEntries(query)},parameterError=null,model;
try{model=buildBranching(draft);draft={...model.parameters};}catch(e){parameterError=e.message;model=buildBranching();}
let stage=query.has('stage')?Math.max(0,Math.min(3,Number(query.get('stage'))||0)):3,view='iso';
const percentages=new Set(['falloff','lengthRatio','valley','spurRatio','descent','angleRatio','spacingRatio','growthLength','growthAngle','widthFill','spineWidth','projectionWidth','verticalLift','branchTaper','branchReach','tipNose','marginSize','baseRiseRatio']);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));$('viewport').append(renderer.domElement);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-150,150,150,-150,.1,3000);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.9;
const ambient=new THREE.AmbientLight(0xffffff,1);scene.add(ambient);const sun=new THREE.DirectionalLight(0xffffff,.5);sun.position.set(-140,-90,250);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.00015;scene.add(sun);scene.add(sun.target);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShadowMaterial({color:0x000000,opacity:.18}));ground.receiveShadow=true;ground.position.z=-.05;scene.add(ground);
const drawingCache=new WeakMap();function drawingFor(mesh){if(!drawingCache.has(mesh))drawingCache.set(mesh,silhouetteClasses(mesh));return drawingCache.get(mesh);}
const content=new THREE.Group();scene.add(content);
const grid=new THREE.GridHelper(500,25,0xc8cfc1,0xdde1d6);grid.rotation.x=Math.PI/2;grid.position.z=-.2;grid.material.transparent=true;grid.material.opacity=.42;scene.add(grid);grid.visible=false;scene.background=new THREE.Color(0xffffff);
const titles=['A symmetric branching tree','Lift every junction','Connect peaks with folded roofs','Close the branching volume'];
const descriptions=['One rooted tree supplies every roof branch. No radial fan or initial surface subdivision.','Junction heights follow the child height ratio. Above 100%, descendants rise outward.','The valley ratio places intermediate ridge nodes; triangular slopes connect the tree to the eaves.','The same roof receives perimeter walls and a closed base. One connected solid.'];
function dispose(){content.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});content.clear();}
function weightedLines(points,weight,color=0x000000,opacity=1,depthTest=true){if(!points.length||lineWeights[weight]===0)return;const geometry=new LineSegmentsGeometry();geometry.setPositions(points);const material=new LineMaterial({color,linewidth:lineWeights[weight],transparent:opacity<1,opacity,depthTest});material.resolution.set($('viewport').clientWidth,$('viewport').clientHeight);const line=new LineSegments2(geometry,material);content.add(line);}
function lines(vertices,edges,color,opacity=1){weightedLines(edges.flatMap(e=>e.flatMap(i=>vertices[i])),'ridges',color,opacity,false);}
function dots(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));content.add(new THREE.Points(g,new THREE.PointsMaterial({color:0x000000,size:6,sizeAttenuation:false,depthTest:false})));}
function draw(){
 $('growth-readout').textContent=`Growth step ${model.parameters.growth}   ${model.nodes.length} peaks`;$('grow-back').disabled=model.parameters.growth===0;$('grow-next').disabled=model.parameters.growth>=5;
 ambient.intensity=Math.PI*.72;sun.intensity=Math.PI*.55;sun.castShadow=softShadows;ground.visible=softShadows&&stage>=2;ground.material.opacity=.16;
 const bounds=new THREE.Box3().setFromPoints(model.solid.vertices.map(v=>new THREE.Vector3(...v))),center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(bounds.getSize(new THREE.Vector3()).length(),10);
 ground.position.set(center.x,center.y,-.05);ground.scale.set(radius*4,radius*4,1);sun.position.copy(center).add(new THREE.Vector3(radius,-radius*.8,radius*.9));sun.target.position.copy(center);Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,near:.1,far:radius*5});sun.shadow.normalBias=radius*.0002;sun.shadow.camera.updateProjectionMatrix();
 dispose();const p=model.parameters,nodes=model.nodes.map(n=>stage===0?[n.point[0],n.point[1],.1]:n.point);
 if(stage>=2){const mesh=stage===2?model.roof:model.solid,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(mesh.vertices.flat(),3));g.setIndex(mesh.faces.flat());g.computeVertexNormals();prepareFaceTones(mesh);const faceGeometry=g.toNonIndexed(),colors=[];for(const f of mesh.faces){const gray=facetGray(mesh.vertices,f,shadeStrength)/255,color=new THREE.Color(gray,gray,gray).convertSRGBToLinear();for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);}faceGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const surface=new THREE.Mesh(faceGeometry,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));surface.castShadow=true;surface.receiveShadow=true;content.add(surface);
  if($('facets').checked){const wire=new THREE.WireframeGeometry(g);weightedLines(wire.attributes.position.array,'triangles');wire.dispose();}g.dispose();
 }
 if(stage>=2&&view==='iso'){const mesh=stage===2?model.roof:model.solid,classes=drawingFor(mesh);for(const weight of ['outline','inner'])weightedLines([...classes.values()].filter(e=>e.weight===weight).flatMap(e=>[...mesh.vertices[e.a],...mesh.vertices[e.b]]),weight);}
 if(stage<2||$('ridges').checked){if(stage>=2)lines(model.roof.vertices,model.roof.ridges,0x000000,.8);else lines(nodes,model.edges,0x000000);dots(nodes);}
 if(stage===1){const v=nodes.flatMap(n=>[[n[0],n[1],0],n]);lines(v,nodes.map((_,i)=>[2*i,2*i+1]),0x879680,.35);}
 $('title').textContent=titles[stage];$('description').textContent=descriptions[stage];
 $('ec-progress').textContent=`Vertical E/C: ${model.refinement.depth} cycles, ${model.refinement.expansions} shoulders + ${model.refinement.contractions} notches / margin: ${model.margins.lobes} lobes`;$('ec-back').disabled=model.parameters.verticalSteps===0;
 $('status').textContent=stage===3?`Closed solid    ${model.integrity.faces} triangles    1 body`:stage===2?`${model.roof.faces.length} roof triangles    open below`:`${model.nodes.length} peaks    ${model.edges.length} branches`;
 $('viewport').setAttribute('aria-label',`${titles[stage]}. ${$('description').textContent}`);
 document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stage)===stage)));
 const q=new URLSearchParams();for(const [k,v] of Object.entries(draft))if(k in DEFAULTS&&Number(v)!==DEFAULTS[k])q.set(k,v);q.set('stage',stage);history.replaceState(null,'',`${location.pathname}?${q}`);
 plan();
 $('error').hidden=!parameterError;$('error').textContent=parameterError?`Parameters cannot form this volume: ${parameterError} Showing the last valid form.`:'';
 $('export').disabled=Boolean(parameterError);
 if(parameterError)$('status').textContent='Invalid parameters    last valid form shown';
 const heights=[...new Set(model.nodes.filter(n=>n.kind!=='station'&&n.kind!=='spur').map(n=>n.generation))].sort((a,b)=>a-b).map(g=>`${g===0?'Root':'G'+g}: ${model.nodes.find(n=>n.generation===g).point[2].toFixed(1)}`);
 $('peak-heights').textContent=heights.join('    ');
}
function plan(){const nodes=model.nodes.map(n=>n.point),all=model.boundary.map(i=>model.roof.vertices[i]);const minX=Math.min(...all.map(v=>v[0]))-8,minY=Math.min(...all.map(v=>v[1]))-8,w=Math.max(...all.map(v=>v[0]))-minX+8,h=Math.max(...all.map(v=>v[1]))-minY+8;const path=all.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' ')+' Z';$('plan').setAttribute('viewBox',`${minX} ${minY} ${w} ${h}`);$('plan').innerHTML=`<path d="${path}" fill="#e4e9df" stroke="#b6c2ae" stroke-width=".7"/>`+model.edges.map(([a,b])=>`<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="#527566" stroke-width="1.1"/>`).join('')+nodes.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="2" fill="${i===0?'#a76543':'#527566'}"><title>Peak ${i}: height ${nodes[i][2].toFixed(1)}</title></circle>`).join('');$('width-note').textContent=`Branch widths ${model.widthRange[0].toFixed(1)}   ${model.widthRange[1].toFixed(1)}    requested ${model.parameters.branchWidth}`;}
function fit(){const w=$('viewport').clientWidth,h=$('viewport').clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);content.traverse(o=>{if(o.material?.isLineMaterial)o.material.resolution.set(w,h);});const box=new THREE.Box3().setFromPoints(model.solid.vertices.map(v=>new THREE.Vector3(...v))),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const dir=view==='plan'?new THREE.Vector3(0,0,1):view==='front'?new THREE.Vector3(0,1,0):view==='iso'?new THREE.Vector3(1,1,1).normalize():new THREE.Vector3(1.1,1.7,1.1).normalize();camera.up.set(0,view==='plan'?-1:0,view==='plan'?0:1);const distance=Math.max(size.length()*3,600);camera.far=distance*4;camera.position.copy(center).addScaledVector(dir,distance);camera.lookAt(center);controls.target.copy(center);controls.enableRotate=view==='axon';const half=Math.max(size.z*.68,size.y*.68,size.x/(w/h)*.68,40);camera.top=half;camera.bottom=-half;camera.left=-half*w/h;camera.right=half*w/h;camera.zoom=1;camera.updateProjectionMatrix();controls.update();}
function sync(){
 $('nave-mode').checked=Boolean(draft.nave);
 if($('balance-lr'))for(const [id,key] of [['lr','leftRight'],['fb','frontBack']]){$('balance-'+id).value=draft[key];$('balance-'+id+'-value').textContent=Number(draft[key]).toFixed(2);}
 if($('morphology')){$('morphology').value=String(draft.morphology);$('proportion-lock').checked=Boolean(draft.proportionLock);const values={density:Math.round((32-draft.spacing)/.23),spread:Math.round((draft.angle-60)/1.1),mass:draft.branchWidth,slender:draft.height,cascade:Math.round(draft.falloff*100),relief:draft.verticalSteps};for(const [key,value] of Object.entries(values)){const el=$('axis-'+key);if(document.activeElement!==el)el.value=value;$('axis-'+key+'-value').textContent=value;}}
 
 document.querySelectorAll('[data-param]').forEach(el=>{
  const k=el.dataset.param,v=Number(draft[k]);if(!Number.isFinite(v))return;
  if(v<Number(el.min))el.min=String(v-Math.max(Math.abs(v)*.2,1));
  if(v>Number(el.max))el.max=String(v+Math.max(Math.abs(v)*.2,1));
  el.value=v;
  $(k+'-value').textContent=['angle','spurAngle','forkIncrement','sideIncrement'].includes(k)?`${Number(v.toFixed(2))}  `:percentages.has(k)?`${Number((v*100).toFixed(2))}%`:Number(v.toFixed(2));
  const number=$(k+'-number');if(document.activeElement!==number)number.value=Number((percentages.has(k)?v*100:v).toFixed(8));
 });
}
const worker=new Worker('./branching-worker.js?v=31',{type:'module'}),pending=new Map();let job=0,revision=0,buildTimer;
worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.model);};
worker.onerror=()=>{for(const task of pending.values())task.reject(Error('Geometry worker could not load. Reload the page.'));pending.clear();};
function compute(parameters){return new Promise((resolve,reject)=>{const id=++job;pending.set(id,{resolve,reject});worker.postMessage({id,parameters});});}
function rebuild(input,{refit=false}={}){
 draft={...input};const current=++revision;clearTimeout(buildTimer);sync();$('status').textContent='Updating geometry ';
 buildTimer=setTimeout(async()=>{try{const next=await compute(input);if(current!==revision)return;model=next;draft={...next.parameters};parameterError=null;}catch(e){if(current!==revision)return;parameterError=e.message;}
 sync();draw();if(refit&&!parameterError)fit();invalidate();},100);
}
const aside=document.querySelector('aside'),advanced=document.createElement('details');advanced.id='advanced';advanced.innerHTML='<summary>Advanced parameters</summary>';
for(const el of [...aside.children])if(el.tagName==='FIELDSET'||el.classList.contains('rule-note')||el.id==='width-note')advanced.append(el);
aside.append(advanced);
for(const paragraph of [...aside.querySelectorAll(':scope > p')].slice(1))paragraph.remove();
const primary=document.createElement('section');primary.className='primary-controls';
primary.innerHTML='<h3>Form controls</h3><label>Morphology <select id="morphology"><option value="0">Bilateral fan</option><option value="1">Axial ridge</option><option value="2">Cruciform</option><option value="3">Six-arm crown</option></select></label><p>Six design axes coordinate the detailed rules. Advanced values remain available below.</p>';
const axes=[['density','Branch density',0,100,45],['spread','Branch spread',0,100,50],['mass','Spine mass',4,80,28],['slender','Vertical proportion',50,300,125],['cascade','Peak cascade',20,90,62],['relief','Vertical E/C detail',0,4,2]];
for(const [key,label,min,max,value] of axes)primary.insertAdjacentHTML('beforeend',`<label class="control" for="axis-${key}">${label}<output id="axis-${key}-value">${value}</output></label><input id="axis-${key}" type="range" min="${min}" max="${max}" value="${value}" step="1">`);
primary.insertAdjacentHTML('beforeend','<label><input id="proportion-lock" type="checkbox" checked> Preserve vertical proportions when thickening</label><p>Compact spacing is built into these controls. Side branches taper to 50% width and 65% clear length when changing density.</p>');
aside.insertBefore(primary,advanced);
const balances=document.createElement('div');balances.innerHTML='<label class="control" for="balance-lr">Left / right <output id="balance-lr-value"></output></label><input id="balance-lr" type="range" min="0.1" max="0.9" step="0.01"><label class="control" for="balance-fb">Front / back <output id="balance-fb-value"></output></label><input id="balance-fb" type="range" min="0.1" max="0.9" step="0.01"><small>0.50 = symmetric</small>';primary.insertBefore(balances,primary.children[2]);
for(const [id,key] of [['lr','leftRight'],['fb','frontBack']])$('balance-'+id).oninput=e=>rebuild({...draft,[key]:Number(e.target.value),balanceMode:1},{refit:true});
const marginControls=$('marginSteps').closest('fieldset');marginControls.querySelector('legend').textContent='Marginal growth';aside.insertBefore(marginControls,advanced);
$('morphology').value=String(draft.morphology);$('proportion-lock').checked=Boolean(draft.proportionLock);
$('morphology').onchange=()=>rebuild({...draft,morphology:Number($('morphology').value)},{refit:true});
$('proportion-lock').onchange=()=>rebuild({...draft,proportionLock:$('proportion-lock').checked?1:0},{refit:true});
for(const [key] of axes)$('axis-'+key).oninput=e=>{const v=Number(e.target.value);$('axis-'+key+'-value').textContent=v;const patch=key==='density'?{spacing:32-v*.23,growth:v<20?0:v<65?1:2,packing:.55,branchTaper:.5,branchReach:.65}:key==='spread'?{angle:60+v*1.1,spurAngle:35+v*.5,growthAngle:.8,sideIncrement:v*.15}:key==='mass'?{branchWidth:v}:key==='slender'?{height:v}:key==='cascade'?{falloff:v/100,descent:v/100}:{verticalSteps:v,verticalLift:.3,minArea:10};rebuild({...draft,...patch},{refit:true});};
document.querySelectorAll('[data-param]').forEach(el=>el.addEventListener('input',()=>rebuild({...draft,[el.dataset.param]:Number(el.value)})));
document.querySelectorAll('[data-param]').forEach(el=>{
 const extend=()=>{const v=Number(el.value),lo=Number(el.min),hi=Number(el.max),span=Math.max(hi-lo,1e-6);if(v>=hi-1e-8)el.max=String(hi+span*.5);if(v<=lo+1e-8)el.min=String(el.dataset.param==='levels'?Math.max(1,Math.floor(lo/2)):lo>0?lo/2:lo-span*.5);};
 for(const event of ['change','pointerup','keyup'])el.addEventListener(event,extend);
});
document.querySelectorAll('[data-number]').forEach(el=>el.addEventListener('input',()=>{if(el.value==='')return;const value=Number(el.value);if(!Number.isFinite(value))return;const k=el.dataset.number;rebuild({...draft,[k]:percentages.has(k)?value/100:value});}));
document.querySelectorAll('[data-number]').forEach(el=>el.addEventListener('change',()=>{const k=el.dataset.number,v=Number(draft[k]);if(Number.isFinite(v))el.value=Number((percentages.has(k)?v*100:v).toFixed(8));}));
document.querySelectorAll('[data-stage]').forEach(el=>el.addEventListener('click',()=>{stage=Number(el.dataset.stage);draw();}));
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));draw();fit();}));
$('ridges').checked=false;
['facets','ridges'].forEach(id=>$(id).addEventListener('change',draw));$('fit').addEventListener('click',fit);$('mountain').addEventListener('click',()=>{stage=3;rebuild({...RANGE_DEFAULTS,nave:1,tipNose:.6,baseRiseRatio:.3},{refit:true});});$('reset').addEventListener('click',()=>{stage=3;rebuild(DEFAULTS,{refit:true});});
$('ec-back').onclick=()=>rebuild({...draft,verticalSteps:Math.max(0,model.parameters.verticalSteps-1)});$('ec-next').onclick=()=>rebuild({...draft,verticalSteps:model.parameters.verticalSteps+1});
$('grow-back').addEventListener('click',()=>rebuild({...draft,growth:Math.max(0,model.parameters.growth-1)}));$('grow-next').addEventListener('click',()=>rebuild({...draft,growth:model.parameters.growth+1}));
$('nave-mode').addEventListener('change',()=>rebuild({...draft,nave:$('nave-mode').checked?1:0},{refit:true}));
$('export').addEventListener('click',()=>{const buffer=encodeBinarySTL(model.solid);new Uint8Array(buffer,0,80).fill(0);new Uint8Array(buffer,0,80).set(new TextEncoder().encode('Branching roof | closed volume | Z up'));const url=URL.createObjectURL(new Blob([buffer],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download='branching-roof.stl';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function resize(){const w=$('viewport').clientWidth,h=$('viewport').clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);content.traverse(o=>{if(o.material?.isLineMaterial)o.material.resolution.set(w,h);});camera.left=-camera.top*w/h;camera.right=camera.top*w/h;camera.updateProjectionMatrix();}
new ResizeObserver(()=>{resize();invalidate();}).observe($('viewport'));sync();draw();fit();let frame=0,settle=0;function invalidate(){settle=20;if(!frame)frame=requestAnimationFrame(renderFrame);}function renderFrame(){controls.update();renderer.render(scene,camera);frame=0;if(--settle>0)frame=requestAnimationFrame(renderFrame);}controls.addEventListener('change',invalidate);document.addEventListener('input',invalidate);document.addEventListener('click',invalidate);window.addEventListener('resize',invalidate);invalidate();

// The gallery uses lightweight raster previews of the same validated 3D meshes,
// rather than sixteen simultaneous WebGL renderers.
const main=document.querySelector('main'),editor=document.createElement('div');editor.className='editor-panel';
while(main.firstChild)editor.append(main.firstChild);main.append(editor);
const tabs=document.createElement('div');tabs.className='buttons workspace-tabs';tabs.innerHTML='<button id="tab-study" aria-pressed="true">Study</button><button id="tab-steps" aria-pressed="false">Steps</button><button id="tab-variations" aria-pressed="false">Variations 4 x 4</button>';main.prepend(tabs);
const gallery=document.createElement('section');gallery.id='variations';gallery.hidden=true;gallery.innerHTML='<div class="toolbar"><div><h2>Massing atlas</h2><p>Four bodies, four divergent growth regimes. Click to edit.</p></div><button id="regenerate">Regenerate from study</button></div><p id="gallery-status" role="status"></p><div id="variation-grid"></div>';main.append(gallery);
let galleryRun=0;
function showGallery(show){if(typeof stepsPanel!=='undefined'){stepsPanel.hidden=true;stepRun++;$('tab-steps').setAttribute('aria-pressed','false');}editor.hidden=show;gallery.hidden=!show;$('tab-study').setAttribute('aria-pressed',String(!show));$('tab-variations').setAttribute('aria-pressed',String(show));if(!show){resize();fit();invalidate();}}
$('tab-study').onclick=()=>{galleryRun++;showGallery(false);};$('tab-variations').onclick=()=>{showGallery(true);if(!$('variation-grid').children.length)generateGallery();};$('regenerate').onclick=generateGallery;
function thumbnail(m,options={}){
 const canvas=document.createElement('canvas');canvas.width=360;canvas.height=270;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,360,270);
 const project=([x,y,z])=>[(x-y)/Math.sqrt(2),(x+y)/Math.sqrt(6)-z*Math.sqrt(2/3)],points=(options.reference??m).solid.vertices.map(project);
 const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1])),scale=Math.min(320/(maxX-minX||1),230/(maxY-minY||1));
 if(options.stage===0||options.stage===1){const pts=m.nodes.map(n=>project(options.stage===0?[n.point[0],n.point[1],0]:n.point));ctx.strokeStyle='#000000';ctx.lineWidth=lineWeights.ridges;for(const [a,b] of m.edges){ctx.beginPath();ctx.moveTo(20+(pts[a][0]-minX)*scale,20+(pts[a][1]-minY)*scale);ctx.lineTo(20+(pts[b][0]-minX)*scale,20+(pts[b][1]-minY)*scale);if(lineWeights.ridges>0)ctx.stroke();}const img=new Image();img.src=canvas.toDataURL();img.alt=options.stage===0?'Branching plan graph':'Lifted peak graph';return img;}
 if(softShadows){ctx.save();ctx.fillStyle=`rgba(0,0,0,${.04})`;ctx.shadowColor=`rgba(0,0,0,${.14})`;ctx.shadowBlur=12;ctx.beginPath();m.boundary.forEach((id,i)=>{const v=m.roof.vertices[id],q=project([v[0],v[1],0]);ctx[i?'lineTo':'moveTo'](20+(q[0]-minX)*scale,20+(q[1]-minY)*scale);});ctx.closePath();ctx.fill();ctx.restore();}
 const mesh=options.stage===2?m.roof:m.solid;
 prepareFaceTones(mesh);
 const faces=mesh.faces.map(f=>({f,depth:f.reduce((sum,id)=>sum+mesh.vertices[id][0]+mesh.vertices[id][1]+mesh.vertices[id][2],0)})).sort((a,b)=>a.depth-b.depth);
 const classes=drawingFor(mesh),edgeFront=new Map(),front=new Map();
 for(const {f} of faces){const [a,b,c]=f.map(i=>mesh.vertices[i]),u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);const visible=(u[1]*v[2]-u[2]*v[1])+(u[2]*v[0]-u[0]*v[2])+(u[0]*v[1]-u[1]*v[0])>0;front.set(f,visible);for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;if(!edgeFront.has(key))edgeFront.set(key,[]);edgeFront.get(key).push(visible);}}
 for(const {f} of faces){if(!front.get(f))continue;const q=f.map(id=>project(mesh.vertices[id])).map(p=>[20+(p[0]-minX)*scale,20+(p[1]-minY)*scale]);ctx.beginPath();q.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...p));ctx.closePath();const gray=facetGray(mesh.vertices,f,shadeStrength);ctx.fillStyle=`rgb(${gray},${gray},${gray})`;ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=lineWeights.triangles;if(lineWeights.triangles>0)ctx.stroke();for(let i=0;i<3;i++){const a=f[i],b=f[(i+1)%3],sides=edgeFront.get(a<b?`${a}:${b}`:`${b}:${a}`);if(sides.length===1||sides.some(x=>!x)){const weight=classes.get(a<b?`${a}:${b}`:`${b}:${a}`)?.weight??'inner';ctx.lineWidth=lineWeights[weight];ctx.beginPath();ctx.moveTo(...q[i]);ctx.lineTo(...q[(i+1)%3]);if(lineWeights[weight]>0)ctx.stroke();}}}
 const img=new Image();img.src=canvas.toDataURL();img.alt='Axonometric massing preview';return img;
}
async function generateGallery(){const run=++galleryRun;const grid=$('variation-grid');grid.replaceChildren();const recipes=variationRecipes(model.parameters);$('gallery-status').textContent='Generating 16 watertight variations ';
 for(let i=0;i<recipes.length;i++){if(run!==galleryRun)return;const card=document.createElement('button');card.className='variation-card';card.textContent=`${i+1}   Generating `;grid.append(card);
 try{const result=await compute(recipes[i]);if(run!==galleryRun)return;card.previewData={model:result,options:{}};card.replaceChildren(thumbnail(result));const label=document.createElement('span');label.textContent=`${['Fan','Axial','Cross','Crown'][Math.floor(i/4)]} ${i%4+1}   ${result.integrity.faces} faces   closed`;card.append(label);card.onclick=()=>{galleryRun++;showGallery(false);$('morphology').value=String(result.parameters.morphology);rebuild(result.parameters,{refit:true});};}catch(error){card.textContent=`${i+1}   Cannot form this variation: ${error.message}`;card.disabled=true;}
 $('gallery-status').textContent=`${i+1} / 16 variations processed`;
 }
}

sync();

const stepsPanel=document.createElement('section');stepsPanel.id='generation-steps';stepsPanel.hidden=true;stepsPanel.innerHTML='<div class="toolbar"><div><h2>How the form develops</h2><p>One shared camera scale. Branching first, then peak heights, folded mass, marginal growth, and vertical E/C. Click a card to inspect that exact step.</p></div><button id="refresh-steps">Refresh sequence</button></div><p id="steps-status" role="status"></p><div id="steps-grid"></div>';main.append(stepsPanel);
let stepRun=0;
$('tab-steps').onclick=()=>{galleryRun++;editor.hidden=true;gallery.hidden=true;stepsPanel.hidden=false;$('tab-study').setAttribute('aria-pressed','false');$('tab-variations').setAttribute('aria-pressed','false');$('tab-steps').setAttribute('aria-pressed','true');generateSteps();};
$('refresh-steps').onclick=generateSteps;
async function generateSteps(){
 const run=++stepRun,base={...model.parameters},reference=model,grid=$('steps-grid');grid.replaceChildren();const sequence=[];
 for(let growth=0;growth<=base.growth;growth++)sequence.push({label:growth?'Branch growth '+growth:'Seed organization',stage:0,parameters:{...base,growth,marginSteps:0,verticalSteps:0}});
 const plain={...base,marginSteps:0,verticalSteps:0};
 sequence.push({label:'Lift the peaks',stage:1,parameters:plain},{label:'Fold the roof',stage:2,parameters:plain},{label:'Close the mass',stage:3,parameters:plain});
 for(let marginSteps=1;marginSteps<=base.marginSteps;marginSteps++)sequence.push({label:'Marginal growth '+marginSteps,stage:3,parameters:{...base,marginSteps,verticalSteps:0}});
 for(let verticalSteps=1;verticalSteps<=base.verticalSteps;verticalSteps++)sequence.push({label:'Vertical E/C '+verticalSteps,stage:3,parameters:{...base,verticalSteps}});
 $('steps-status').textContent=`Building ${sequence.length} stages...`;
 const cache=new Map();
 for(let i=0;i<sequence.length;i++){
  if(run!==stepRun)return;const item=sequence[i],card=document.createElement('button');card.className='variation-card';card.textContent=item.label+'...';grid.append(card);
  try{const key=JSON.stringify(item.parameters);const result=cache.get(key)??await compute(item.parameters);cache.set(key,result);if(run!==stepRun)return;
   const preview=thumbnail(result,{stage:item.stage,reference}),label=document.createElement('span');label.textContent=`${String(i+1).padStart(2,'0')} / ${item.label}`;
   const detail=document.createElement('small');detail.textContent=item.stage<2?`${result.nodes.length} peak nodes`:item.stage===2?'Open roof surface':`${result.integrity.faces} triangles / watertight`;
   card.previewData={model:result,options:{stage:item.stage,reference}};card.replaceChildren(preview,label,detail);card.onclick=()=>{stepRun++;stage=item.stage;showGallery(false);rebuild(item.parameters,{refit:true});};
  }catch(error){card.textContent=item.label+': '+error.message;card.disabled=true;}
  $('steps-status').textContent=`${i+1} / ${sequence.length} stages ready`;
 }
}

// Keep explanations available in documentation, not between every control.
for(const p of aside.querySelectorAll('p'))p.hidden=true;
for(const p of editor.querySelectorAll(':scope > p'))p.hidden=true;
aside.querySelector('h1').textContent='Branching forms';

const penControls=document.createElement('fieldset');penControls.innerHTML='<legend>Lineweights (px)</legend>';
for(const [key,label] of [['outline','Outer silhouette'],['inner','Inner silhouette'],['triangles','Triangle edges'],['ridges','Branch ridges']]){
 penControls.insertAdjacentHTML('beforeend',`<label class="control" for="pen-${key}">${label}</label><div class="control-inputs"><input id="pen-${key}" aria-label="${label} lineweight" type="range" min="0" max="${Math.max(6,lineWeights[key])}" step="0.05" value="${lineWeights[key]}"><input id="pen-${key}-number" aria-label="${label} lineweight value" type="number" min="0" step="0.05" value="${lineWeights[key]}"></div>`);
}
aside.insertBefore(penControls,primary);let penTimer;
for(const key of Object.keys(lineWeights))for(const suffix of ['', '-number'])$('pen-'+key+suffix).oninput=e=>{
 if(e.target.value==='')return;const value=Number(e.target.value);if(!Number.isFinite(value)||value<0)return;lineWeights[key]=value;
 const slider=$('pen-'+key);slider.max=Math.max(6,value);slider.value=value;$('pen-'+key+'-number').value=value;
 try{localStorage.setItem('cathedral-lineweights',JSON.stringify(lineWeights));}catch{}
 clearTimeout(penTimer);penTimer=setTimeout(()=>{draw();invalidate();for(const card of document.querySelectorAll('.variation-card')){if(card.previewData&&card.querySelector('img'))card.querySelector('img').replaceWith(thumbnail(card.previewData.model,card.previewData.options));}},80);
};

const shadingControls=document.createElement('fieldset');shadingControls.innerHTML=`<legend>Shading</legend><label class="control" for="shade-strength">Face shade contrast<output id="shade-value">${Math.round(shadeStrength*100)}%</output></label><input id="shade-strength" type="range" min="0" max="100" step="1" value="${shadeStrength*100}"><label><input id="soft-shadows" type="checkbox" ${softShadows?'checked':''}> Soft shadows</label>`;aside.insertBefore(shadingControls,primary);
let shadeTimer;function updateShading(){shadeStrength=Number($('shade-strength').value)/100;softShadows=$('soft-shadows').checked;$('shade-value').textContent=Math.round(shadeStrength*100)+'%';try{localStorage.setItem('cathedral-shading',JSON.stringify({strength:shadeStrength,shadows:softShadows}));}catch{}clearTimeout(shadeTimer);shadeTimer=setTimeout(()=>{draw();invalidate();for(const card of document.querySelectorAll('.variation-card'))if(card.previewData&&card.querySelector('img'))card.querySelector('img').replaceWith(thumbnail(card.previewData.model,card.previewData.options));},80);}
$('shade-strength').oninput=updateShading;$('soft-shadows').onchange=updateShading;
