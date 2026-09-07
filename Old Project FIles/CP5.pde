void Console(){
  cp5 = new ControlP5(this);
  cp5.setAutoDraw(false);
  cp5.setColorCaptionLabel(color(0));
  int button_x = 10;
  int button_y = 0; 
  int button_height = 10;
  int gap = 11;
  int switch_size = 40; 
  
  
  
  cp5.addSlider("Pos_A")
     .setPosition(button_x,button_y+gap*2)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Pos A");
  
  cp5.addSlider("Amp_A")
     .setPosition(button_x,button_y+gap*3)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Amp A");
  
  cp5.addSlider("Rot_A")
     .setPosition(button_x,button_y+gap*4)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Rot A");
  
  cp5.addSlider("Pos_B")
     .setPosition(button_x,button_y+gap*5)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Pos B");
  
  cp5.addSlider("Amp_B")
     .setPosition(button_x,button_y+gap*6)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Amp B");
  
  cp5.addSlider("Rot_B")
     .setPosition(button_x,button_y+gap*7)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Rot B");
  
   cp5.addSlider("Pos_C")
     .setPosition(button_x,button_y+gap*8)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Pos C");
  
  cp5.addSlider("Amp_C")
     .setPosition(button_x,button_y+gap*9)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Amp C");
  
  cp5.addSlider("Rot_C")
     .setPosition(button_x,button_y+gap*10)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Rot C");  
  
   cp5.addSlider("Recursion")
     .setPosition(button_x,button_y+gap*11)
     .setRange(0,10)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Recursion");
   
   cp5.addSlider("Normal_len")
     .setPosition(button_x,button_y+gap*12)
     .setRange(0,50)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Normals");
     
   cp5.addSlider("mass_h")
     .setPosition(button_x,button_y+gap*13)
     .setRange(0,100)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Mass H");
     
   cp5.addSlider("mass_d")
     .setPosition(button_x,button_y+gap*14)
     .setRange(0,100)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Mass D");
   
   cp5.addSlider("mass_w")
     .setPosition(button_x,button_y+gap*15)
     .setRange(0,100)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Mass W");
     
   
   button_y = button_y+gap*16;   
     
   cp5.addSlider("Con_Pos_A")
     .setPosition(button_x,button_y+gap)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Pos A");  
   
   cp5.addSlider("Con_Amp_A")
     .setPosition(button_x,button_y+gap*2)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Amp A");
   
   cp5.addSlider("Con_Rot_A")
     .setPosition(button_x,button_y+gap*3)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Rot A");
   
    cp5.addSlider("Con_Pos_B")
     .setPosition(button_x,button_y+gap*4)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Pos B");  
   
   cp5.addSlider("Con_Amp_B")
     .setPosition(button_x,button_y+gap*5)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Amp B");
   
   cp5.addSlider("Con_Rot_B")
     .setPosition(button_x,button_y+gap*6)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Rot B");
     
   cp5.addSlider("Con_Pos_C")
     .setPosition(button_x,button_y+gap*7)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Pos C");  
   
   cp5.addSlider("Con_Amp_C")
     .setPosition(button_x,button_y+gap*8)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Amp C");
   
   cp5.addSlider("Con_Rot_C")
     .setPosition(button_x,button_y+gap*9)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Con Rot C");
   
   cp5.addSlider("Recursion_2")
     .setPosition(button_x,button_y+gap*10)
     .setRange(0,10)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Recursion_2");
   
   cp5.addSlider("Top_1")
     .setPosition(button_x,button_y+gap*11)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Top_1");  
   
   cp5.addSlider("Top_2")
     .setPosition(button_x,button_y+gap*12)
     .setRange(-1,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Top_2");
   
   cp5.addSlider("Top_3")
     .setPosition(button_x,button_y+gap*13)
     .setRange(0,1)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("Top_3");  
   
   cp5.addSlider("div_threshold")
     .setPosition(button_x,button_y+gap*14)
     .setRange(0,100)
     .setWidth(100)
     .setHeight(button_height)
     .setColorValueLabel(0)
     .getCaptionLabel().setText("div_threshold");
   
}
