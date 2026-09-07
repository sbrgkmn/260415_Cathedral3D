import {mkdir,writeFile} from 'node:fs/promises';
import {buildSections} from './section-grammar.mjs';
import {sectionSVG} from './section-drawing.mjs';
import {buildFoldedBay,repeatFoldedBay} from './folded-bay.mjs';
import {meshIntegrity} from './section-solid.mjs';
import {encodeBinarySTL} from './polarity.mjs';
import {decodeBinarySTL} from './stl.mjs';

const study=buildSections(),frame=study.frames.at(-1),directory=new URL('./output/section-study/',import.meta.url);
await mkdir(directory,{recursive:true});
const report={parameters:study.parameters,rules:study.rules,stages:[],exports:{}};
for(const frame of study.frames)report.stages.push({step:frame.index,title:frame.title,rule:frame.kind,sectionArea:frame.area,...meshIntegrity(buildFoldedBay(frame,study.parameters))});
for(const [name,array] of [['nave-bay',false],['nave-array',true]]) {
  const mesh=repeatFoldedBay(buildFoldedBay(frame,study.parameters),study.parameters,array);
  const data=encodeBinarySTL({vertices:mesh.vertices.map(([x,y,z])=>[x,-z,y]),faces:mesh.faces});
  const decoded=decodeBinarySTL(data,name+'.stl'),validation=meshIntegrity(decoded);
  if(!validation.watertight)throw new Error(`${name}: exported STL failed closed-volume validation`);
  await writeFile(new URL(name+'.stl',directory),Buffer.from(data));report.exports[name]=validation;
}
await writeFile(new URL('nave-section.svg',directory),sectionSVG(frame,study.bounds));
const cell=200,top=65,height=320;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cell*study.frames.length}" height="${height}" style="max-width:100%;height:auto" viewBox="0 0 ${cell*study.frames.length} ${height}"><rect width="100%" height="100%" fill="white"/><text x="20" y="25" font-family="Arial,sans-serif" font-size="13" letter-spacing="2">CATHEDRAL / RECURSIVE SECTION GRAMMAR</text><text x="20" y="46" font-family="Arial,sans-serif" font-size="10" fill="#747970">E: branch outward and raise a pinnacle. C: carve arches and pinch pinnacle collars. All sections share one scale.</text>`;
for(const f of study.frames) {
  const drawing=sectionSVG(f,study.bounds,{mini:true,id:'export-'+f.index}).replace('<svg ',`<svg x="${cell*f.index+12}" y="${top+22}" width="${cell-24}" height="190" `);
  svg+=`<text x="${cell*f.index+15}" y="${top+8}" font-family="Arial,sans-serif" font-size="11">${String(f.index).padStart(2,'0')} / ${f.kind==='S'?'SEED':f.kind+' '+Math.round(f.amount*100)+'%'}</text>${drawing}<text x="${cell*f.index+15}" y="290" font-family="Arial,sans-serif" font-size="10">${f.title}</text>`;
}
await writeFile(new URL('development-sequence.svg',directory),svg+'</svg>');
await writeFile(new URL('mesh-validation.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.exports,null,2));
