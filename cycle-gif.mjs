// Dependency-free grayscale GIF89a. Short literal LZW runs keep encoding predictable.
export function encodeCycleGIF(width,height,frames,delay=110){
 if(!frames.length||frames.some(f=>f.length!==width*height))throw Error('Invalid animation frames');
 const bytes=[],put=(...v)=>bytes.push(...v),word=n=>put(n&255,n>>8),ascii=s=>{for(const c of s)put(c.charCodeAt(0));};
 ascii('GIF89a');word(width);word(height);put(0xf7,255,0);
 for(let i=0;i<256;i++)put(i,i,i);
 put(0x21,0xff,11);ascii('NETSCAPE2.0');put(3,1,0,0,0);
 frames.forEach((pixels,index)=>{
  put(0x21,0xf9,4,4);word(index===frames.length-1?delay*2:delay);put(0,0);
  put(0x2c);word(0);word(0);word(width);word(height);put(0,8);
  const packed=[];let bits=0,buffer=0;
  const code=n=>{buffer|=n<<bits;bits+=9;while(bits>=8){packed.push(buffer&255);buffer>>>=8;bits-=8;}};
  for(let start=0;start<pixels.length;start+=200){code(256);for(let i=start;i<Math.min(start+200,pixels.length);i++)code(pixels[i]);}
  code(257);if(bits)packed.push(buffer&255);
  for(let i=0;i<packed.length;i+=255){const part=packed.slice(i,i+255);put(part.length,...part);}put(0);
 });put(0x3b);return new Uint8Array(bytes);
}
