class Triangle{
  Point A;
  Point B;
  Point C;
  boolean state;
  Vec3D center;
  
  boolean dir_A = false;
  boolean dir_B = false;
  boolean dir_C = false;
  
  Triangle(Point AA, Point BB, Point CC, boolean b){
    A = AA;
    B = BB;
    C = CC; 
    state = b;
    center = getCenter();  
  } 
  
  Triangle(Point AA, Point BB, Point CC, boolean b, boolean d_A, boolean d_B, boolean d_C){
    A = AA;
    B = BB;
    C = CC; 
    state = b;
    center = getCenter();  
    dir_A = d_A;
    dir_B = d_B;
    dir_C = d_C;
  } 
  
  void show(){
    color c = (state) ? color(0) : color(200);
    fill(c);
    //noStroke();
    stroke(0);
    strokeWeight(1);     
    beginShape(TRIANGLES);
    V(A);
    V(B);
    V(C);
    endShape(CLOSE);  
    
    A.show();
    B.show();
    C.show(); 
    showDirections();
    /*
    showLine(A.interpolateTo(B,0.5), center, dir_A);
    showLine(B.interpolateTo(C,0.5), center, dir_B);   
    showLine(C.interpolateTo(A,0.5), center, dir_C);  
   */ 
  }
  
  void showDirections(){
    Vec3D A_p = A.interpolateTo(center, 0.2);
    Vec3D B_p = B.interpolateTo(center, 0.2);
    Vec3D C_p = C.interpolateTo(center, 0.2);
    Vec3D D = C_p.interpolateTo(A_p, 0.8);
    showLine(A_p, B_p, dir_A);
    showLine(B_p, C_p, dir_B);
    showLine(C_p, D, dir_C);
  }
  
  float getArea(){
    return abs(A.x*B.y + B.x*C.y + C.x*A.y - A.x*C.y- C.x*B.y - B.x*A.y)*0.5;      
  }
  
  Vec3D getCenter(){
    return new Vec3D((A.x+B.x+C.x)/3, (A.y+B.y+C.y)/3,(A.z+B.z+C.z)/3);    
    
  }
}
