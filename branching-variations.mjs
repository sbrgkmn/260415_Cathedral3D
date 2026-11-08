// Compact vertical families: broad continuous cores and short subordinate buttresses.
export const ARCHITECTURAL_FAMILIES=['Central spire','Twin spires','Buttressed tower','Radial crown'];
const families=[
 {morphology:2,length:24,height:235,falloff:.38,branchWidth:24},
 {morphology:1,length:32,height:170,falloff:1.16,branchWidth:26},
 {morphology:2,length:38,height:245,falloff:.55,branchWidth:26},
 {morphology:3,length:26,height:225,falloff:.68,branchWidth:22},
];
export function variationRecipes(base){return Array.from({length:16},(_,i)=>{
 const row=Math.floor(i/4),c=i%4,family=families[row];
 return {...base,...family,
  balanceMode:1,leftRight:c===3?.56:.5,frontBack:c===3?.6:.5,
  levels:1,nave:1,proportionLock:0,packing:.2,angle:100,
  length:family.length*[.85,1.05,.9,1.2][c],
  height:family.height*[.95,1.05,1.25,1.1][c],
  branchWidth:family.branchWidth*[1,1.1,.95,1.05][c],
  growth:row===2?1:[0,1,0,1][c],spacing:row===2?13:12,
  spurAngle:[80,75,85,65][c],spurRatio:.45,
  // Retain the tree's ridge topology while widening its body and shortening projections.
  branchTaper:.5,branchReach:.18,descent:.52,widthFill:1,
  spineWidth:[1.4,1.65,1.5,1.75][c],projectionWidth:1.15,
  // Use a local threshold instead of inheriting a large study threshold that erases detail.
  marginSteps:1,triangleSize:family.branchWidth*.8,marginSize:[.24,.32,.28,.36][c],
  marginMin:family.branchWidth*.12,
  verticalSteps:Math.max(1,Math.min(2,base.verticalSteps??1)),
  tipNose:.35,baseRiseRatio:.3,
 };
});}
