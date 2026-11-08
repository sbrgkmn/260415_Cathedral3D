// Scale-independent triangle quality: 1 equilateral, approaching 0 for slivers.
export function triangleQuality(points,plan=false){
 const [a,b,c]=points,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
 const twiceArea=plan?Math.abs(u[0]*v[1]-u[1]*v[0]):Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
 const sum=points.reduce((s,a,i)=>s+a.slice(0,plan?2:3).reduce((t,x,j)=>t+(x-points[(i+1)%3][j])**2,0),0);
 return sum>1e-12?2*Math.sqrt(3)*twiceArea/sum:0;
}
