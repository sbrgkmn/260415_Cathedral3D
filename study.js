import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildStudy, analyzeMesh, encodeBinarySTL, DEFAULTS } from './polarity.mjs';
import { decodeBinarySTL } from './stl.mjs';

const $ = id => document.getElementById(id);
const query = new URLSearchParams(location.search);
let study = buildStudy(Object.fromEntries([...query].filter(([key]) => key in DEFAULTS)));
let selected = Math.max(0, Math.min(study.frames.length - 1, Math.floor(Number(query.get('stage')) || 0)));
let view = 'model', cameraView = 'perspective', playing = false, playTimer, noticeTimer;
let frameMesh, frameEdges, sceneBounds, requestId;
const referenceNames = Array.from({length:6},(_,i)=>`Target_${i+1}.stl`);
let referenceName = referenceNames.includes(query.get('reference')) ? query.get('reference') : 'Target_4.stl';
let referenceMode = ['study','reference','overlay'].includes(query.get('referenceMode')) ? query.get('referenceMode') : 'study';
let sourceReference, referenceFrame, referenceMesh, referenceEdges, referenceRequest = 0;
const referenceCache = new Map();
const format = n => n.toLocaleString('en-US');
const colors = { seed: '#748470', contract: '#b87855', expand: '#527e90', divide: '#738876', detail: '#8a8170' };
const operationLabels = { seed: 'SEED', contract: 'CONTRACTION', expand: 'EXPANSION', divide: 'CELL DIVISION', detail: 'SURFACE' };
const shortTitles = frame => ({ seed: 'Two-face seed' }[frame.kind] || frame.title.replace('the ', '').replace('Surface subdivision', 'Subdivision'));

const viewport = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xf4f3ef, 0);
viewport.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-180, 180, 180, -180, 0.1, 5000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.minZoom = 0.25;
controls.maxZoom = 10;
controls.maxPolarAngle = Math.PI * 0.94;
controls.addEventListener('change', requestRender);
const hemi = new THREE.HemisphereLight(0xffffff, 0x6b7767, 2.4);
hemi.position.set(0, 0, 300);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.7);
sun.position.set(-140, 100, 240);
scene.add(sun);
const surfaceMaterial = new THREE.MeshStandardMaterial({ color: 0xbec7b8, roughness: 1, metalness: 0, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x53664f, transparent: true, opacity: 0.43 });
const modelGroup = new THREE.Group(), ghostGroup = new THREE.Group(), vectorGroup = new THREE.Group();
scene.add(modelGroup, ghostGroup, vectorGroup);
const referenceGroup = new THREE.Group();scene.add(referenceGroup);
const grid = new THREE.GridHelper(600, 30, 0xc8cfc0, 0xdce0d4);
grid.rotation.x = Math.PI / 2;
grid.position.z = -0.2;
grid.material.transparent = true;
grid.material.opacity = 0.42;
scene.add(grid);

function requestRender() {
  if (requestId) return;
  requestId = requestAnimationFrame(() => {
    requestId = undefined;
    if (view === 'model') {
      controls.update();
      renderer.render(scene, camera);
    }
  });
}

function geometryFor(frame) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(frame.vertices.flat(), 3));
  geometry.setIndex(frame.faces.flat());
  geometry.computeVertexNormals();
  return geometry;
}

function clearGroup(group) {
  const geometry = new Set(), materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometry.add(object.geometry);
    if (object.material && ![surfaceMaterial, lineMaterial].includes(object.material)) materials.add(object.material);
  });
  geometry.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  group.clear();
}

function updateBounds() {
  sceneBounds = new THREE.Box3();
  study.frames.forEach(frame => frame.vertices.forEach(p => sceneBounds.expandByPoint(new THREE.Vector3(...p))));
  if(referenceMode !== 'study' && referenceFrame) referenceFrame.vertices.forEach(p=>sceneBounds.expandByPoint(new THREE.Vector3(...p)));
}

function fitCamera() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  const center = sceneBounds.getCenter(new THREE.Vector3());
  const size = sceneBounds.getSize(new THREE.Vector3());
  controls.target.copy(center);
  const direction = cameraView === 'top' ? new THREE.Vector3(0, 0, 1)
    : cameraView === 'front' ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1.4, 2.8, 1.35).normalize();
  camera.up.set(0, cameraView === 'top' ? -1 : 0, cameraView === 'top' ? 0 : 1);
  camera.position.copy(center).addScaledVector(direction, 900);
  camera.lookAt(center);
  const aspect = width / height;
  const half = cameraView === 'top' ? Math.max(size.y * 0.92, size.x / aspect * 0.76, 30)
    : Math.max(size.z * 0.92, size.y * 0.85, size.x / aspect * 0.76, 60);
  camera.top = half * 1.05;
  camera.bottom = -half * 0.95;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.enableRotate = cameraView === 'perspective';
  controls.update();
  requestRender();
}

function resize() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  fitCamera();
}

function setCamera(name) {
  cameraView = name;
  document.querySelectorAll('[data-camera]').forEach(button => {
    button.classList.toggle('active', button.dataset.camera === name);
    button.setAttribute('aria-pressed', String(button.dataset.camera === name));
  });
  grid.visible = name !== 'front';
  $('navigation-hint').textContent = name === 'perspective' ? 'Drag to orbit · scroll to zoom · right-drag to pan' : 'Orthographic projection · scroll to zoom · right-drag to pan';
  if (view !== 'model') setView('model');
  fitCamera();
}

function drawModel() {
  clearGroup(modelGroup); clearGroup(ghostGroup); clearGroup(vectorGroup);
  const frame = study.frames[selected];
  const geometry = geometryFor(frame);
  frameMesh = new THREE.Mesh(geometry, surfaceMaterial);
  modelGroup.add(frameMesh);
  frameEdges = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), lineMaterial);
  modelGroup.add(frameEdges);
  if (selected > 0) {
    const previous = geometryFor(study.frames[selected - 1]);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(previous), new THREE.LineDashedMaterial({ color: 0xa79074, transparent: true, opacity: 0.36, dashSize: 2, gapSize: 2, depthTest: false }));
    previous.dispose();
    wire.computeLineDistances();
    ghostGroup.add(wire);
  }
  // Every shown arrow starts on the old edge and ends at its displaced point.
  // Limit the annotation density, while leaving the full mesh intact.
  if (frame.kind !== 'detail') {
    const motions = [...frame.motions].sort((a, b) => motionLength(b) - motionLength(a)).slice(0, 24);
    for (const motion of motions) {
      const start = new THREE.Vector3(...motion.from), end = new THREE.Vector3(...motion.to);
      const direction = end.clone().sub(start), length = direction.length();
      if (length < 0.2) continue;
      const arrow = new THREE.ArrowHelper(direction.normalize(), start, length, colors[frame.kind], Math.min(length * 0.22, 4.5), Math.min(length * 0.1, 2));
      arrow.line.material.depthTest = false;
      arrow.cone.material.depthTest = false;
      arrow.renderOrder = 3;
      vectorGroup.add(arrow);
    }
  }
  updateVisibility();
  const stats = analyzeMesh(frame);
  $('mesh-stats').innerHTML = `<div><strong>${format(stats.triangles)}</strong>triangles</div><div><strong>${format(stats.vertices)}</strong>vertices</div><div class="mesh-status"><span>${stats.symmetric ? '✓ Bilateral symmetry' : 'Check symmetry'}</span><br>Open surface · ${format(stats.boundaryEdges)} boundary edges</div>`;
  $('viewport').setAttribute('aria-label', `${frame.title}: ${stats.triangles} triangles, symmetric open surface. ${frame.description}`);
  if(referenceMode === 'reference') {
    $('stage-number').textContent='ORIGINAL REFERENCE';
    $('stage-kind').textContent='STL';$('stage-kind').className='operation expand';
    $('stage-title').textContent=referenceName;
    $('stage-description').textContent='The original STL, displayed at the study’s final height with its proportions preserved. Use Plan and Elevation to compare its branching and peak hierarchy.';
    $('rule-caption').textContent='REFERENCE · uniform display scale · original triangular surface';
    if(referenceFrame) {
      $('mesh-stats').innerHTML=`<div><strong>${format(referenceFrame.faces.length)}</strong>source triangles</div><div class="mesh-status">Original STL geometry<br><span>Uniform height normalization</span></div>`;
      $('viewport').setAttribute('aria-label',`${referenceName}: original target STL with ${referenceFrame.faces.length} triangles, uniformly normalized in height.`);
    }
  } else if(referenceMode === 'overlay') $('rule-caption').textContent += ' · blue = original target, normalized to final height';
  requestRender();
}

function motionLength(m) { return Math.hypot(...m.to.map((v, i) => v - m.from[i])); }
function updateVisibility() {
  if (frameEdges) frameEdges.visible = $('edges').checked;
  modelGroup.visible = referenceMode !== 'reference';
  ghostGroup.visible = $('ghost').checked && referenceMode !== 'reference';
  vectorGroup.visible = $('vectors').checked && referenceMode !== 'reference';
  referenceGroup.visible = referenceMode !== 'study';
  if(referenceEdges) referenceEdges.visible = $('edges').checked && referenceMode === 'reference';
  if(referenceMesh) {
    referenceMesh.material.opacity = referenceMode === 'overlay' ? 0.32 : 1;
    referenceMesh.material.depthWrite = referenceMode !== 'overlay';
  }
  requestRender();
}

function selectStage(index, scroll = true) {
  selected = Math.max(0, Math.min(study.frames.length - 1, index));
  const frame = study.frames[selected];
  $('stage-number').textContent = `STAGE ${String(selected).padStart(2, '0')}`;
  $('stage-kind').className = `operation ${frame.kind}`;
  $('stage-kind').textContent = `${['seed','surface'].includes(frame.phase) ? '' : frame.phase.toUpperCase() + ' · '}${operationLabels[frame.kind]}`;
  $('stage-title').textContent = frame.title;
  $('stage-description').textContent = frame.description;
  $('rule-caption').textContent = frame.rule;
  $('previous').disabled = selected === 0;
  $('next').disabled = selected === study.frames.length - 1;
  $('ghost').disabled = selected === 0 || referenceMode === 'reference';
  $('vectors').disabled = !frame.motions.length || frame.kind === 'detail' || referenceMode === 'reference';
  document.querySelectorAll('[data-stage]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === selected)));
  document.querySelectorAll('[data-phase]').forEach(button => {
    button.classList.toggle('active',button.dataset.phase===frame.phase && referenceMode!=='reference');
    button.disabled = !study.frames.some(f=>f.phase===button.dataset.phase);
  });
  if (scroll) {
    const strip = $('stage-strip'), card = strip.children[selected];
    if (card) {
      const x = card.offsetLeft - strip.offsetLeft;
      if (x < strip.scrollLeft || x + card.offsetWidth > strip.scrollLeft + strip.clientWidth) {
        strip.scrollTo({ left: x - (strip.clientWidth - card.offsetWidth) / 2, behavior: 'auto' });
      }
    }
  }
  drawModel();
  updateUrl();
}

function setView(name) {
  view = name;
  $('model-view').hidden = name !== 'model';
  $('series-view').hidden = name !== 'series';
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.mode === name);
    button.setAttribute('aria-pressed', String(button.dataset.mode === name));
  });
  if (name === 'series') renderSeries();
  else resize();
}

// Painter's orthographic projection of the actual triangular mesh, shared by
// sequence thumbnails and the larger series drawings. No separate display grammar.
function project(p, plan = false) {
  if (plan) return [p[0], -p[1], p[2]];
  return [-0.8944 * p[0] + 0.4472 * p[1], -0.18 * p[0] - 0.36 * p[1] + 0.915 * p[2], 0.409 * p[0] + 0.818 * p[1] + 0.402 * p[2]];
}
function projectionBounds(plan) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  study.frames.forEach(frame => frame.vertices.forEach(p => {
    const [x, y] = project(p, plan);
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
  }));
  return bounds;
}
let isoBounds, planBounds;
function drawProjection(ctx, frame, box, plan = false) {
  const bounds = plan ? planBounds : isoBounds;
  const scale = Math.min(box.w / (bounds.maxX - bounds.minX), box.h / (bounds.maxY - bounds.minY));
  const centerX = (bounds.minX + bounds.maxX) / 2, centerY = (bounds.minY + bounds.maxY) / 2;
  const points = frame.vertices.map(p => {
    const [x, y, z] = project(p, plan);
    return [box.x + box.w / 2 + (x - centerX) * scale, box.y + box.h / 2 - (y - centerY) * scale, z];
  });
  const faces = [...frame.faces].sort((a, b) => a.reduce((sum, i) => sum + points[i][2], 0) - b.reduce((sum, i) => sum + points[i][2], 0));
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x - 5, box.y - 5, box.w + 10, box.h + 10); ctx.clip();
  const dense = frame.faces.length > 2048;
  ctx.lineWidth = plan ? 0.5 : 0.55;
  for (const face of faces) {
    ctx.beginPath();
    face.forEach((id, i) => i ? ctx.lineTo(points[id][0], points[id][1]) : ctx.moveTo(points[id][0], points[id][1]));
    ctx.closePath();
    if (!plan) {
      const [a, b, c] = face.map(id => new THREE.Vector3(...frame.vertices[id]));
      const n = b.sub(a).cross(c.sub(a)).normalize();
      const light = Math.max(0, n.dot(new THREE.Vector3(-0.6, 0.3, 0.74)));
      const shade = Math.round(159 + light * 64);
      ctx.fillStyle = `rgb(${shade},${shade + 5},${shade - 2})`;
      ctx.fill();
    }
    if (!dense) { ctx.strokeStyle = plan ? '#74806c66' : '#69775e70'; ctx.stroke(); }
  }
  // Outline remains legible even when the interior is too dense for thin linework.
  const edges = new Map();
  frame.faces.forEach(([a,b,c]) => [[a,b],[b,c],[c,a]].forEach(([u,v]) => {
    const id = u < v ? `${u}:${v}` : `${v}:${u}`;
    if (!edges.has(id)) edges.set(id,{u,v,count:0});
    edges.get(id).count++;
  }));
  ctx.beginPath();
  for (const edge of edges.values()) if (edge.count === 1) {
    ctx.moveTo(points[edge.u][0], points[edge.u][1]); ctx.lineTo(points[edge.v][0], points[edge.v][1]);
  }
  ctx.strokeStyle = '#52644eb3'; ctx.lineWidth = 0.8; ctx.stroke();
  if (plan) {
    // An unchanged dashed seed footprint makes the plan contraction measurable.
    ctx.setLineDash([3, 3]); ctx.lineWidth = 0.5; ctx.strokeStyle = '#a4aa9d';
    const p = study.options;
    const outline = [[-p.width/2,0,0],[0,p.depth,0],[p.width/2,0,0]];
    ctx.beginPath();
    outline.forEach((point, i) => {
      const [x,y] = project(point, true);
      const px = box.x + box.w/2 + (x-centerX)*scale, py = box.y+box.h/2-(y-centerY)*scale;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();ctx.stroke();
  }
  ctx.restore();
}

function drawCard(canvas, frame, series = false) {
  const w = series ? 400 : 240, h = series ? 330 : 140;
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  if (series) {
    drawProjection(ctx, frame, { x: 32, y: 12, w: w - 64, h: 192 });
    ctx.strokeStyle = '#e0e3d9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(20,220);ctx.lineTo(w-20,220);ctx.stroke();
    ctx.fillStyle='#969d8f';ctx.font='10px sans-serif';ctx.fillText('PLAN',22,242);
    drawProjection(ctx, frame, { x: 70, y: 235, w: w-140, h: 80 }, true);
  } else drawProjection(ctx, frame, { x: 27, y: 9, w: w-54, h: h-18 });
}

function renderTimeline() {
  isoBounds = projectionBounds(false); planBounds = projectionBounds(true);
  $('stage-strip').replaceChildren();
  study.frames.forEach(frame => {
    const button = document.createElement('button');
    button.className = 'stage-card';button.dataset.stage = frame.index;
    button.setAttribute('aria-label', `Stage ${frame.index}: ${frame.title}, ${format(frame.faces.length)} triangles`);
    button.innerHTML = `<span class="card-number">${String(frame.index).padStart(2,'0')}</span><canvas aria-hidden="true"></canvas><div class="card-footer"><span class="card-title"><i class="dot ${frame.kind}"></i>${shortTitles(frame)}</span><small><span class="card-phase">${frame.phase.toUpperCase()}</span> ${format(frame.faces.length)} triangles</small></div>`;
    button.addEventListener('click', () => { stopPlayback(); selectGeneratedStage(frame.index); });
    $('stage-strip').append(button);
    drawCard(button.querySelector('canvas'), frame);
  });
  $('sequence-summary').textContent = `${study.frames.length} stages · ${format(study.frames.at(-1).faces.length)} final facets`;
}

function renderSeries() {
  $('series-grid').replaceChildren();
  study.frames.forEach(frame => {
    const button = document.createElement('button');
    button.className='series-card';button.dataset.stage=frame.index;
    button.setAttribute('aria-label', `Inspect stage ${frame.index}: ${frame.title}`);
    button.setAttribute('aria-pressed', String(frame.index === selected));
    button.innerHTML=`<header><span>${String(frame.index).padStart(2,'0')}</span>${frame.title}<i class="dot ${frame.kind}"></i></header><canvas aria-hidden="true"></canvas><footer><span>${format(frame.faces.length)} triangles</span><strong>Inspect stage ↗</strong></footer>`;
    button.addEventListener('click', () => {stopPlayback();setView('model');selectGeneratedStage(frame.index);});
    $('series-grid').append(button);drawCard(button.querySelector('canvas'),frame,true);
  });
}

function syncControls() {
  document.querySelectorAll('[data-param]').forEach(input => {
    const key=input.dataset.param, value=study.options[key];input.value=value;
    const output=$(`${key}-value`);
    if(output) output.textContent = ['width','height','depth'].includes(key) ? value : `${Math.round(value*100)}%`;
    if(input.type==='range') input.style.setProperty('--fill', `${(value-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
  });
  $('decay').disabled=study.options.generations===1;
  $('relief').disabled=study.options.detail===0;
  [...$('detail').options].forEach(option => option.disabled = Number(option.value) > 6 - study.options.planCycles - 2 * study.options.generations);
  [...$('generations').options].forEach(option => option.disabled = Number(option.value) > Math.floor((6-study.options.planCycles)/2));
}

function updateUrl() {
  const parameters=new URLSearchParams();
  for(const [name,value] of Object.entries(study.options)) if(value!==DEFAULTS[name]) parameters.set(name,String(value));
  if(selected) parameters.set('stage',String(selected));
  if(referenceName!=='Target_4.stl') parameters.set('reference',referenceName);
  if(referenceMode!=='study') parameters.set('referenceMode',referenceMode);
  history.replaceState(null,'',`${location.pathname}${parameters.size ? '?' + parameters : ''}`);
}

function rebuild(options) {
  stopPlayback();
  study=buildStudy(options);updateReferenceGeometry();updateBounds();syncControls();renderTimeline();
  if(view==='series') renderSeries();
  selected=Math.min(selected,study.frames.length-1);
  fitCamera();selectStage(selected,false);
}

function updateReferenceGeometry() {
  if(!sourceReference) return;
  clearGroup(referenceGroup);
  const min=sourceReference.vertices.reduce((v,p)=>Math.min(v,p[2]),Infinity);
  const max=sourceReference.vertices.reduce((v,p)=>Math.max(v,p[2]),-Infinity);
  const height=study.frames.at(-1).vertices.reduce((v,p)=>Math.max(v,p[2]),0);
  const scale=height/(max-min);
  referenceFrame={...sourceReference,vertices:sourceReference.vertices.map(([x,y,z])=>[x*scale,y*scale,(z-min)*scale])};
  const geometry=geometryFor(referenceFrame);
  referenceMesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x718fa8,roughness:1,flatShading:true,side:THREE.DoubleSide,transparent:true,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2}));
  referenceEdges=new THREE.LineSegments(new THREE.WireframeGeometry(geometry),new THREE.LineBasicMaterial({color:0x49657b,transparent:true,opacity:0.22}));
  referenceGroup.add(referenceMesh,referenceEdges);
  const xs=sourceReference.vertices.map(p=>p[0]),ys=sourceReference.vertices.map(p=>p[1]);
  const extent=a=>a.reduce((m,v)=>Math.max(m,v),-Infinity)-a.reduce((m,v)=>Math.min(m,v),Infinity);
  $('reference-status').textContent=`${format(sourceReference.faces.length)} original triangles. Source W × D × H: ${extent(xs).toFixed(1)} × ${extent(ys).toFixed(1)} × ${(max-min).toFixed(1)}. Display scales uniformly to the study’s final height.`;
  updateVisibility();
}

async function loadReference() {
  const request=++referenceRequest,name=referenceName;
  $('reference-status').textContent=`Loading ${name}…`;
  $('reference-hierarchy').href=`./analysis/${name.replace('.stl','')}-hierarchy.png`;
  sourceReference=undefined;referenceFrame=undefined;clearGroup(referenceGroup);
  try {
    if(!referenceCache.has(name)) referenceCache.set(name,fetch(`./Old%20Project%20FIles/${name}`).then(response=>{
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    }).then(buffer=>decodeBinarySTL(buffer,name)));
    const frame=await referenceCache.get(name);
    if(request!==referenceRequest) return;
    sourceReference=frame;updateReferenceGeometry();updateBounds();fitCamera();selectStage(selected,false);
  } catch(error) {
    if(request!==referenceRequest) return;
    referenceCache.delete(name);referenceMode='study';$('reference-mode').value='study';
    $('reference-status').textContent=`Could not load ${name}: ${error.message}`;
    updateVisibility();selectStage(selected,false);
  }
}

function inspectPhase(phase, end=false) {
  stopPlayback();referenceMode='study';$('reference-mode').value='study';
  const candidates=study.frames.filter(f=>f.phase===phase);
  if(!candidates.length) return;
  setView('model');setCamera(phase==='plan'?'top':'perspective');
  updateBounds();fitCamera();selectStage((end?candidates.at(-1):candidates[0]).index);
}

function selectGeneratedStage(index) {
  if(referenceMode==='reference') {
    referenceMode='study';$('reference-mode').value='study';updateBounds();fitCamera();
  }
  selectStage(index);
}

function stopPlayback() {
  playing=false;clearTimeout(playTimer);
  $('play').innerHTML='▶ <span>Play sequence</span>';
  $('play').setAttribute('aria-label','Play development sequence');
}
function togglePlayback() {
  if(playing) return stopPlayback();
  if(referenceMode==='reference') selectGeneratedStage(selected);
  if(selected===study.frames.length-1) selectStage(0);
  playing=true;$('play').innerHTML='Ⅱ <span>Pause sequence</span>';$('play').setAttribute('aria-label','Pause development sequence');
  const step=() => {
    if(!playing) return;
    if(selected>=study.frames.length-1) return stopPlayback();
    selectStage(selected+1);playTimer=setTimeout(step,1800);
  };
  playTimer=setTimeout(step,1800);
}

document.querySelectorAll('[data-param]').forEach(input => input.addEventListener('input', () => rebuild({...study.options,[input.dataset.param]:Number(input.value)})));
document.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click',()=>setCamera(button.dataset.camera)));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click',()=>setView(button.dataset.mode)));
document.querySelectorAll('[data-phase]').forEach(button=>button.addEventListener('click',()=>inspectPhase(button.dataset.phase)));
$('inspect-plan').addEventListener('click',()=>inspectPhase('plan',true));
$('open-reference').addEventListener('click',()=>{
  stopPlayback();referenceMode='overlay';$('reference-mode').value='overlay';setView('model');updateBounds();fitCamera();selectStage(selected,false);
  document.querySelector('.reference-controls').scrollIntoView({block:'start',behavior:'auto'});
});
$('reference-file').value=referenceName;$('reference-mode').value=referenceMode;
$('reference-file').addEventListener('change',()=>{referenceName=$('reference-file').value;updateUrl();loadReference();});
$('reference-mode').addEventListener('change',()=>{stopPlayback();referenceMode=$('reference-mode').value;setView('model');updateBounds();fitCamera();selectStage(selected,false);});
['edges','ghost','vectors'].forEach(id=>$(id).addEventListener('change',updateVisibility));
$('fit').addEventListener('click',fitCamera);
$('reset').addEventListener('click',()=>{selected=0;referenceMode='study';$('reference-mode').value='study';rebuild(DEFAULTS);setCamera('perspective');});
$('previous').addEventListener('click',()=>{stopPlayback();selectGeneratedStage(selected-1);});
$('next').addEventListener('click',()=>{stopPlayback();selectGeneratedStage(selected+1);});
$('play').addEventListener('click',togglePlayback);
document.addEventListener('keydown',event=>{
  if(event.target.closest('input,select,textarea,button,a')) return;
  if(event.key==='ArrowRight'){event.preventDefault();stopPlayback();selectGeneratedStage(selected+1);}
  if(event.key==='ArrowLeft'){event.preventDefault();stopPlayback();selectGeneratedStage(selected-1);}
  if(event.code==='Space'){event.preventDefault();togglePlayback();}
});
$('export').addEventListener('click',()=>{
  const data=encodeBinarySTL(study.frames[selected]);
  const blob=new Blob([data],{type:'application/octet-stream'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`cathedral-stage-${String(selected).padStart(2,'0')}-${study.frames[selected].kind}.stl`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('notice').hidden=false;$('notice').textContent=`STL ready · stage ${selected} · ${format(study.frames[selected].faces.length)} triangles · open surface.`;
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,4500);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();else requestRender();});
new ResizeObserver(resize).observe(viewport);
updateBounds();syncControls();renderTimeline();resize();selectStage(selected,false);
loadReference();
