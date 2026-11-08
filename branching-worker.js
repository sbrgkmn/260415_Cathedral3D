import {buildBranching} from './branching.mjs?v=31';
const cache=new Map();
self.onmessage=({data:{id,parameters}})=>{try{const key=JSON.stringify(parameters);let model=cache.get(key);if(!model){model=buildBranching(parameters);cache.set(key,model);if(cache.size>4)cache.delete(cache.keys().next().value);}self.postMessage({id,model});}catch(error){self.postMessage({id,error:error.message});}};
