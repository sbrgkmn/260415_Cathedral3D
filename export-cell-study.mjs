import {mkdir,writeFile} from 'node:fs/promises';
import {buildSections} from './cell-grammar.mjs';
import {sectionSVG} from './cell-drawing.mjs';
import {buildFoldedBay,repeatFoldedBay} from './cell-bay.mjs';
import {meshIntegrity} from './section-solid.mjs';
import {encodeBinarySTL} from './polarity.mjs';
import {decodeBinarySTL} from './stl.mjs';
const study=buildSections(),last=study.frames.at(-1),directory=new URL('./output/cell-study/',import.meta.url);
await mkdir(directory,{recursive:true});
const report={parameters:study.parameters,rules:study.rules,stages:[],exports:{}};
for(const f of study.frames){const integrity=meshIntegrity(buildFoldedBay(f,study.parameters));if(!integrity.watertight)throw new Error(`Stage ${f.index} is not closed`);report.stages.push({step:f.index,rule:f.kind,cells:f.cells.length,voids:f.openingCount,sectionArea:f.area,...integrity});}
for(const [name,array] of [['cell-bay',false],['cell-array',true]]){
  const mesh=repeatFoldedBay(buildFoldedBay(last,study.parameters),study.parameters,array),buffer=encodeBinarySTL({vertices:mesh.vertices.map(([x,y,z])=>[x,-z,y]),faces:mesh.faces});
  const reportSTL=meshIntegrity(decodeBinarySTL(buffer,name+'.stl'));if(!reportSTL.watertight)throw new Error(`Export ${name} is not closed`);
  await writeFile(new URL(name+'.stl',directory),Buffer.from(buffer));report.exports[name]=reportSTL;
}
for(const [name,cells] of [['material-section',false],['cell-partitions',true]])await writeFile(new URL(name+'.svg',directory),sectionSVG(last,study.bounds,{cells}));
await writeFile(new URL('cell-lineage.json',directory),JSON.stringify({frames:study.frames.map(f=>({step:f.index,kind:f.kind,points:f.points,cells:f.cells,seams:f.seams}))},null,2));
let sequence='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 340" width="1400" height="340"><rect width="100%" height="100%" fill="white"/><text x="20" y="28" font-family="Arial,sans-serif" font-size="15">RECURSIVE E/C CELLS · THREE CYCLES</text>';
for(const f of study.frames){sequence+=`<text x="${200*f.index+20}" y="57" font-family="Arial,sans-serif" font-size="12">${f.index} · ${f.kind==='S'?'SEED':f.kind}</text>`+sectionSVG(f,study.bounds,{mini:true}).replace('<svg ',`<svg x="${200*f.index+12}" y="70" width="176" height="220" `)+`<text x="${200*f.index+20}" y="313" font-family="Arial,sans-serif" font-size="12">${f.cells.length} cells / ${f.openingCount} voids</text>`;}
await writeFile(new URL('development-sequence.svg',directory),sequence+'</svg>');
await writeFile(new URL('mesh-validation.json',directory),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.exports,null,2));
