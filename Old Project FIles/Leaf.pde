float stem_offset = 0.01;

ArrayList<Triangle> Selective_Subdivide(Triangle T, boolean polarity, float dir){
  //check edge length AB
  Point AB;
  Point BC;
  Point CA;
  boolean DIV_A = true;
  boolean DIV_B = true;
  boolean DIV_C = true;
  if(T.A.distanceTo(T.B) > div_threshold){
    //divide edge
    AB = (polarity) ? EC(T.A, T.B, (dir > 0) ? Pos_A : 1-Pos_A , Amp_A, (dir > 0) ? Rot_A : 1-Rot_A,  (dir > 0)) : EC(T.A, T.B, (dir > 0) ? Con_Pos_A : 1-Con_Pos_A, Con_Amp_A, (dir > 0) ? Con_Rot_A : 1-Con_Rot_A,  (dir > 0));
  }else{//assing A
    AB = T.A; 
    DIV_A = false;
    //do not create A, AB, AC  
  }  
  if(T.B.distanceTo(T.C) > div_threshold){
    //divide edge
    BC = (polarity) ? EC(T.B, T.C, (dir > 0) ? 1-Pos_B : Pos_B , Amp_B, (dir > 0) ? 1-Rot_B : Rot_B,  (dir > 0)) : EC(T.B, T.C, (dir > 0) ? 1-Con_Pos_B : Con_Pos_B, Con_Amp_B, (dir > 0) ? 1-Con_Rot_B : Con_Rot_B,  (dir > 0));   
  }else{//assing A
    BC = T.B;
    DIV_B = false;  
    //do not create B, BC, AB   
  }
  if(T.C.distanceTo(T.A) > div_threshold){
    //divide edge
    CA = (polarity) ? EC(T.C, T.A, (dir > 0) ? Pos_C : 1-Pos_C , Amp_C, (dir > 0) ? Rot_C : 1-Rot_C,  (dir > 0)) : EC(T.C, T.A, (dir > 0) ? Con_Pos_C : 1-Con_Pos_C, Con_Amp_C, (dir > 0) ? Con_Rot_C : 1-Con_Rot_C,  (dir > 0));
  }else{//assing A
    CA = T.C;
    DIV_C = false;  
    //do not create C, AC, BC
  }
  ArrayList<Triangle> new_T = new ArrayList<Triangle>();
  new_T.add(new Triangle(BC, CA, AB, true));
  if(DIV_A){new_T.add(new Triangle(T.A, AB, CA, true));};
  if(DIV_B){new_T.add(new Triangle(AB, T.B, BC, true));};
  if(DIV_C){new_T.add(new Triangle(CA, BC, T.C, true));};
  
  return new_T; 
}

void subdivide_sel(Triangle T, Vec3D Origin, float p, float a, float r, boolean polarity, float dir, int C){
  if(C < Recursion){
    C++;
    ArrayList<Triangle> divided = Selective_Subdivide(T, polarity, dir);
    int count = 0;
    for(Triangle t: divided){
      subdivide_sel(t, Origin, p, a, r, !polarity, (count == 0) ? -dir : dir,C);   
      count++;
    }    
  }else{
    Triangles.add(T);   
  } 
}


void subdivide(Triangle T, Vec3D Origin, float p, float a, float r, boolean polarity, int C){
  if(C < Recursion){//T.getArea() > Recursion){//
  
    C++;
    /*
    Point AB = Expand(T.A, T.B, p , a, r, dir);
    Point AC = Expand(T.C, T.A, p , a, r, dir);
    Point BC = Expand(T.B, T.C, p , a, r, dir);
    

    Point AB = (polarity) ? Expand(T.A, T.B, (dir > 0) ? Pos_A : 1-Pos_A , Amp_A, (dir > 0) ? Rot_A : 1-Rot_A, dir) : Contract(T.A, T.B, Origin, (dir > 0) ? Con_Pos_A : 1-Con_Pos_A, Con_Amp_A, (dir > 0) ? Con_Rot_A : 1-Con_Rot_A, dir);
    Point BC = (polarity) ? Expand(T.B, T.C, (dir > 0) ? 1-Pos_A : Pos_A , Amp_A, (dir > 0) ? 1-Rot_A : Rot_A, dir) : Contract(T.B, T.C, Origin, (dir > 0) ? 1-Con_Pos_A : Con_Pos_A, Con_Amp_A, (dir > 0) ? 1-Con_Rot_A : Con_Rot_A, dir);
    Point AC = (polarity) ? Expand(T.C, T.A, (dir > 0) ? Pos_C : 1-Pos_C , Amp_C, (dir > 0) ? Rot_C : 1-Rot_C, dir) : Contract(T.C, T.A, Origin, (dir > 0) ? Con_Pos_C : 1-Con_Pos_C, Con_Amp_C, (dir > 0) ? Con_Rot_C : 1-Con_Rot_C, dir);
    */
    
    Point AB = (polarity) ? EC(T.A, T.B, (T.dir_A) ? Pos_A : 1-Pos_A , Amp_A, (T.dir_A) ? Rot_A : 1-Rot_A,  (T.dir_A)) : EC(T.A, T.B, (T.dir_A) ? Con_Pos_A : 1-Con_Pos_A, Con_Amp_A, (T.dir_A) ? Con_Rot_A : 1-Con_Rot_A,  (T.dir_A));
    Point BC = (polarity) ? EC(T.B, T.C, (T.dir_B) ? 1-Pos_B : Pos_B , Amp_B, (T.dir_B) ? 1-Rot_B : Rot_B,  (T.dir_B)) : EC(T.B, T.C, (T.dir_B) ? 1-Con_Pos_B : Con_Pos_B, Con_Amp_B, (T.dir_B) ? 1-Con_Rot_B : Con_Rot_B,  (T.dir_B));
    Point AC = (polarity) ? EC(T.C, T.A, (T.dir_C) ? Pos_C : 1-Pos_C , Amp_C, (T.dir_C) ? Rot_C : 1-Rot_C,  (T.dir_C)) : EC(T.C, T.A, (T.dir_C) ? Con_Pos_C : 1-Con_Pos_C, Con_Amp_C, (T.dir_C) ? Con_Rot_C : 1-Con_Rot_C,  (T.dir_C));
    /*
    subdivide(new Triangle(BC, AC, AB, !T.state,  T.dir_A,  T.dir_B,  T.dir_C), Origin, p, a, r, !polarity, -dir, C); 
    subdivide(new Triangle(T.A, AB, AC, T.state,  T.dir_A, !T.dir_B, !T.dir_C), Origin, p, a, r, !polarity,  dir, C); 
    subdivide(new Triangle(AB, T.B, BC, T.state, !T.dir_A,  T.dir_B, !T.dir_C), Origin, p, a, r, !polarity,  dir, C); 
    subdivide(new Triangle(AC, BC, T.C, T.state, !T.dir_A, !T.dir_B,  T.dir_C), Origin, p, a, r, !polarity,  dir, C); 
    */
    subdivide(new Triangle(BC, AC, AB, !T.state,  (T.state)?!T.dir_A :  T.dir_A,  (T.state)?  T.dir_B : !T.dir_B, (T.state) ?  T.dir_C : !T.dir_C), Origin, p, a, r, !polarity, -dir, C); 
    subdivide(new Triangle(T.A, AB, AC, T.state,  (T.state)? T.dir_A : !T.dir_A,  (T.state)? !T.dir_B :  T.dir_B, (T.state) ? !T.dir_C :  T.dir_C), Origin, p, a, r, !polarity,  dir, C); 
    subdivide(new Triangle(AB, T.B, BC, T.state,  (T.state)?!T.dir_A :  T.dir_A,  (T.state)?  T.dir_B : !T.dir_B, (T.state) ? !T.dir_C :  T.dir_C), Origin, p, a, r, !polarity,  dir, C); 
    subdivide(new Triangle(AC, BC, T.C, T.state,  (T.state)? T.dir_A : !T.dir_A,  (T.state)? !T.dir_B :  T.dir_B, (T.state) ?  T.dir_C : !T.dir_C), Origin, p, a, r, !polarity,  dir, C); 
    
  }else{
    if(C < Recursion_2+Recursion){
      C++;
      Point AB = (polarity) ? EC(T.A, T.B, (dir > 0) ? Top_1 : 1-Top_1,Top_2, Top_3, (dir > 0)) : EC(T.A, T.B,  (dir > 0) ? Top_1 : 1-Top_1,Top_2, Top_3, (dir > 0));
      Point BC = (polarity) ? EC(T.B, T.C, (dir > 0) ? 1-Top_1: Top_1 ,Top_2, Top_3, (dir > 0)) : EC(T.B, T.C,  (dir > 0) ? 1-Top_1: Top_1,Top_2, Top_3, (dir > 0));
      Point AC = (polarity) ? EC(T.C, T.A, (dir > 0) ? Top_1 : 1-Top_1,Top_2, Top_3, (dir > 0)) : EC(T.C, T.A,  (dir > 0) ? Top_1 : 1-Top_1,Top_2, Top_3, (dir > 0));
      
      subdivide(new Triangle(BC, AC, AB, true), Origin, p, a, r, !polarity, -dir, C); 
      subdivide(new Triangle(T.A, AB, AC, true), Origin, p, a, r, !polarity, dir, C); 
      subdivide(new Triangle(AB, T.B, BC, true), Origin, p, a, r, !polarity, dir, C); 
      subdivide(new Triangle(AC, BC, T.C, true), Origin, p, a, r, !polarity, dir, C); 
    }else{    
      mesh.addFace(T.A, T.B, T.C);    
      Triangles.add(T);   
    }
  }  
}

Point EC(Point A, Point B, float p, float i, float r, boolean b){
  Vec3D origin = A.interpolateTo(B, p);
  Vec3D pol = A.pol.interpolateTo(B.pol, r).normalize();
  Vec3D pos = origin.add(pol.scale(A.distanceTo(B)*i));
  return new Point(origin, pos, pol, b); 
}


Point Contract(Point A, Point B, Vec3D target, float pos, float inten, float rot,  float dd){
  Vec3D origin = A.interpolateTo(B, pos);
  //Vec3D candidate_pol = new Vec3D(0,0,-1);//A.pol.interpolateTo(B.pol, (rot)).normalize();
  Vec3D candidate_pol = A.pol.interpolateTo(B.pol, (rot));
  candidate_pol.normalize();
  //Vec2D dir = origin.sub(target).normalize();
  Vec3D position = origin.add(candidate_pol.scale((origin.distanceTo(target) - stem_offset)*inten));      
  Point new_pt = new Point(origin, position, candidate_pol, false); 
  //new_pt.show();
  return new_pt;   
}

Point Expand(Point A, Point B, float pos, float inten, float rot, float dd){
  Vec3D origin = A.interpolateTo(B, pos);   
  Vec3D dir =  B.sub(A).normalize();
  //float angle = radians(getAngle(A.pol, B.pol)+180)*dd*rot;
  Vec3D candidate_pol = A.pol. interpolateTo(B.pol, rot);//dir.rotate(angle); //new Vec3D(0,0,1); //
  candidate_pol.normalize();
  Vec3D position = origin.add(candidate_pol.scale(A.distanceTo(B)*inten));      
  Point new_pt = new Point(origin, position, candidate_pol, true);
  //new_pt.show();
  return new_pt; 
}
