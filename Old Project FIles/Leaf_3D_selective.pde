// an example for using controlP5 controllers always placed on top 
// of the display window in combination with peasycam.

import peasy.*;
import controlP5.*;
import processing.opengl.*;
import toxi.geom.*;
import toxi.math.*;
import toxi.processing.*;
import toxi.geom.mesh.*;


/*
Algorithm generates vertical topological models, two types of recursions are set, one that divides the form vertically,

the second does topological modeling. Selective triangulation is needed so that not every triangle splits but edge

information must be maintained.


*/
PeasyCam cam;
ControlP5 cp5;
float mass_h = 25;
float mass_d = 25;
float mass_w = 25;

float Pos_A = 0.5;
float Amp_A = 0.5;
float Rot_A = 0.5;
float Pos_B = 0.5;
float Amp_B = 0.5;
float Rot_B = 0.5;
float Pos_C = 0.5;
float Amp_C = 0.5;
float Rot_C = 0.5;

float div_threshold = 100;

float Con_Pos_A = 0.5;
float Con_Rot_A = 0.5;
float Con_Amp_A = 0.5;

float Con_Pos_B = 0.5;
float Con_Rot_B = 0.5;
float Con_Amp_B = 0.5;

float Con_Pos_C = 0.5;
float Con_Rot_C = 0.5;
float Con_Amp_C = 0.5;

int Recursion = 1;
int Recursion_2 = 0;
float Normal_len = 0;

float Top_1 = 0.5;
float Top_2 = 0.5;
float Top_3 = 0.5;

ArrayList<Triangle> Triangles;
TriangleMesh mesh;
Point O;

void setup() {

  size(1600,1000,OPENGL);
  smooth();
  cam = new PeasyCam(this, 100);
  cam.setMinimumDistance(50);
  cam.setMaximumDistance(500);
  
  Console();
  
  Morphology3D();

}

void controlEvent(ControlEvent theEvent) {
  Morphology3D();  
 
  
}


void Morphology3D(){
  Triangles = new ArrayList<Triangle>();
  mesh = new TriangleMesh();
  //store form into a triangle list, display triangles
  O = new Point(new Vec3D(), new Vec3D(), true);
  //ex pole
  Point A = new Point(O, new Vec3D(mass_d,0,0), new Vec3D(1,0,0), true); 
  //con pole
  Point B = new Point(O, new Vec3D(-mass_d,0,0), new Vec3D(-1,0,0), true); 
  //side
  Point C = new Point(O, new Vec3D(0,mass_w,0), new Vec3D(0,1,0), true); 
  //top
  Point D = new Point(O, new Vec3D(0,0, mass_h), new Vec3D(0,0,1), true);
  
  //subdivide_sel(new Triangle(A,D, C, true), O, 0.5,0.5,0.5, true, 1, 0);
  subdivide(new Triangle(B,D, C, true, false, false, false), O, 0.5,0.5,0.5, true, 1, 0);
  
  //mesh.add(new Triangle(A,D, C, true));
  
  
  
  //mesh.add(new Triangle(C,D, B, true));  
}

void draw() { 
  if (cp5.window(this).isMouseOver()) {
    cam.setActive(false);
  } else {
    cam.setActive(true);
  }
  
  defineLights();
  
  background(255);
  pushMatrix();
  
  // your code here
  noFill();
  stroke(0);
  
  
  O.show();
  for(Triangle T: Triangles){
    T.show();  
  }
  
  strokeWeight(1);  
  stroke(0);
  noFill();
  translate(0,0,50);
  box(100);
 
  
  popMatrix();
   
  gui();
}

void defineLights() {
  directionalLight(200, 200, 200, 100, 150, -100);
  ambientLight(160, 160, 160);
  /*
  // Orange point light on the right
  pointLight(150,  100,  0,     // Color
  300,  -200,  0); // Position

  // Blue directional light from the left
  directionalLight(0,  102,  255,  // Color
  1,  0,  0);    // The x-, y-, z-axis direction

  // Yellow spotlight from the front
  spotLight(255,  255,  109,     // Color
  0,  40,  200,        // Position
  0,  -0.5f,  -0.5f,   // Direction
  PI / 2,  2);       // Angle, concentration
  */
}

void keyPressed(){
  if(key == 's'){
    float random = random(0, 1000);
    mesh.saveAsSTL( sketchPath( "Cathedral_"+Float.toString(random) +".stl" ));  
  }  
}

void gui() {
   hint(DISABLE_DEPTH_TEST);
   PMatrix3D currCameraMatrix = new PMatrix3D(((PGraphics3D)g).camera);
   camera();
   cp5.draw();
   ((PGraphics3D)g).camera = currCameraMatrix;
   hint(ENABLE_DEPTH_TEST);
}

