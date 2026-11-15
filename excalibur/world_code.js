function excalibur(myId){
const S=2.2,SL=5.32,CR=.9,TD=(SL-CR)*S,MC=112,RDROP=1.5,CLR=40,HG=15.5,TS=.8,RM=26,RC=7,BC=9,PS=1;
if(globalThis.excalParts14){for(const o of globalThis.excalParts14){try{api.deleteMeshEntity(o)}catch{}}globalThis.excalParts14=null}
const start=api.getPosition(myId),gY=start[1];
let fcX=0,fcZ=1;
try{const f=api.getPlayerFacingInfo(myId);const fd=f&&(f.dirXyz||f.dir);if(fd){fcX=fd[0];fcZ=fd[2]}}catch{}
const fl=Math.sqrt(fcX*fcX+fcZ*fcZ)||1;fcX/=fl;fcZ/=fl;
const swingYaw=Math.atan2(fcX,fcZ),stoneX=start[0]+fcX*7,stoneZ=start[2]+fcZ*7;
const gripStuck=gY+TS+TD,HREL=HG-TS-TD,CY=gY+CLR,hoverY=gY+HG;
function M(w,h,d,c,g){let id=null;if(g){try{id=api.attemptCreateMeshEntity("Box",{width:w,height:h,depth:d,diffuseColor:c,emissiveColor:c})}catch{}}
if(!id)id=api.attemptCreateMeshEntity("Box",{width:w,height:h,depth:d,diffuseColor:c});return id}
function del(id){try{api.deleteMeshEntity(id)}catch{}}
const sw=[],st=[];let rb=[],cl=[],bc=[],bg=[];
const gold=[255,205,35],dgold=[195,130,15],iron=[45,48,58],leath=[75,35,20],cyan=[0,255,255],white=[240,255,255],blue=[20,120,255];
const rc=[[88,88,96],[72,72,80],[104,102,110],[40,40,46],[60,110,50],[60,230,255]];
function track(){const a=[];for(const p of sw)a.push(p.id);for(const p of st)a.push(p.id);for(const p of rb)a.push(p.id);for(const c of cl)a.push(c);for(const c of bc)a.push(c);for(const c of bg)a.push(c);globalThis.excalParts14=a}
function addSword(w,h,d,c,ox,bot,oz,g,blink){const id=M(w*S,h*S,d*S,c,g);if(id){api.setPosition(id,start[0],gY-40,start[2]);sw.push({id:id,lx:ox*S,ly:(bot-CR)*S,lz:oz*S,blink:blink||false})}}
const SD=[[.18,.18,.18,cyan,0,0,0,1],[.42,.22,.34,gold,0,.16,0,0],[.32,.12,.28,dgold,0,.36,0,0],[.22,.9,.22,leath,0,.45,0,0],[.26,.1,.26,gold,0,.7,0,0],[.26,.1,.26,gold,0,1.05,0,0],
[1.5,.26,.36,gold,0,1.32,0,0],[1.1,.32,.4,dgold,0,1.3,0,0],[.34,.34,.46,cyan,0,1.29,0,1],[.24,.36,.32,dgold,-.72,1.48,0,0],[.24,.36,.32,dgold,.72,1.48,0,0],
[.18,.3,.26,gold,-.84,1.72,0,0],[.18,.3,.26,gold,.84,1.72,0,0],[.68,.2,.24,iron,0,1.56,0,0],[.62,3,.1,cyan,0,1.7,0,1],[.42,3,.14,white,0,1.7,0,1],[.16,2.8,.18,blue,0,1.75,0,1],
[.48,.22,.1,cyan,0,4.68,0,1],[.32,.22,.1,white,0,4.88,0,1],[.16,.24,.1,white,0,5.08,0,1]];
for(const q of SD)addSword(q[0],q[1],q[2],q[3],q[4],q[5],q[6],q[7]);
const TD2=[[5.6,.9,4.8,3,0,.45,0,0],[4.8,1.2,4,0,0,1.3,0,4],[3.8,1.2,3.2,1,0,2.3,0,-6],[2.8,.8,2.4,2,0,2.9,0,10],[2,.5,1.8,1,0,3.35,0,-12],
[1.9,1.6,1.7,2,-2.5,.8,.8,25],[1.8,1.4,1.6,1,2.6,.7,-.7,-20],[1.7,1.3,1.5,0,.7,.65,2.3,12],[1.6,1.2,1.5,2,-.8,.6,-2.3,-35],[1.5,1.8,1.4,1,-1.9,1.5,-1.5,18],
[1.4,1.7,1.3,0,1.9,1.4,1.6,-28],[1.2,1.3,1.1,2,-1.7,2.2,.6,20],[1.1,1.2,1.2,0,1.6,2.15,-.7,-25],[.8,.6,.8,1,-3.1,.3,-.9,30],[.7,.5,.9,0,3.2,.25,1.3,-15],
[.9,.5,.7,2,1.7,.25,-2.9,40],[.7,.5,.8,1,-2,.25,2.5,-10],[.6,.45,.6,0,3,.22,-1.8,20],[.5,1.1,.5,2,-1.3,3.75,.9,20],[.45,1,.5,0,1.3,3.7,-.9,-25],
[1,.08,.8,4,1.6,2.94,.7,0],[1.2,.08,.7,4,1,1.94,1.7,0],[.12,1,.08,3,-.6,1.4,2.03,4],[.1,.8,.08,3,.3,2.4,1.66,-6],[.3,.3,.06,5,-1,1.2,2.05,4],[.25,.4,.06,5,.6,1.6,2.05,4],[.3,.25,.06,5,0,2.4,1.68,-6]];
for(const q of TD2){const id=M(q[0],q[1],q[2],rc[q[3]],q[3]==5);if(id){api.setPosition(id,stoneX,gY-40,stoneZ);st.push({id:id,ox:q[4],cy:q[5],oz:q[6],h:q[1],yaw:q[7]*Math.PI/180})}}
const CL=[[0,0,0,14,2.4,14],[-8,.5,3,7,1.8,7],[8,.3,-3,7,1.8,7],[2,.6,8,6,1.6,6],[-3,.4,-8,6,1.6,6]];
function cloudBox(w,h,d){let id=null;try{id=api.attemptCreateMeshEntity("Box",{width:w,height:h,depth:d,texture:"Smoke Block",animateTexture:true})}catch{}
if(!id)id=api.attemptCreateMeshEntity("Box",{width:w,height:h,depth:d,diffuseColor:[95,95,105]});return id}
track();
try{api.broadcastMessage("Excalibur meshes: sword "+sw.length+", stone "+st.length)}catch{}
function P(a,b,n,sz,life,c1,c2,pw,g,d){api.playParticleEffect({dir1:[-d,-d*.5,-d],dir2:[d,d,d],pos1:a,pos2:b,texture:"square_particle",minLifeTime:life*.7,maxLifeTime:life,minEmitPower:pw*.3,maxEmitPower:pw,minSize:sz*.7,maxSize:sz,manualEmitCount:n,gravity:[0,g,0],
colorGradients:[{timeFraction:0,minColor:c1,maxColor:c2},{timeFraction:1,minColor:[c1[0],c1[1],c1[2],0],maxColor:[c2[0],c2[1],c2[2],0]}],velocityGradients:[{timeFraction:0,factor:1,factor2:.5}],blendMode:1})}
function B(x,y,z,sp,n,sz,life,c1,c2,pw,g){P([x-sp,y-sp,z-sp],[x+sp,y+sp,z+sp],n,sz,life,c1,c2,pw,g,.3)}
function LN(a,b,n,sz,life,c1,c2,pw){P(a,b,n,sz,life,c1,c2,pw,0,.15)}
function BURST(x,y,z,n,pw,sz,life,c1,c2){P([x-.5,y-.5,z-.5],[x+.5,y+.5,z+.5],n,sz,life,c1,c2,pw,0,1)}
function RAD(x,y,z,n,pw,sz,c1,c2){P([x-.4,y,z-.4],[x+.4,y+.2,z+.4],n,sz,1,c1,c2,pw,-4,1.5)}
const W1=[255,255,255,1],C1=[120,240,255,1];
function E(v){v=v<0?0:v>1?1:v;return v*v*(3-2*v)}
function lerp(a,b,k){return a+(b-a)*k}
let poseX=stoneX,poseY=gripStuck,poseZ=stoneZ,poseTilt=Math.PI,poseYaw=swingYaw,tk=0;
function applySword(){const sT=Math.sin(poseTilt),cT=Math.cos(poseTilt),sY=Math.sin(poseYaw),cY=Math.cos(poseYaw);
for(const p of sw){if(p.blink&&tk%2===1){try{api.setPosition(p.id,poseX,gY-200,poseZ)}catch{}continue}
const pyv=p.ly*cT-p.lz*sT,pzv=p.ly*sT+p.lz*cT;
try{api.setPosition(p.id,poseX+p.lx*cY+pzv*sY,poseY+pyv,poseZ-p.lx*sY+pzv*cY);api.setEntityRotation(p.id,poseTilt*PS,poseYaw,0)}catch{}}}
function bd(){return[Math.sin(poseTilt)*Math.sin(poseYaw),Math.cos(poseTilt),Math.sin(poseTilt)*Math.cos(poseYaw)]}
function placeStone(r){for(const p of st){try{api.setPosition(p.id,stoneX+p.ox,gY+r+p.cy-p.h/2,stoneZ+p.oz);api.setEntityRotation(p.id,0,p.yaw,0)}catch{}}}
function dust(n){for(let k=0;k<n;k++){const a=Math.random()*6.28,r=2.2+Math.random()*1.6;B(stoneX+Math.cos(a)*r,gY+.3,stoneZ+Math.sin(a)*r,.4,4,.5,.9,[140,130,120,.8],[190,180,170,.8],.8,.2)}}
function total(){return sw.length+st.length+rb.length+cl.length+bc.length+bg.length}
function ring(i,ix,iz){const n=8+i*2,rad=1.2+i*2.6;
for(let k=0;k<n;k++){while(total()>=MC&&rb.length>0){del(rb.shift().id)}if(total()>=MC)break;
const a=k/n*6.28+Math.random()*.4,s=.5+Math.random()*.7+i*.05,id=M(s,s*(.7+Math.random()*.8),s,rc[Math.floor(Math.random()*4)],false);if(!id)continue;
const cx=ix+Math.cos(a)*rad,cz=iz+Math.sin(a)*rad;api.setPosition(id,cx,gY-RDROP-3,cz);
rb.push({id:id,x:cx,z:cz,h:2.2-i*.2+Math.random(),age:0,ta:Math.random()*1.2,tb:Math.random()*6,sp:(Math.random()-.5)*.12});
B(cx,gY+.3,cz,.4,3,.4,.8,[150,130,110,.9],[190,170,150,.9],1,.3)}track()}
function updRubble(){for(let i=rb.length-1;i>=0;i--){const r=rb[i];r.age++;
const lift=r.age<10?r.h*E(r.age/10):r.age<26?r.h:r.h-(r.h+.6)*E((r.age-26)/16);
try{api.setPosition(r.id,r.x,gY+lift-RDROP,r.z);api.setEntityRotation(r.id,r.ta,r.tb+r.age*r.sp,r.ta*.5)}catch{}
if(r.age>=42){del(r.id);rb.splice(i,1)}}}
const boltTop=CY+.3;let bSpan=1,bH=1;
function makeBolt(){const tipY=gY+HG+TD;bSpan=(boltTop-tipY)/BC;bH=bSpan+.8;bc=[];bg=[];
for(let i=0;i<BC;i++){const a=M(.5,bH,.5,white,true);if(a){api.setPosition(a,stoneX,gY-60,stoneZ);bc.push(a)}
const b=M(1.5,bH,1.5,cyan,true);if(b){api.setPosition(b,stoneX,gY-60,stoneZ);bg.push(b)}}track()}
function updBolt(){for(let i=0;i<bc.length;i++){const bot=boltTop-i*bSpan-bSpan-.4,j=(1-(i+.5)/BC)*2.4+.12,ox=(Math.random()-.5)*2*j,oz=(Math.random()-.5)*2*j;
try{api.setPosition(bc[i],stoneX+ox,bot,stoneZ+oz);if(bg[i])api.setPosition(bg[i],stoneX+ox,bot,stoneZ+oz)}catch{}}}
function tipPos(){const d=bd();return[poseX+d[0]*TD,poseY+d[1]*TD,poseZ+d[2]*TD]}
function bolt(){const tp=tipPos();let la=[stoneX,boltTop,stoneZ];
for(let n=1;n<=12;n++){const f=n/12,j=(1-f)*2.4,nx=[lerp(stoneX,tp[0],f)+(Math.random()-.5)*j*2,lerp(boltTop,tp[1],f),lerp(stoneZ,tp[2],f)+(Math.random()-.5)*j*2];
LN(la,nx,16,.8,.3,W1,[150,240,255,1],.4);la=nx}
B(tp[0],tp[1],tp[2],1.6,50,1,.5,W1,C1,3,0)}
function flash(){const tp=tipPos();BURST(tp[0],tp[1],tp[2],220,14,1.2,.9,W1,[150,240,255,1]);B(tp[0],tp[1],tp[2],3,90,2,.7,[255,255,255,.9],[210,245,255,.9],1,0)}
function energy(str,tn){const d=bd(),a=(1.7-CR)*S,p1=[poseX+d[0]*a,poseY+d[1]*a,poseZ+d[2]*a],p2=[poseX+d[0]*TD,poseY+d[1]*TD,poseZ+d[2]*TD],n=Math.max(4,Math.round(30*str));
LN(p1,p2,n,.45,.35,[60,240,255,1],W1,.5);LN(p1,p2,Math.round(n*.6),.3,.4,[40,140,255,1],[180,220,255,1],1.4);
const al=lerp(a,TD,(tn*.09)%1);B(poseX+d[0]*al,poseY+d[1]*al,poseZ+d[2]*al,.45,10,.8,.3,W1,[150,250,255,1],1,0)}
function arcs(){const d=bd(),a=(1.7-CR)*S;for(let n=0;n<4;n++){const al=lerp(a,TD,Math.random()),bx=poseX+d[0]*al,by=poseY+d[1]*al,bz=poseZ+d[2]*al,r=1.2+Math.random()*2.4,an=Math.random()*6.28;
LN([bx,by,bz],[bx+Math.cos(an)*r,by+(Math.random()-.5)*r,bz+Math.sin(an)*r],7,.35,.25,W1,[120,235,255,1],.3)}}
function swirl(cy,pr,tn,rs){const n=Math.round(8+52*pr),hl=TD*.6;
for(let k=0;k<n;k++){const f=k/n,a=f*11+tn*.4+(k%2)*Math.PI,r=1.7*rs*(1-.25*f);B(poseX+Math.cos(a)*r,cy+(f*2-1)*hl+hl*.6,poseZ+Math.sin(a)*r,.12,1,.38,.4,W1,[225,240,255,1],.3,.4)}
B(poseX,cy+hl*.6,poseZ,.9,Math.round(4+14*pr),.5,.4,[255,255,255,.9],[210,235,255,.9],.5,.2)}
function boom(x,y,z){B(x,y,z,3,160,2.4,.9,W1,[230,245,255,1],1.5,0);BURST(x,y,z,280,18,.9,1.4,W1,[170,240,255,1]);BURST(x,y,z,200,9,.7,1.8,W1,[210,225,255,1]);BURST(x,y,z,120,4,1.4,2.2,W1,W1);
try{api.broadcastSound("explode",1,.6);api.broadcastSound("levelup",1,1.7)}catch{}}
const T_RISE=40,T_FREE=100,T_FS=130,T_FE=175,T_SS=135,T_SE=190,T_CLOUD=155,T_BOLT=185,T_HEFT=232,T_STRIKE=262,T_IMP=272,T_REC=279,T_SPIN=326,T_VAN=432,T_END=502,TB=-.9,TDN=2.3;
const heftX=stoneX-fcX*1.5,heftZ=stoneZ-fcZ*1.5,heftY=hoverY+2.5,itX=stoneX+fcX*RC,itZ=stoneZ+fcZ*RC,itY=gY+.3;
const igX=itX-Math.sin(TDN)*Math.sin(swingYaw)*TD,igY=itY-Math.cos(TDN)*TD,igZ=itZ-Math.sin(TDN)*Math.cos(swingYaw)*TD;
let stoneGone=false,swordGone=false,impDone=false,cloudGone=false,boltMade=false,boltGone=false,sheathGone=false,errShown=false,spinYaw=0,bmX=0,bmY=0,bmZ=0;
try{api.broadcastSound("ominousBellHit",.9,.7)}catch{}
function tug(t){if(t<40)return 0;if(t<58)return .6*Math.sin(Math.PI*(t-40)/18);if(t<62)return 0;if(t<82)return 1.2*Math.sin(Math.PI*(t-62)/20);if(t<86)return 0;return 2*E((t-86)/14)+.12*Math.sin(t*2.2)}
function cleanupAll(){if(globalThis.excalParts14){for(const o of globalThis.excalParts14)del(o);globalThis.excalParts14=null}
for(const p of sw)del(p.id);for(const p of st)del(p.id);for(const p of rb)del(p.id);for(const c of cl)del(c);for(const c of bc)del(c);for(const c of bg)del(c);
sw.length=0;st.length=0;rb=[];cl=[];bc=[];bg=[];globalThis.runTimer14=null}
function step(){tk++;const t=tk;const third=!(t%3),even=!(t%2);
if(t<=T_RISE){const r=(E(t/T_RISE)-1)*4.8;placeStone(r);poseX=stoneX;poseZ=stoneZ;poseY=gripStuck+r;poseTilt=Math.PI;poseYaw=swingYaw;if(even)dust(2);if(t==1){try{api.broadcastSound("explode",.6,.6)}catch{}}}
else if(t<T_HEFT){poseX=stoneX;poseZ=stoneZ;poseYaw=swingYaw;
poseY=gripStuck+(t<T_FREE?tug(t):lerp(2,HREL,E((t-T_FREE)/(T_FE-T_FREE))));
poseTilt=t<T_FREE?Math.PI+.04*Math.sin(t*1.3):t<T_FS?Math.PI:t<T_FE?Math.PI*(1-E((t-T_FS)/(T_FE-T_FS))):0;
if(t==58||t==82||t==T_FREE){dust(5);try{api.broadcastSound("explode",.5,1.4)}catch{}}
if(t==T_FREE)RAD(stoneX,gY+3.6,stoneZ,60,6,.45,W1,[180,230,255,1])}
else if(t<T_STRIKE){const u=E((t-T_HEFT)/(T_STRIKE-T_HEFT));poseX=lerp(stoneX,heftX,u);poseY=lerp(hoverY,heftY,u);poseZ=lerp(stoneZ,heftZ,u);poseTilt=TB*u;poseYaw=swingYaw}
else if(t<T_IMP){const v=(t-T_STRIKE)/(T_IMP-T_STRIKE),a=v*v;poseX=lerp(heftX,igX,a);poseY=lerp(heftY,igY,a);poseZ=lerp(heftZ,igZ,a);poseTilt=lerp(TB,TDN,a);poseYaw=swingYaw;if(t==T_STRIKE){try{api.broadcastSound("magicAccent1",1,.6)}catch{}}}
else if(t<T_REC){poseX=igX;poseY=igY;poseZ=igZ;poseTilt=TDN;poseYaw=swingYaw}
else if(t<T_SPIN){const w=E((t-T_REC)/(T_SPIN-T_REC));poseX=lerp(igX,stoneX,w);poseY=lerp(igY,hoverY,w);poseZ=lerp(igZ,stoneZ,w);poseTilt=lerp(TDN,0,w);poseYaw=swingYaw}
let sp=0;
if(t>=T_SPIN&&!swordGone){sp=(t-T_SPIN)/(T_VAN-T_SPIN);spinYaw+=.03+.45*Math.pow(sp,2.2);poseX=stoneX;poseZ=stoneZ;poseY=hoverY+RM*Math.pow(sp,2.6);poseTilt=0;poseYaw=swingYaw+spinYaw}
if(t>T_RISE&&!stoneGone){if(t>=T_SS){placeStone(-E((t-T_SS)/(T_SE-T_SS))*5.2);if(third)dust(2)}
if(t>=T_SE){stoneGone=true;for(const p of st)del(p.id);st.length=0;track();dust(8)}}
if(t==T_CLOUD){cl=[];for(const c of CL){const id=cloudBox(c[3],c[4],c[5]);if(id){api.setPosition(id,stoneX+c[0]+.5,CY+c[1],stoneZ+c[2]+.5);cl.push(id)}}track();try{api.broadcastSound("ominousBellHit",.8,.5)}catch{}}
if(cl.length>0&&third&&t<T_STRIKE+20)B(stoneX,CY-1,stoneZ,8,14,1.6,1,[70,70,80,.6],[120,120,135,.6],.5,0);
if(t==T_BOLT&&!boltMade){boltMade=true;makeBolt();addSword(.9,2.2+1,.3,white,0,1.62,0,true,true);track();flash();try{api.broadcastSound("explode",1,1.6)}catch{}}
if(t>=T_BOLT&&t<T_BOLT+8){updBolt();bolt();if(t==T_BOLT+3)flash()}
if(t==T_BOLT+8&&!boltGone){boltGone=true;for(const c of bc)del(c);for(const c of bg)del(c);bc=[];bg=[];track()}
if(t==T_IMP&&!impDone){impDone=true;RAD(itX,gY+.3,itZ,120,9,.6,W1,C1);RAD(itX,gY+.3,itZ,90,6,.7,[150,130,110,.9],[200,180,160,.9]);try{api.broadcastSound("explode",1,.7)}catch{}}
const since=t-T_IMP;
if(since>=0&&since<15&&!(since%3))ring(since/3,itX,itZ);
updRubble();
if(cl.length>0&&t>=T_STRIKE+20&&!cloudGone){cloudGone=true;B(stoneX,CY,stoneZ,8,60,1.8,1.2,[120,120,135,.7],[190,190,205,.7],1.5,-.5);for(const c of cl)del(c);cl=[];track()}
if(t>=T_SPIN&&!sheathGone){sheathGone=true;for(let i=sw.length-1;i>=0;i--){const part=sw[i];if(part.blink){del(part.id);sw.splice(i,1)}}track()}
if(t>=T_VAN&&!swordGone){swordGone=true;bmX=poseX;bmY=poseY+TD*.3;bmZ=poseZ;for(const p of sw)del(p.id);sw.length=0;track();boom(bmX,bmY,bmZ)}
if(t==T_VAN+4){BURST(bmX,bmY,bmZ,220,24,.9,1.5,W1,[200,235,255,1]);BURST(bmX,bmY,bmZ,160,26,.7,1.2,W1,[150,230,255,1])}
if(t==T_VAN+8){BURST(bmX,bmY,bmZ,240,34,1,1.6,[255,255,255,.9],[170,220,255,.9]);try{api.broadcastSound("explode",.9,.8)}catch{}}
if(sw.length>0){try{applySword()}catch(pe){if(!errShown){errShown=true;try{api.broadcastMessage("Sword pose error: "+pe)}catch{}}}}
if(even){
if(t>=T_BOLT+2&&t<T_REC&&sw.length>0){energy(t<T_IMP?1:Math.max(.2,1-(t-T_IMP)/7),t);arcs()}
if(t>=T_SPIN&&t<T_VAN){energy(.4+.6*sp,t);swirl(poseY,Math.min(1,sp+.05),t,1)}
if(t>=T_VAN&&t<T_END){const f=1-(t-T_VAN)/(T_END-T_VAN);swirl(bmY+(t-T_VAN)*.05,f,t,.6+.8*f)}}
if(t>=T_END)cleanupAll()}
globalThis.runTimer14=()=>{try{step()}catch(e){try{api.broadcastMessage("Excalibur error: "+e)}catch{}cleanupAll()}};
}
globalThis.excalibur=excalibur
var excalOldTick=typeof tick==="function"?tick:null
tick=(ms)=>{if(excalOldTick)excalOldTick(ms);if(globalThis.runTimer14)globalThis.runTimer14()}
var excalOldChat=typeof onPlayerChat==="function"?onPlayerChat:null
onPlayerChat=(playerId,message)=>{if(message.trim().toLowerCase()==="!excalibur"){try{excalibur(playerId)}catch(e){api.sendMessage(playerId,"Excalibur error: "+e,{color:"orange"})}return false}if(excalOldChat)return excalOldChat(playerId,message)}
