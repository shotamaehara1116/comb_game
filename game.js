(() => {
const SIZE=5;
const COLORS=["#df5b57","#3578c8","#22a06b","#9b59b6","#e39a24","#e056a7","#17a2b8","#795548","#6b7d2a","#f07b3f","#4666c9","#c44569"];
const $=id=>document.getElementById(id);
const board=$("board"), theoremLayer=$("theoremLayer"), turnText=$("turnText"), phaseText=$("phaseText");
const publishBtn=$("publishBtn"), clearSelectionBtn=$("clearSelectionBtn"), proveBtn=$("proveBtn"), proveNowBtn=$("proveNowBtn"), passBtn=$("passBtn");
const restartBtn=$("restartBtn"), resultRestartBtn=$("resultRestartBtn"), tileList=$("tileList"), tileCount=$("tileCount");
const selectionMessage=$("selectionMessage"), decisionBar=$("decisionBar"), rulesBtn=$("rulesBtn"), rulesDialog=$("rulesDialog");
const proofDialog=$("proofDialog"), resultDialog=$("resultDialog"), resultTitle=$("resultTitle"), resultText=$("resultText");
const proofPlayer=$("proofPlayer"), knownChips=$("knownChips"), targetChips=$("targetChips"), proofTileList=$("proofTileList"), proofLog=$("proofLog");
const proofMessage=$("proofMessage"), resetProofBtn=$("resetProofBtn"), finishProofBtn=$("finishProofBtn"), autoProofBtn=$("autoProofBtn");

let state, proofState=null;
const pkey=([r,c])=>`${r},${c}`;
const parseKey=k=>k.split(",").map(Number);
const coordLabel=([r,c])=>`${String.fromCharCode(65+c)}${r+1}`;
const sortedKeys=pts=>pts.map(pkey).sort().join("|");

function seedSets(){
  const p1=[],p2=[];
  for(let r=0;r<5;r++) for(let c=0;c<5;c++){
    if(r+c<=3) p1.push([r,c]);       // 10 panels
    else if(r+c>=5) p2.push([r,c]);  // 10 panels
  }
  return {p1,p2};
}
function freshState(){return{current:1,selected:[],tiles:[],used:new Set(),seeds:seedSets(),phase:"choose",over:false};}
function init(){state=freshState();proofState=null;renderBoard();renderAll();}
function renderBoard(){
  board.innerHTML="";
  const s1=new Set(state.seeds.p1.map(pkey)), s2=new Set(state.seeds.p2.map(pkey));
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const b=document.createElement("button");b.type="button";b.className="prop";
    b.dataset.r=r;b.dataset.c=c;b.textContent=coordLabel([r,c]);b.title=`命題 ${coordLabel([r,c])}`;
    if(s1.has(`${r},${c}`))b.classList.add("seed1"); else if(s2.has(`${r},${c}`))b.classList.add("seed2"); else b.classList.add("neutral");
    b.addEventListener("click",()=>togglePoint([r,c]));board.appendChild(b);
  }
}
function classifyTile(pts){
  if(pts.length!==3||new Set(pts.map(pkey)).size!==3)return null;
  const rs=pts.map(p=>p[0]),cs=pts.map(p=>p[1]),minR=Math.min(...rs),maxR=Math.max(...rs),minC=Math.min(...cs),maxC=Math.max(...cs);
  if(minR===maxR){const s=[...cs].sort((a,b)=>a-b);if(s[1]===s[0]+1&&s[2]===s[1]+1)return{kind:"I",orientation:"H"};}
  if(minC===maxC){const s=[...rs].sort((a,b)=>a-b);if(s[1]===s[0]+1&&s[2]===s[1]+1)return{kind:"I",orientation:"V"};}
  if(maxR-minR===1&&maxC-minC===1)return{kind:"L"};
  return null;
}
function togglePoint(pt){
  if(state.over||state.phase!=="choose")return;
  const k=pkey(pt),i=state.selected.findIndex(x=>pkey(x)===k);
  if(i>=0)state.selected.splice(i,1);else if(state.selected.length<3)state.selected.push(pt);
  updateSelectionUI();
}
function setMessage(t,type){selectionMessage.textContent=t;selectionMessage.className=`message ${type}`;}
function updateSelectionUI(){
  [...board.children].forEach(e=>e.classList.remove("selected"));
  state.selected.forEach(([r,c])=>board.children[r*5+c].classList.add("selected"));
  if(state.phase==="decision"){
    publishBtn.disabled=true;clearSelectionBtn.disabled=true;setMessage("証明するか、相手に手番を渡してください。","good");return;
  }
  clearSelectionBtn.disabled=false;
  const cls=classifyTile(state.selected),used=state.selected.length===3&&state.used.has(sortedKeys(state.selected));
  publishBtn.disabled=!(cls&&!used&&!state.over);
  if(state.selected.length<3)setMessage(`あと${3-state.selected.length}個の命題パネルを選んでください。`,"neutral");
  else if(!cls)setMessage("この3枚はL型でもI型でもありません。","bad");
  else if(used)setMessage("この定理はすでに公開されています。","bad");
  else setMessage(`${cls.kind}型の定理を公開できます。`,"good");
}
function publishSelected(){
  if(state.phase!=="choose")return;
  const cls=classifyTile(state.selected);if(!cls||state.used.has(sortedKeys(state.selected)))return;
  const pts=state.selected.map(p=>[...p]),id=state.tiles.length+1;
  state.tiles.push({id,pts,kind:cls.kind,orientation:cls.orientation||null,by:state.current,color:COLORS[(id-1)%COLORS.length]});
  state.used.add(sortedKeys(pts));state.selected=[];state.phase="decision";renderAll();
}
function passTurn(){if(state.phase!=="decision"||state.over)return;state.current=state.current===1?2:1;state.phase="choose";renderAll();}
function renderAll(){
  turnText.textContent=state.current===1?"先手":"後手";turnText.style.color=state.current===1?"var(--p1)":"var(--p2)";
  phaseText.textContent=state.phase==="choose"?"定理を選ぶ":"証明するか選ぶ";
  decisionBar.classList.toggle("hidden",state.phase!=="decision");
  proveBtn.disabled=state.phase==="decision";
  renderTheorems();renderTileList();updateSelectionUI();
}
function panelCenter([r,c]){return[58+c*96,58+r*96];}
function pathFor(tile,lane){
  let pts=[...tile.pts];
  if(tile.kind==="I"){
    pts.sort((a,b)=>a[0]===b[0]?a[1]-b[1]:a[0]-b[0]);
    let centers=pts.map(panelCenter);
    if(tile.orientation==="H") centers=centers.map(([x,y])=>[x,y+lane]);
    else centers=centers.map(([x,y])=>[x+lane,y]);
    return centers.map(p=>p.join(",")).join(" ");
  }
  const elbow=pts.find(p=>{
    const o=pts.filter(q=>pkey(q)!==pkey(p));
    return o.every(q=>Math.abs(q[0]-p[0])+Math.abs(q[1]-p[1])===1);
  });
  const others=pts.filter(q=>pkey(q)!==pkey(elbow));
  let ordered=[others[0],elbow,others[1]].map(panelCenter);
  // alternating offset keeps coincident L pieces separated
  const s=lane;
  ordered=ordered.map(([x,y],i)=>[x+(i===1?s:0),y+(i===1?-s:0)]);
  return ordered.map(p=>p.join(",")).join(" ");
}
function renderTheorems(){
  theoremLayer.innerHTML="";
  state.tiles.forEach((tile,i)=>{
    const lane=((i%5)-2)*4;
    const pts=pathFor(tile,lane);
    const under=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    under.setAttribute("points",pts);under.setAttribute("class","theorem-underlay");under.setAttribute("stroke-width","12");
    theoremLayer.appendChild(under);
    const line=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    line.setAttribute("points",pts);line.setAttribute("class","theorem-line");line.setAttribute("stroke",tile.color);
    line.setAttribute("stroke-width",tile.kind==="I"?"7":"6");
    theoremLayer.appendChild(line);
  });
}
function tileDescription(t){return t.pts.map(coordLabel).join("・");}
function renderTileList(){
  tileCount.textContent=state.tiles.length;
  if(!state.tiles.length){tileList.className="tile-list empty";tileList.textContent="まだ定理は公開されていません。";return;}
  tileList.className="tile-list";tileList.innerHTML="";
  [...state.tiles].reverse().forEach(t=>{
    const d=document.createElement("div");d.className="tile-card";
    d.innerHTML=`<span><span class="theorem-dot" style="background:${t.color}"></span><span class="tile-kind">T${t.id} ${t.kind}</span><br>${tileDescription(t)}</span><strong>${t.by===1?"先手":"後手"}</strong>`;
    tileList.appendChild(d);
  });
}
function closure(seed,tiles){
  const known=new Set(seed.map(pkey)),steps=[];let changed=true;
  while(changed){changed=false;for(const t of tiles){const ks=t.pts.map(pkey);if(ks.filter(k=>known.has(k)).length>=2){for(const k of ks)if(!known.has(k)){known.add(k);steps.push({tile:t,gained:k});changed=true;}}}}
  return{known,steps};
}
function canCapture(player){
  const own=player===1?state.seeds.p1:state.seeds.p2,target=player===1?state.seeds.p2:state.seeds.p1,{known,steps}=closure(own,state.tiles);
  return{ok:target.every(p=>known.has(pkey(p))),known,steps};
}
function startProof(){
  if(state.over)return;
  const player=state.current;proofState={player,known:new Set((player===1?state.seeds.p1:state.seeds.p2).map(pkey)),used:new Set(),log:[]};
  proofPlayer.textContent=player===1?"先手":"後手";proofPlayer.style.color=player===1?"var(--p1)":"var(--p2)";renderProof();proofDialog.showModal();
}
function renderProof(){
  const target=proofState.player===1?state.seeds.p2:state.seeds.p1;
  knownChips.innerHTML=[...proofState.known].sort().map(k=>`<span class="chip known">${coordLabel(parseKey(k))}</span>`).join("");
  targetChips.innerHTML=target.map(p=>`<span class="chip ${proofState.known.has(pkey(p))?"target-done":""}">${coordLabel(p)} ${proofState.known.has(pkey(p))?"✓":""}</span>`).join("");
  proofTileList.innerHTML="";
  state.tiles.forEach(t=>{
    const ks=t.pts.map(pkey),inside=ks.filter(k=>proofState.known.has(k)).length,missing=ks.filter(k=>!proofState.known.has(k));
    const usable=inside>=2&&missing.length&&!proofState.used.has(t.id);
    const b=document.createElement("button");b.type="button";b.className="proof-tile";b.disabled=!usable;
    b.innerHTML=`<span><span class="theorem-dot" style="background:${t.color}"></span><span class="tile-kind">T${t.id} ${t.kind}</span><br>${tileDescription(t)}</span><span>${inside}/3既知</span>`;
    b.addEventListener("click",()=>useProofTile(t));proofTileList.appendChild(b);
  });
  proofLog.innerHTML=proofState.log.map(x=>`<li>${x}</li>`).join("");
  const success=target.every(p=>proofState.known.has(pkey(p)));finishProofBtn.disabled=!success;
  proofMessage.textContent=success?"相手の10個の秘密をすべて導けました。証明を提出できます。":"使える定理を選んで推論をつないでください。";
  proofMessage.className=`message ${success?"good":"neutral"}`;
}
function useProofTile(t){
  const ks=t.pts.map(pkey),inside=ks.filter(k=>proofState.known.has(k)),missing=ks.filter(k=>!proofState.known.has(k));
  if(inside.length<2||!missing.length)return;proofState.used.add(t.id);missing.forEach(k=>proofState.known.add(k));
  proofState.log.push(`T${t.id}（${tileDescription(t)}）より ${missing.map(k=>coordLabel(parseKey(k))).join("・")} を導出`);renderProof();
}
function resetProof(){const p=proofState.player;proofState={player:p,known:new Set((p===1?state.seeds.p1:state.seeds.p2).map(pkey)),used:new Set(),log:[]};renderProof();}
function autoProof(){
  resetProof();let changed=true;
  while(changed){changed=false;for(const t of state.tiles){if(proofState.used.has(t.id))continue;const ks=t.pts.map(pkey),inside=ks.filter(k=>proofState.known.has(k)),missing=ks.filter(k=>!proofState.known.has(k));if(inside.length>=2&&missing.length){proofState.used.add(t.id);missing.forEach(k=>proofState.known.add(k));proofState.log.push(`T${t.id}（${tileDescription(t)}）より ${missing.map(k=>coordLabel(parseKey(k))).join("・")} を導出`);changed=true;}}}renderProof();
}
function submitProof(){
  const p=proofState.player,own=canCapture(p);if(!own.ok){proofMessage.textContent="まだ相手の秘密をすべて導けません。";proofMessage.className="message bad";return;}
  const other=canCapture(p===1?2:1);proofDialog.close();state.over=true;
  if(other.ok)showResult("引き分け","この時点では二人とも相手の10個の秘密をすべて導けます。");
  else showResult(`${p===1?"先手":"後手"}の勝ち`,`${p===1?"先手":"後手"}だけが相手の10個の秘密をすべて導きました。`);
}
function showResult(t,x){resultTitle.textContent=t;resultText.textContent=x;resultDialog.showModal();}

publishBtn.onclick=publishSelected;clearSelectionBtn.onclick=()=>{state.selected=[];updateSelectionUI();};
proveBtn.onclick=startProof;proveNowBtn.onclick=startProof;passBtn.onclick=passTurn;
restartBtn.onclick=()=>{if(confirm("ゲームを最初からやり直しますか？"))init();};
resultRestartBtn.onclick=()=>{resultDialog.close();init();};rulesBtn.onclick=()=>rulesDialog.showModal();
resetProofBtn.onclick=resetProof;autoProofBtn.onclick=autoProof;finishProofBtn.onclick=submitProof;
init();
})();
