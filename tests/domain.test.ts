import {test} from "node:test";
import assert from "node:assert/strict";
import {advance,atPoint,counts,type Signal} from "../src/lib/domain";
test("review must precede slide advance, including empty slides",()=>{assert.deepEqual(advance(1,"presenting",3),{slide:1,phase:"reviewing"});assert.deepEqual(advance(1,"reviewing",3),{slide:2,phase:"presenting"});assert.equal(advance(3,"reviewing",3).slide,3);});
test("overlap counts include all categories, quick Lost has no spatial heat",()=>{const s:Signal[]=[{id:"1",slide:1,rect:{x:.1,y:.1,width:.4,height:.4},categories:["Need an example","Other"],saved:true},{id:"2",slide:1,rect:{x:.2,y:.2,width:.4,height:.4},categories:["Other"],saved:true},{id:"3",slide:1,categories:[],saved:true}];assert.equal(atPoint(s,.3,.3).length,2);assert.equal(counts(atPoint(s,.3,.3)).Other,2);assert.equal(atPoint(s,.9,.9).length,0);});
