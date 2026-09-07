float pt_size = 1;

class Point extends Vec3D{
  Vec3D pol;
  Vec3D origin; 
  boolean state;
  
  
  Point(){
    super(new Vec3D());  
  }
  
  Point(Vec3D ori, Vec3D p, boolean b){
    super(p.x, p.y, p.z);
    origin = ori; 
    state = b; 
    pol = new Vec3D();
    pol = p.sub(ori).normalize();
  }
  
   Point(Vec3D o, Vec3D p, Vec3D PP, boolean b){
    super(p.x, p.y, p.z);
    origin = o; 
    state = b;
    pol = PP;
  }
  
  
  void showPolarity(){
    float size = 10;
    stroke(0,0,255);
    strokeWeight(1);
    line(this.x, this.y, this.z, this.x + pol.x*Normal_len, this.y + pol.y*Normal_len, this.z + pol.z*Normal_len); 
  }
  
  void show(){
    color c = (state) ? color(0) : color(120);
    fill(c);
    noStroke();//stroke(0);
    //strokeWeight(1);     
    sphereDetail(8);
    pushMatrix();
    translate(this.x, this.y, this.z);
    //sphere(pt_size/2);  
    popMatrix();
    showPolarity();
  }  
}
