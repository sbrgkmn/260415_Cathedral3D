import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildFoldedBay, repeatFoldedBay } from './folded-bay.mjs';
import { encodeBinarySTL } from './polarity.mjs';
import { meshIntegrity } from './section-solid.mjs';

export function createBayViewer(element) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0xf0f1eb,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled=true;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,5000);
  camera.position.set(190,140,240);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.12;controls.minZoom=.2;controls.maxZoom=8;
  controls.maxPolarAngle=Math.PI*.5;
  const light=new THREE.HemisphereLight(0xffffff,0x8b927f,2.3);scene.add(light);
  const sun=new THREE.DirectionalLight(0xffffff,3.0);sun.position.set(-100,200,180);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-220;sun.shadow.camera.right=220;
  sun.shadow.camera.top=220;sun.shadow.camera.bottom=-220;sun.shadow.camera.far=650;
  sun.shadow.bias=-.0001;sun.shadow.normalBias=.035;scene.add(sun);
  const material=new THREE.MeshStandardMaterial({color:0xd5d9cc,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const capMaterial=material.clone();capMaterial.color.setHex(0xb7c1ab);
  const edgeMaterial=new THREE.LineBasicMaterial({color:0x5b6651,transparent:true,opacity:.24});
  const creaseMaterial=new THREE.LineBasicMaterial({color:0x4d6044,transparent:true,opacity:.56});
  const group=new THREE.Group();scene.add(group);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),new THREE.ShadowMaterial({opacity:.13}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.15;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(500,40,0xcfd4c6,0xdce0d4);grid.material.transparent=true;grid.material.opacity=.35;grid.position.y=-.18;scene.add(grid);
  let geometry,edges,creases,bounds,meshData,report,raf,frameSignature,outline,ribs,showFoldLines=true;
  function render() {
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=undefined;controls.update();renderer.render(scene,camera);});
  }
  controls.addEventListener('change',render);
  function fit() {
    if(!bounds)return;
    const center=bounds.getCenter(new THREE.Vector3()), size=bounds.getSize(new THREE.Vector3());
    const direction=camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,size.length()*3);
    camera.zoom=1;camera.lookAt(center);camera.updateMatrixWorld();
    const projected=new THREE.Box3();
    for(const x of [bounds.min.x,bounds.max.x]) for(const y of [bounds.min.y,bounds.max.y]) for(const z of [bounds.min.z,bounds.max.z]) projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    const aspect=Math.max(1,element.clientWidth)/Math.max(1,element.clientHeight);
    const half=Math.max((projected.max.y-projected.min.y)/2,(projected.max.x-projected.min.x)/(2*aspect))*1.20;
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;
    camera.updateProjectionMatrix();controls.update();render();
  }
  function update(frame,commonBounds,p,array) {
    const signature=JSON.stringify([frame.points,frame.carrierPoints,p,array]);
    if(signature!==frameSignature) {
      geometry?.dispose();edges?.dispose();creases?.dispose();
      meshData=repeatFoldedBay(buildFoldedBay(frame,p),p,array);
      report=meshIntegrity(meshData);
      geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(meshData.vertices.flat(),3));
      geometry.setIndex(meshData.faces.flat());geometry.computeVertexNormals();
      let groupStart=0,groupMaterial=meshData.faceKinds[0]==='shell'?0:1;
      for(let i=1;i<=meshData.faceKinds.length;i++) {
        const nextMaterial=meshData.faceKinds[i]==='shell'?0:1;
        if(i===meshData.faceKinds.length||nextMaterial!==groupMaterial){geometry.addGroup(groupStart*3,(i-groupStart)*3,groupMaterial);groupStart=i;groupMaterial=nextMaterial;}
      }
      edges=new THREE.WireframeGeometry(geometry);
      creases=new THREE.BufferGeometry();creases.setAttribute('position',new THREE.Float32BufferAttribute(meshData.creaseEdges.flatMap(edge=>edge.flatMap(i=>meshData.vertices[i])),3));
      frameSignature=signature;
    }
    group.clear();
    const mesh=new THREE.Mesh(geometry,[material,capMaterial]);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    outline=new THREE.LineSegments(edges,edgeMaterial);outline.visible=showFoldLines;group.add(outline);
    ribs=new THREE.LineSegments(creases,creaseMaterial);ribs.visible=showFoldLines;group.add(ribs);
    const length=(array?p.bays:1)*p.depth+(array?p.bays-1:0)*p.gap;
    const nextBounds=new THREE.Box3(new THREE.Vector3(commonBounds.minX*(1+.30*p.buttress),0,-length/2),new THREE.Vector3(commonBounds.maxX*(1+.30*p.buttress),commonBounds.maxY,length/2));
    const shouldFit=!bounds||!bounds.equals(nextBounds);bounds=nextBounds;
    if(shouldFit)fit();else render();
  }
  function exportSTL() {
    if(!geometry||!report.watertight)return null;
    // Rotate Y-up coordinates to Z-up (a rotation, preserving triangle winding).
    return encodeBinarySTL({vertices:meshData.vertices.map(([x,y,z])=>[x,-z,y]),faces:meshData.faces});
  }
  new ResizeObserver(()=>{renderer.setSize(Math.max(1,element.clientWidth),Math.max(1,element.clientHeight));fit();}).observe(element);
  return {update,fit,exportSTL,integrity:()=>report,setView(view){const direction=view==='side'?new THREE.Vector3(1,0,0):view==='top'?new THREE.Vector3(0,1,.0001):new THREE.Vector3(190,140,240).normalize();camera.position.copy(controls.target).addScaledVector(direction,500);fit();},setFoldLines(show){showFoldLines=show;if(outline)outline.visible=show;if(ribs)ribs.visible=show;render();},setCutaway(show){for(const mat of [material,capMaterial,edgeMaterial,creaseMaterial]){mat.clippingPlanes=show?[new THREE.Plane(new THREE.Vector3(0,0,-1),0)]:[];mat.clipShadows=true;mat.needsUpdate=true;}render();}};
}
