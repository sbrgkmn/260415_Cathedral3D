// Compact vertical families: broad continuous cores and short subordinate buttresses.
export const TOWER_FAMILIES=['Central spire','Twin spires','Buttressed tower','Radial crown'];
const families=[
 {morphology:2,length:24,height:235,falloff:.38,branchWidth:24},
 {morphology:1,length:32,height:170,falloff:1.16,branchWidth:26},
 {morphology:2,length:38,height:245,falloff:.55,branchWidth:26},
 {morphology:3,length:26,height:225,falloff:.68,branchWidth:22},
];
export function towerVariationRecipes(base){return Array.from({length:16},(_,i)=>{
 const row=Math.floor(i/4),c=i%4,family=families[row];
 return {...base,...family,generator:0,
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



export const ARCHITECTURAL_FAMILIES=['Central spire','Twin spires','Buttressed tower','Radial crown','Branching nave','Double transept','Tiered crown','Asymmetric tower'];
export const LEAF_REGIMES=['Compact','Lateral branches','Tall','Recursive branches'];
// Preserve the established tower families. E/C refines their branch scaffold,
// rather than replacing the scaffold with a subdivided pyramid.
export function variationRecipes(base){
 const original=towerVariationRecipes(base);
 const extra=Array.from({length:16},(_,i)=>{
  const row=Math.floor(i/4),c=i%4;
  const seed=original[[1,2,3,0][row]*4+c];
  return {...seed,generator:0,morphology:[1,2,3,2][row],
   length:[58,48,34,36][row]*[.9,1,1.1,1.15][c],
   stemLength:[65,38,30,42][row],height:[195,260,245,280][row]*[.9,1,1.18,1.06][c],
   growth:c===3?2:1,levels:1,spacing:[17,14,15,13][row],
   spurRatio:[.5,.6,.48,.55][row],branchReach:[.3,.36,.3,.28][row],
   spurAngle:[80,65,85,70][c],growthLength:.6,spacingRatio:.4,
   leftRight:row===3?[.6,.65,.58,.7][c]:.5,frontBack:row===3?.62:.5,
   marginSteps:1,verticalSteps:1,
  };
 });
 return [...original,...extra];
}
