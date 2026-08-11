import streamlit as st
import streamlit.components.v1 as components
import json, math, uuid, io
from pathlib import Path

st.set_page_config(page_title="ShreeBalaji Naksha AI", page_icon="🏗️", layout="wide")

# ---------- State ----------
DEFAULT = {
    "name":"New House", "plot_w":30.0, "plot_h":40.0, "facing":"East", "road":"East",
    "north":0, "floor":0, "floors":[{"name":"Ground Floor","objects":[]}],
}
if "project" not in st.session_state:
    st.session_state.project = DEFAULT.copy()
if "history" not in st.session_state: st.session_state.history=[]
if "future" not in st.session_state: st.session_state.future=[]
if "selected" not in st.session_state: st.session_state.selected=None

def snapshot():
    return json.loads(json.dumps(st.session_state.project))

def commit(next_project):
    st.session_state.history.append(snapshot())
    st.session_state.history=st.session_state.history[-30:]
    st.session_state.future=[]
    st.session_state.project=next_project

def floor_data():
    return st.session_state.project["floors"][st.session_state.project["floor"]]

def add_object(kind):
    sizes={
        "room":(6,4),"wall":(10,.5),"door":(.15,3),"window":(.15,4),
        "stair":(7,10),"dimension":(10,.1)
    }
    w,h=sizes[kind]
    label={"room":"Room","wall":"","door":"Door","window":"Window","stair":"Staircase","dimension":""}[kind]
    o={"id":str(uuid.uuid4())[:8],"type":kind,"x":2.0,"y":2.0,"w":w,"h":h,
       "thickness":.5 if kind=="wall" else 0,"label":label,"layer":"Walls" if kind=="wall" else "Architecture","angle":0}
    p=snapshot()
    p["floors"][p["floor"]]["objects"].append(o)
    commit(p)
    st.session_state.selected=o["id"]

def undo():
    if st.session_state.history:
        st.session_state.future.insert(0,snapshot())
        st.session_state.project=st.session_state.history.pop()

def redo():
    if st.session_state.future:
        st.session_state.history.append(snapshot())
        st.session_state.project=st.session_state.future.pop(0)

def svg_plan():
    p=st.session_state.project
    W=p["plot_w"]*20+140; H=p["plot_h"]*20+140
    ox=70; oy=70; S=20
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
           '<rect width="100%" height="100%" fill="white"/>',
           f'<rect x="{ox}" y="{oy}" width="{p["plot_w"]*S}" height="{p["plot_h"]*S}" fill="#fff" stroke="#17202a" stroke-width="3"/>',
           f'<text x="{ox+p["plot_w"]*S/2}" y="35" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">N ↑</text>',
           f'<text x="{ox+p["plot_w"]*S/2}" y="{oy+p["plot_h"]*S+28}" text-anchor="middle" font-family="Arial" font-size="12">ROAD • {p["road"]}</text>']
    colors={"room":"#eaf2ff","wall":"#667085","door":"#f7e1b5","window":"#b9e5f5","stair":"#eeeeee","dimension":"none"}
    for o in floor_data()["objects"]:
        x=ox+o["x"]*S; y=oy+o["y"]*S; w=o["w"]*S; h=o["h"]*S
        stroke="#0b5fff" if o["id"]==st.session_state.selected else "#263238"
        sw=2 if o["id"]==st.session_state.selected else 1.5
        if o["type"]=="dimension":
            parts.append(f'<line x1="{x}" y1="{y}" x2="{x+w}" y2="{y}" stroke="#0b5fff"/><text x="{x+w/2}" y="{y-5}" text-anchor="middle" fill="#0b5fff" font-size="11">{o["w"]:.1f} ft</text>')
        else:
            parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{colors[o["type"]]}" stroke="{stroke}" stroke-width="{sw}"/>')
            if o.get("label"):
                parts.append(f'<text x="{x+w/2}" y="{y+h/2+4}" text-anchor="middle" font-family="Arial" font-size="11">{o["label"]}</text>')
    parts.append("</svg>")
    return "".join(parts)

st.title("🏗️ ShreeBalaji Naksha AI")
st.caption("Phase 1 • 2D Architectural Design Studio • Streamlit MVP")

# ---------- Sidebar ----------
with st.sidebar:
    st.header("🛠️ Tools")
    tool=st.radio("Choose tool",["Select","Room","Wall","Door","Window","Staircase","Dimension"],label_visibility="collapsed")
    if st.button("➕ Add selected tool",use_container_width=True):
        add_object(tool.lower() if tool!="Staircase" else "stair")
        st.rerun()
    c1,c2=st.columns(2)
    if c1.button("↩ Undo",use_container_width=True): undo(); st.rerun()
    if c2.button("↪ Redo",use_container_width=True): redo(); st.rerun()
    st.divider()
    st.header("🏢 Floors")
    names=[f["name"] for f in st.session_state.project["floors"]]
    new_floor=st.selectbox("Active floor",range(len(names)),format_func=lambda i:names[i])
    if new_floor!=st.session_state.project["floor"]:
        st.session_state.project["floor"]=new_floor; st.session_state.selected=None
    if st.button("➕ Add Floor",use_container_width=True):
        p=snapshot(); p["floors"].append({"name":f"Floor {len(p['floors'])}","objects":[]}); commit(p); st.rerun()
    st.divider()
    st.header("💾 Project")
    if st.button("Save / Download JSON",use_container_width=True):
        data=json.dumps(st.session_state.project,indent=2).encode()
        st.download_button("⬇️ Download project",data=data,file_name="naksha_project.json",mime="application/json",use_container_width=True)
    uploaded=st.file_uploader("Load JSON",type=["json"])
    if uploaded:
        try:
            st.session_state.project=json.load(uploaded)
            st.session_state.selected=None
            st.success("Project loaded.")
        except Exception:
            st.error("Invalid project JSON.")
    st.download_button("⬇️ Export SVG",data=svg_plan(),file_name="floor_plan.svg",mime="image/svg+xml",use_container_width=True)

# ---------- Project settings ----------
left,center,right=st.columns([1.0,2.7,1.0],gap="medium")
with left:
    st.subheader("PROJECT")
    p=st.session_state.project
    p["name"]=st.text_input("Project name",p["name"])
    p["plot_w"]=st.number_input("Plot width (ft)",1.0,500.0,float(p["plot_w"]),0.5)
    p["plot_h"]=st.number_input("Plot length (ft)",1.0,500.0,float(p["plot_h"]),0.5)
    p["facing"]=st.selectbox("Facing",["East","West","North","South"],index=["East","West","North","South"].index(p["facing"]))
    p["road"]=st.selectbox("Road side",["East","West","North","South","North-East","North-West","South-East","South-West"],index=["East","West","North","South","North-East","North-West","South-East","South-West"].index(p["road"]))
    st.metric("Plot area",f'{p["plot_w"]*p["plot_h"]:,.0f} sq ft')

with center:
    st.subheader(f"📐 {floor_data()['name']}")
    st.markdown("**Tip:** Use the tools in the left panel. Phase 1 uses exact feet-based geometry; Phase 2 will add drag/snap CAD editing and AI/Vastu.")
    components.html(svg_plan(),height=min(700,max(420,int(st.session_state.project["plot_h"]*8+220))),scrolling=True)
    st.caption("2D preview • North arrow • plot boundary • objects • dimensions")

with right:
    st.subheader("SELECTED OBJECT")
    objects=floor_data()["objects"]
    ids=[o["id"] for o in objects]
    if st.session_state.selected not in ids: st.session_state.selected=None
    if objects:
        chosen=st.selectbox("Object",["— Select —"]+ids,index=0 if st.session_state.selected is None else ids.index(st.session_state.selected)+1)
        st.session_state.selected=None if chosen=="— Select —" else chosen
    o=next((x for x in objects if x["id"]==st.session_state.selected),None)
    if o:
        st.write(f"**Type:** {o['type']}")
        col1,col2=st.columns(2)
        nx=col1.number_input("X (ft)",value=float(o["x"]),step=.1,key=f"x{o['id']}")
        ny=col2.number_input("Y (ft)",value=float(o["y"]),step=.1,key=f"y{o['id']}")
        nw=col1.number_input("Width",value=float(o["w"]),step=.1,key=f"w{o['id']}")
        nh=col2.number_input("Height",value=float(o["h"]),step=.1,key=f"h{o['id']}")
        nl=st.text_input("Label",value=o.get("label",""),key=f"l{o['id']}")
        if st.button("Apply changes",use_container_width=True):
            np=snapshot()
            for q in np["floors"][np["floor"]]["objects"]:
                if q["id"]==o["id"]:
                    q.update({"x":nx,"y":ny,"w":nw,"h":nh,"label":nl})
            commit(np); st.rerun()
        if st.button("🗑️ Delete object",use_container_width=True):
            np=snapshot(); np["floors"][np["floor"]]["objects"]=[q for q in np["floors"][np["floor"]]["objects"] if q["id"]!=o["id"]]
            commit(np); st.session_state.selected=None; st.rerun()
    else:
        st.info("Select an object to edit.")

# ---------- Validation ----------
st.divider()
st.subheader("🔎 Basic Geometry Validation")
warnings=[]
if p["plot_w"]<=0 or p["plot_h"]<=0: warnings.append("Plot dimensions must be positive.")
for o in floor_data()["objects"]:
    if o["x"]<0 or o["y"]<0 or o["x"]+o["w"]>p["plot_w"] or o["y"]+o["h"]>p["plot_h"]:
        warnings.append(f"{o.get('label') or o['type']} is outside the plot boundary.")
    if o["type"]=="room" and (o["w"]<6 or o["h"]<6):
        warnings.append(f"{o.get('label') or 'Room'} is below the Phase-1 6 ft conceptual minimum.")
if warnings:
    for w in warnings: st.warning("⚠️ "+w)
else:
    st.success("✅ Basic geometry checks passed.")

st.info("Engineering-code compliance, Vastu rule engine, structural design, MEP, 3D/BIM and AI generation are separate modules planned for later phases. This MVP must not be treated as an approved construction drawing.")
