import { DEFAULTS,normalizeParameters,alternatingRules,buildSections } from './section-grammar.mjs';
import { sectionSVG } from './section-drawing.mjs';
const $=id=>document.getElementById(id), query=new URLSearchParams(location.search);
let parameters=normalizeParameters(Object.fromEntries(query));
const parsedRules=query.get('rules')?.split(',').filter(s=>/^[EC](?:100|\d{1,2})$/.test(s)).map(s=>({kind:s[0],amount:Number(s.slice(1))/100}));
let rules=query.has('rules')?parsedRules:alternatingRules(6,parameters);
let study=buildSections(parameters,rules), selected=query.has('stage')?Math.max(0,Math.min(study.rules.length,Math.floor(Number(query.get('stage')))||0)):study.rules.length;
let array=query.get('array')==='1', style='solid', construction=false, viewer, playing=false,timer,noticeTimer;
const pad=n=>String(n).padStart(2,'0'), percent=v=>`${Math.round(v*100)}%`;
const names={S:'Triangle seed',E:'Grow a buttress',C:'Carve the section'};
const stageLabels={'The triangular seed':'Triangle','Establish the buttresses':'Buttresses','Open the nave':'Nave opening','Branch the side aisles':'Aisle tier','Establish the springing':'Springing','Grow the outer pinnacles':'Outer tier','Refine the pointed arches':'Pointed arches','Retain the outer tier':'Detail limit'};
function syncURL() {
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(parameters))if(v!==DEFAULTS[k])q.set(k,v);
  q.set('rules',rules.map(r=>r.kind+Math.round(r.amount*100)).join(','));q.set('stage',selected);
  if(array)q.set('array','1');
  history.replaceState(null,'',`${location.pathname}?${q}`);
}
function controls() {
  for(const [key,value] of Object.entries(parameters)) {
    $(key).value=value;$(key+'-value').textContent=['expansion','contraction','fold','nave','springing','pinnacle','slenderness','buttress','longitudinal'].includes(key)?percent(value):value;
  }
  $('steps').value=rules.length;$('steps-value').textContent=rules.length;
  $('array').checked=array;$('array-controls').hidden=!array;
  $('array-quick').setAttribute('aria-pressed',array);
  $('bays').disabled=!array;$('gap').disabled=!array;
  $('add-e').disabled=rules.length>=10;$('add-c').disabled=rules.length>=10;
}
function rebuild() {
  study=buildSections(parameters,rules);parameters=study.parameters;rules=study.rules;
  selected=Math.min(selected,rules.length);controls();drawSequence();drawSelected();
}
function drawSequence() {
  $('sequence-strip').innerHTML=study.frames.map(frame=>`<button class="stage-card ${frame.kind}" data-stage="${frame.index}" aria-pressed="${frame.index===selected}" aria-label="Step ${frame.index}: ${frame.kind==='S'?'Triangle seed':frame.kind==='E'?'Expansion':'Contraction'}"><span class="card-top">${pad(frame.index)}<b>${frame.kind==='S'?'SEED':frame.kind+' · '+percent(frame.amount)}</b></span>${sectionSVG(frame,study.bounds,{mini:true,id:'thumb-'+frame.index})}<span class="card-label">${stageLabels[frame.title]||(frame.kind==='E'?'Expansion':'Contraction')}</span></button>`).join('');
  $('sequence-count').textContent=`${rules.length} steps + seed`;
}
function drawSelected() {
  const frame=study.frames[selected];
  $('stage-title').textContent=frame.title||names[frame.kind];
  $('rule-target').textContent=frame.target||'Retained section';$('rule-invariant').textContent=frame.invariant||'All earlier geometry';$('rule-result').textContent=frame.result||'Zero-strength rule';
  $('stage-badge').className=`badge ${frame.kind}`;
  $('stage-badge').textContent=`STEP ${pad(selected)} · ${frame.kind==='S'?'SEED':frame.kind==='E'?'EXPANSION':'CONTRACTION'}`;
  $('section-view').innerHTML=sectionSVG(frame,study.bounds,{construction,lines:style==='lines',previous:study.frames[selected-1]});
  $('section-view').setAttribute('aria-label',`Step ${selected}: ${frame.openings.length} pointed openings and ${frame.branches} buttress pairs. ${frame.note}`);
  $('rule-description').textContent=frame.note;
  $('section-stats').innerHTML=`${frame.openings.length} ${frame.openings.length===1?'opening':'openings'}<br>${frame.branches} buttress ${frame.branches===1?'pair':'pairs'}`;
  $('model-title').textContent=array?`${parameters.bays} folded bays`:'Folded bay';
  $('bay-view').setAttribute('aria-label',`Step ${selected}: ${array?parameters.bays:1} symmetric folded ${array?'bays':'bay'}, depth ${parameters.depth}, ${frame.pinnacles.length?frame.pinnacles.length*2-1:0} isolated pinnacles per bay. Buttress projection ${percent(parameters.buttress)}. Joined end faces close the material around the nave and aisle openings.`);
  document.querySelectorAll('[data-stage]').forEach(el=>el.setAttribute('aria-pressed',Number(el.dataset.stage)===selected));
  $('back').disabled=selected===0;$('forward').disabled=selected===rules.length;$('play').disabled=!rules.length;
  $('editor-label').textContent=selected?`EDIT STEP ${pad(selected)}`:'STEP 00 · THE TRIANGLE';
  $('editor-hint').textContent=selected?'Change this rule; all later steps develop from it.':'The seed is fixed. Use the width and height controls.';
  $('step-kind').disabled=!selected;$('step-amount').disabled=!selected;
  $('step-kind').value=selected?frame.kind:'E';$('step-amount').value=frame.amount;$('step-amount-value').textContent=selected?percent(frame.amount):'—';
  if(viewer){viewer.update(frame,study.bounds,parameters,array);showIntegrity();}syncURL();
}
function showIntegrity() {
  const result=viewer?.integrity();if(!result)return;
  $('export-stl').disabled=!result.watertight;
  $('mesh-status').classList.toggle('invalid',!result.watertight);
  $('mesh-status').textContent=result.watertight?`✓ Closed volume · ${result.boundaryEdges} boundary edges · ${result.components} ${result.components===1?'body':'bodies'} · ${result.faces.toLocaleString()} triangles${$('cutaway').checked?' · Cutaway display; export stays complete':''}`:'This setting does not form a closed volume. STL export is unavailable.';
}
function stop() {playing=false;clearInterval(timer);$('play').textContent='▶ Play';}
function select(index,manual=true) {if(manual)stop();selected=Math.max(0,Math.min(rules.length,index));drawSelected();}
function append(kind) {if(rules.length>=10)return;stop();rules.push({kind,amount:parameters[kind==='E'?'expansion':'contraction']});selected=rules.length;rebuild();}
function notify(message) {$('notice').hidden=false;$('notice').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,3000);}
function download(data,name,type) {const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.querySelectorAll('[data-param]').forEach(input=>input.addEventListener('input',()=>{
  stop();const key=input.dataset.param;parameters[key]=Number(input.value);
  if(key==='expansion'||key==='contraction')rules=rules.map(r=>r.kind===(key==='expansion'?'E':'C')?{...r,amount:parameters[key]}:r);
  rebuild();
}));
$('steps').addEventListener('input',()=>{
  stop();const length=Number($('steps').value);rules=rules.slice(0,length);
  while(rules.length<length){const kind=rules.at(-1)?.kind==='E'?'C':'E';rules.push({kind,amount:parameters[kind==='E'?'expansion':'contraction']});}
  selected=rules.length;rebuild();
});
$('add-e').addEventListener('click',()=>append('E'));$('add-c').addEventListener('click',()=>append('C'));
$('sequence-strip').addEventListener('click',event=>{const button=event.target.closest('[data-stage]');if(button)select(Number(button.dataset.stage));});
$('back').addEventListener('click',()=>select(selected-1));$('forward').addEventListener('click',()=>select(selected+1));
$('play').addEventListener('click',()=>{
  if(playing){stop();return;}if(!rules.length)return;
  playing=true;$('play').textContent='Ⅱ Pause';if(selected===rules.length)select(0,false);
  timer=setInterval(()=>{if(selected>=rules.length){stop();return;}select(selected+1,false);if(selected===rules.length)stop();},1100);
});
$('step-kind').addEventListener('change',()=>{if(!selected)return;stop();const kind=$('step-kind').value;rules[selected-1]={kind,amount:parameters[kind==='E'?'expansion':'contraction']};rebuild();});
$('step-amount').addEventListener('input',()=>{if(!selected)return;stop();rules[selected-1].amount=Number($('step-amount').value);rebuild();});
$('array').addEventListener('change',()=>{array=$('array').checked;controls();drawSelected();});
$('array-quick').addEventListener('click',()=>{array=!array;controls();drawSelected();});
$('construction').addEventListener('change',()=>{construction=$('construction').checked;drawSelected();});
document.querySelectorAll('[data-style]').forEach(button=>button.addEventListener('click',()=>{style=button.dataset.style;document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',b===button));drawSelected();}));
$('fit').addEventListener('click',()=>viewer?.fit());
document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{
  viewer?.setView(button.dataset.camera);document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',b===button));
}));
$('fold-lines').addEventListener('change',()=>viewer?.setFoldLines($('fold-lines').checked));
$('cutaway').addEventListener('change',()=>{viewer?.setCutaway($('cutaway').checked);showIntegrity();});
$('reset').addEventListener('click',()=>{
  stop();parameters={...DEFAULTS};rules=alternatingRules(6,parameters);selected=6;array=false;style='solid';construction=false;
  $('construction').checked=false;$('fold-lines').checked=true;viewer?.setFoldLines(true);
  $('cutaway').checked=false;viewer?.setCutaway(false);
  viewer?.setView('iso');document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.camera==='iso'));
  document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.style===style));rebuild();
});
$('export-svg').addEventListener('click',()=>{download(sectionSVG(study.frames[selected],study.bounds,{construction,lines:style==='lines',previous:study.frames[selected-1]}),`cathedral-section-${pad(selected)}.svg`,'image/svg+xml');notify('Section drawing exported.');});
$('export-stl').addEventListener('click',()=>{const data=viewer?.exportSTL();if(data){download(data,`cathedral-step-${pad(selected)}-${array?parameters.bays+'-folded-bays':'folded-bay'}.stl`,'model/stl');notify('Watertight folded volume exported in Z-up coordinates.');}});
rebuild();
// The section and its controls remain usable if WebGL or the 3D CDN is unavailable.
import('./section-viewer.js?v=3').then(({createBayViewer})=>{
  viewer=createBayViewer($('bay-view'));viewer.update(study.frames[selected],study.bounds,parameters,array);showIntegrity();
}).catch(error=>{$('model-loading').textContent='The 3D view could not load. Reload with an internet connection to load Three.js. The 2D section remains available.';console.error(error);});
