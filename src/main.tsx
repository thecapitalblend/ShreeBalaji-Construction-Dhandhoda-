import React,{useEffect,useMemo,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {MousePointer2,Square,DoorOpen,Grid2X2,Columns3,Move,Minus,Undo2,Redo2,Save,FolderOpen,Download,Plus,Trash2,ZoomIn,ZoomOut,Maximize2,Compass,AlertTriangle,CheckCircle2} from "lucide-react";
import "./styles.css";

type Tool="select"|"wall"|"room"|"door"|"window"|"stair"|"dimension";
type Floor={id:number,name:string,objects:Obj[]};
type Obj={id:string,type:Tool,x:number,y:number,w:number,h:number,thickness?:number,label?:string,layer?:string,angle?:number};
type Project={name:string,plotW:number,plotH:number,facing:string,road:string,north:number,floors:Floor[]};

const SCALE=16;
const uid=()=>Math.random().toString(36).slice(2,9);
const initial:Project={name:"New House",plotW:30,plotH:40,facing:"East",road:"East",north:0,floors:[{id:0,name:"Ground Floor",objects:[]}]};

function App(){
 const [project,setProject]=useState<Project>(initial);
 const [floor,setFloor]=useState(0),[tool,setTool]=useState<Tool>("select"),[zoom,setZoom]=useState(1);
 const [selected,setSelected]=useState<string|null>(null),[history,setHistory]=useState<Project[]>([]),[future,setFuture]=useState<Project[]>([]);
 const canvas=useRef<SVGSVGElement>(null);
 const current=project.floors[floor];
 const push=(next:Project)=>{setHistory(h=>[...h,structuredClone(project)].slice(-30));setFuture([]);setProject(next)};
 const updateFloor=(mut:(f:Floor)=>Floor)=>push({...project,floors:project.floors.map((f,i)=>i===floor?mut(structuredClone(f)):f)});
 const addObj=(type:Tool)=>{let x=2,y=2,w=6,h=4;if(type==="wall"){w=10;h=.2}else if(type==="door"){w=.1;h=3}else if(type==="window"){w=.1;h=4}else if(type==="stair"){w=7;h=10}else if(type==="dimension"){w=10;h=.05}
   const o:Obj={id:uid(),type,x,y,w,h,thickness:type==="wall"?0.5:undefined,label:type==="room"?"Room":undefined,layer:type==="wall"?"Walls":"Architecture"};
   updateFloor(f=>({...f,objects:[...f.objects,o]}));setSelected(o.id);setTool("select")};
 const undo=()=>{if(!history.length)return;const h=[...history],prev=h.pop()!;setFuture(f=>[structuredClone(project),...f]);setHistory(h);setProject(prev)};
 const redo=()=>{if(!future.length)return;const [n,...rest]=future;setHistory(h=>[...h,structuredClone(project)]);setFuture(rest);setProject(n)};
 const save=()=>{const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=(project.name||"naksha")+".json";a.click()};
 const load=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{push(JSON.parse(String(r.result)))}catch{alert("Invalid project file")}};r.readAsText(f)};
 const exportSVG=()=>{if(!canvas.current)return;const s=new XMLSerializer().serializeToString(canvas.current);const blob=new Blob([s],{type:"image/svg+xml"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="floor-plan.svg";a.click()};
 const selectedObj=current.objects.find(o=>o.id===selected);
 const updateSelected=(key:keyof Obj,val:any)=>updateFloor(f=>({...f,objects:f.objects.map(o=>o.id===selected?{...o,[key]:Number.isFinite(+val)&&["x","y","w","h","thickness","angle"].includes(key as string)?+val:val}:o)}));
 const remove=()=>{if(!selected)return;updateFloor(f=>({...f,objects:f.objects.filter(o=>o.id!==selected)}));setSelected(null)};
 const tools:[Tool,string,any][]=[["select","Select",MousePointer2],["wall","Wall",Minus],["room","Room",Square],["door","Door",DoorOpen],["window","Window",Grid2X2],["stair","Stair",Columns3],["dimension","Dimension",Move]];
 const validation=useMemo(()=>{const a=current.objects.filter(o=>o.type==="room");const warnings:string[]=[];for(const o of a){if(o.w<6||o.h<6)warnings.push(`${o.label||"Room"} is smaller than 6' in one dimension.`)}return warnings},[current]);
 return <div className="app">
  <header><div className="brand"><div className="logo">SB</div><div><b>ShreeBalaji Naksha AI</b><small>Phase 1 • 2D Architectural Studio</small></div></div>
   <div className="top-actions"><button onClick={undo} title="Undo"><Undo2/></button><button onClick={redo}><Redo2/></button><button onClick={save}><Save/> Save</button><label className="button"><FolderOpen/> Load<input hidden type="file" accept=".json" onChange={load}/></label><button onClick={exportSVG}><Download/> SVG</button></div>
  </header>
  <div className="workspace">
   <aside className="left"><h3>TOOLS</h3>{tools.map(([id,name,Icon])=><button className={tool===id?"active":""} onClick={()=>id==="select"?setTool("select"):(setTool(id),addObj(id))} key={id}><Icon/><span>{name}</span></button>)}
    <hr/><button onClick={()=>addObj("room")}><Plus/><span>Quick Room</span></button><button onClick={remove} disabled={!selected}><Trash2/><span>Delete</span></button>
    <div className="floorbox"><b>FLOORS</b>{project.floors.map((f,i)=><button className={i===floor?"floor activefloor":"floor"} onClick={()=>{setFloor(i);setSelected(null)}} key={f.id}>{f.name}</button>)}<button onClick={()=>push({...project,floors:[...project.floors,{id:Date.now(),name:`Floor ${project.floors.length}`,objects:[]}]})}><Plus/> Add floor</button></div>
   </aside>
   <main className="canvas-wrap">
    <div className="canvasbar"><span><Compass/> North ↑</span><span>Scale 1' = {SCALE}px</span><button onClick={()=>setZoom(z=>Math.min(2,z+.1))}><ZoomIn/></button><button onClick={()=>setZoom(z=>Math.max(.5,z-.1))}><ZoomOut/></button><button onClick={()=>setZoom(1)}><Maximize2/></button></div>
    <svg ref={canvas} className="canvas" viewBox={`0 0 ${project.plotW*SCALE+100} ${project.plotH*SCALE+100}`} style={{transform:`scale(${zoom})`}}>
      <defs><pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse"><path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#e7ebf0" strokeWidth=".7"/></pattern></defs>
      <rect x="0" y="0" width={project.plotW*SCALE+100} height={project.plotH*SCALE+100} fill="url(#grid)"/>
      <rect x="50" y="50" width={project.plotW*SCALE} height={project.plotH*SCALE} className="plot"/>
      <text x={50+project.plotW*SCALE/2} y="30" textAnchor="middle" className="north">N ↑</text>
      <text x={50+project.plotW*SCALE/2} y={60+project.plotH*SCALE} textAnchor="middle" className="road">ROAD • {project.road}</text>
      {current.objects.map(o=>{const x=50+o.x*SCALE,y=50+o.y*SCALE,w=o.w*SCALE,h=o.h*SCALE;const active=o.id===selected; if(o.type==="dimension")return <g key={o.id} onClick={()=>setSelected(o.id)}><line x1={x} y1={y} x2={x+w} y2={y} className="dim"/><text x={x+w/2} y={y-5} textAnchor="middle">{o.w.toFixed(1)}'</text></g>;
        return <g key={o.id} onClick={()=>setSelected(o.id)} className={active?"selected":""}><rect x={x} y={y} width={w} height={h} rx={o.type==="door"?2:0} className={`obj ${o.type}`}/><text x={x+w/2} y={y+h/2+4} textAnchor="middle">{o.label||o.type.toUpperCase()}</text>{active&&<rect x={x-3} y={y-3} width={w+6} height={h+6} className="selection"/></g>})}
    </svg>
   </main>
   <aside className="right"><h3>PROJECT</h3>
    <label>Project Name<input value={project.name} onChange={e=>setProject({...project,name:e.target.value})}/></label>
    <div className="twocol"><label>Plot Width (ft)<input type="number" value={project.plotW} onChange={e=>setProject({...project,plotW:+e.target.value})}/></label><label>Plot Length (ft)<input type="number" value={project.plotH} onChange={e=>setProject({...project,plotH:+e.target.value})}/></label></div>
    <div className="twocol"><label>Facing<select value={project.facing} onChange={e=>setProject({...project,facing:e.target.value})}>{["East","West","North","South"].map(x=><option key={x}>{x}</option>)}</select></label><label>Road<select value={project.road} onChange={e=>setProject({...project,road:e.target.value})}>{["East","West","North","South","North-East","North-West","South-East","South-West"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <h3>SELECTED OBJECT</h3>{selectedObj?<><label>Type<input disabled value={selectedObj.type}/></label><div className="twocol"><label>X (ft)<input type="number" step=".1" value={selectedObj.x} onChange={e=>updateSelected("x",e.target.value)}/></label><label>Y (ft)<input type="number" step=".1" value={selectedObj.y} onChange={e=>updateSelected("y",e.target.value)}/></label></div><div className="twocol"><label>Width<input type="number" step=".1" value={selectedObj.w} onChange={e=>updateSelected("w",e.target.value)}/></label><label>Height<input type="number" step=".1" value={selectedObj.h} onChange={e=>updateSelected("h",e.target.value)}/></label></div><label>Label<input value={selectedObj.label||""} onChange={e=>updateSelected("label",e.target.value)}/></label></>:<p className="muted">Select an object to edit its properties.</p>}
    <h3>VALIDATION</h3>{validation.length?<div className="warnings">{validation.map(x=><div key={x}><AlertTriangle/>{x}</div>)}</div>:<div className="ok"><CheckCircle2/> Basic geometry checks passed</div>}
    <div className="note">Phase 1 foundation. Vastu, jurisdiction-specific building codes, structural checks, MEP, 3D/BIM and AI generation are planned for later phases.</div>
   </aside>
  </div>
  <footer>Plot {project.plotW}' × {project.plotH}' • {project.facing}-facing • {current.name} • Objects: {current.objects.length}</footer>
 </div>
}
createRoot(document.getElementById("root")!).render(<App/>);
