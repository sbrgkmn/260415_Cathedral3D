void V(Vec3D A){
  vertex(A.x, A.y, A.z);  
}

void show(Face F){
  //color c = (state) ? color(120) : color(200);
  fill(200);
  stroke(0);
  strokeWeight(1);     
  beginShape(TRIANGLES);
  V(F.a);
  V(F.b);
  V(F.c);
  endShape(CLOSE);  
  
  
}

void showLine(Vec3D A, Vec3D B, boolean b){
  color c = (b) ? color(255,0,0) : color(0,255,0);
  stroke(c);
  strokeWeight(1);
  line(A.x, A.y, A.z, B.x, B.y, B.z);  
}
