"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, X, Edit, RefreshCw, Search, Trash2, Plus, Check, Activity, UserRound, MonitorPlay, Building2, Package, Download, BarChart3 } from "lucide-react";

const icons: Record<string, React.ElementType> = {
  back: ArrowLeft,
  x: X,
  edit: Edit,
  refresh: RefreshCw,
  search: Search,
  trash: Trash2,
  plus: Plus,
  request: Check,
};

const s:Record<string,any>={
  page:{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#f8f9fa",color:"#111827"},
  header:{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 24px",height:56,display:"flex",alignItems:"center",gap:12,position:"sticky" as const,top:0,zIndex:10},
  content:{padding:24,maxWidth:1400,margin:"0 auto"},
  tabs:{display:"flex",gap:2,marginBottom:16,background:"#f0f0ff",border:"1px solid #e0e0ff",flexWrap:"wrap" as const,borderRadius:12,padding:"5px",position:"sticky" as const,top:56,zIndex:9,boxShadow:"0 2px 8px rgba(99,102,241,0.08)"},
  tab:(a:boolean)=>({padding:"9px 16px",fontSize:12,fontWeight:a?700:500,border:"none",background:a?"#6366f1":"transparent",cursor:"pointer",color:a?"#fff":"#6366f1",borderRadius:8,margin:"2px",whiteSpace:"nowrap" as const,boxShadow:a?"0 2px 10px rgba(99,102,241,0.25)":"none"}),
  card:{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden",marginBottom:16},
  th:{padding:"10px 12px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,background:"#f9fafb",borderBottom:"1px solid #e5e7eb",whiteSpace:"nowrap" as const},
  td:{padding:"10px 12px",borderBottom:"1px solid #f9fafb",fontSize:13,color:"#111827"},
  btn:(c:string)=>({padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",border:"none",background:c==="purple"?"#6366f1":c==="green"?"#16a34a":c==="blue"?"#2563eb":c==="red"?"#dc2626":c==="orange"?"#d97706":"#f3f4f6",color:c==="ghost"?"#374151":"#fff"}),
  input:{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #d1d5db",fontSize:13,color:"#111827",boxSizing:"border-box" as const},
  label:{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4},
  overlay:{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50},
  modal:{background:"#fff",borderRadius:12,padding:28,width:640,maxHeight:"90vh",overflowY:"auto" as const},
  fgroup:{marginBottom:12},
};

const DEPT_COLORS:Record<string,{bg:string,color:string,icon:React.ElementType}>={
  radiology:{bg:"#dbeafe",color:"#1d4ed8",icon:Activity},
  ward:{bg:"#d1fae5",color:"#065f46",icon:UserRound},
  ot:{bg:"#fef3c7",color:"#92400e",icon:MonitorPlay},
  general:{bg:"#f3f4f6",color:"#374151",icon:Building2},
};
function stockColor(qty:number,reorder:number){
  if(qty===0)return{bg:"#fee2e2",color:"#991b1b",label:"Out of Stock"};
  if(qty<=reorder)return{bg:"#fef3c7",color:"#92400e",label:"Low Stock"};
  return{bg:"#d1fae5",color:"#065f46",label:"OK"};
}

// -- Request Stock Modal (department requests from main store) -------------
function RequestStockModal({deptId,deptName,stock,onClose,onSuccess}:{deptId:string;deptName:string;stock:any[];onClose:()=>void;onSuccess:()=>void}){
  const [items,setItems]=useState<{itemId:string;itemName:string;quantity:number}[]>(
    stock.filter(i=>parseInt(i.quantity||0)<=parseInt(i.reorder_level||0))
      .map(i=>({itemId:i.id,itemName:i.name,quantity:Math.max(parseInt(i.reorder_level||0)-parseInt(i.quantity||0),1)}))
  );
  const [searchQ,setSearchQ]=useState("");
  const [searchResults,setSearchResults]=useState<any[]>([]);
  const [requestedBy,setRequestedBy]=useState("");
  const [notes,setNotes]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  useEffect(()=>{
    if(searchQ.length<2){setSearchResults([]);return;}
    const t=setTimeout(async()=>{
      try{const r=await fetch(`/api/hospital/items?search=${encodeURIComponent(searchQ)}`);const d=await r.json();setSearchResults(Array.isArray(d)?d.slice(0,6):[]);}
      catch{setSearchResults([]);}
    },250);
    return()=>clearTimeout(t);
  },[searchQ]);

  const addItem=(item:any)=>{
    if(items.find(i=>i.itemId===item.id))return;
    setItems(prev=>[...prev,{itemId:item.id,itemName:item.name,quantity:1}]);
    setSearchQ("");setSearchResults([]);
  };

  const save=async()=>{
    if(!requestedBy.trim()){setErr("Requested by is required");return;}
    if(!items.length){setErr("Add at least one item");return;}
    setLoading(true);setErr("");
    try{
      const res=await fetch("/api/hospital/transfers",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          toDepartmentId:deptId,
          sentBy:`REQUEST by ${requestedBy}`,
          notes:notes||`Stock request from ${deptName}`,
          items:items.map(i=>({itemId:i.itemId,itemName:i.itemName,quantity:i.quantity})),
          isRequest:true,
        })
      });
      if(!res.ok){const d=await res.json();setErr(d.error||"Failed");return;}
      onSuccess();onClose();
    }catch(e:any){setErr(e?.message||"Network error");}
    finally{setLoading(false);}
  };

  return(
    <div style={s.overlay}><div style={{...s.modal,width:680}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>Request Stock from Main Store</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Low/out-of-stock items are pre-filled. Edit quantities as needed.</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer"}}><X size={18} color="#6b7280"/></button>
      </div>
      {err&&<div style={{background:"#fee2e2",color:"#991b1b",borderRadius:8,padding:"8px 12px",fontSize:13,marginBottom:12}}>{err}</div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={s.fgroup}><label style={{...s.label,color:"#dc2626"}}>Requested By *</label><input style={s.input} value={requestedBy} onChange={e=>setRequestedBy(e.target.value)} placeholder="Your name"/></div>
        <div style={s.fgroup}><label style={s.label}>Notes</label><input style={s.input} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Reason or urgency..."/></div>
      </div>

      {/* Search to add more items */}
      <div style={{marginBottom:12,position:"relative"}}>
        <label style={s.label}>Add More Items</label>
        <div style={{position:"relative"}}>
          <div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><Search size={13} color="#9ca3af"/></div>
          <input style={{...s.input,paddingLeft:30}} value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search hospital inventory..."/>
        </div>
        {searchResults.length>0&&(
          <div style={{position:"absolute",left:0,right:0,top:"100%",background:"#fff",border:"1px solid #6366f1",borderRadius:8,zIndex:200,boxShadow:"0 4px 12px rgba(99,102,241,0.15)",marginTop:2,overflow:"hidden"}}>
            {searchResults.map(item=>(
              <div key={item.id} onClick={()=>addItem(item)} style={{padding:"9px 14px",cursor:"pointer",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between"}}
                onMouseEnter={e=>(e.currentTarget.style.background="#eef2ff")} onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                <div><div style={{fontWeight:600,fontSize:13}}>{item.name}</div><div style={{fontSize:11,color:"#9ca3af"}}>{item.uom} - Stock: {item.total_stock??0}</div></div>
                <span style={{background:"#6366f1",color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:6}}>+ Add</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items table */}
      {items.length===0?(
        <div style={{background:"#f9fafb",borderRadius:8,padding:"20px",textAlign:"center",color:"#9ca3af",marginBottom:12}}>No low/out-of-stock items. Search above to add.</div>
      ):(
        <div style={{border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden",marginBottom:16}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Item","Qty Needed",""].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map(item=>(
                <tr key={item.itemId}>
                  <td style={{...s.td,fontWeight:600}}>{item.itemName}</td>
                  <td style={s.td}><input type="number" min={1} value={item.quantity} onChange={e=>setItems(it=>it.map(i=>i.itemId===item.itemId?{...i,quantity:parseInt(e.target.value)||1}:i))} style={{...s.input,width:90,textAlign:"center" as const,padding:"5px 8px"}}/></td>
                  <td style={s.td}><button onClick={()=>setItems(it=>it.filter(i=>i.itemId!==item.itemId))} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer"}}><Trash2 size={12} color="#dc2626"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
        <button onClick={save} disabled={loading||!items.length||!requestedBy.trim()} style={{...s.btn("orange"),opacity:loading||!items.length||!requestedBy.trim()?0.5:1}}>{loading?"Sending...":"Send Request to Main Store"}</button>
      </div>
    </div></div>
  );
}

function TransferItemsList({transferId}:{transferId:string}){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{fetch(`/api/hospital/transfers/${transferId}`).then(r=>r.json()).then(d=>setItems(Array.isArray(d)?d:[]));},[transferId]);
  if(!items.length)return<div style={{fontSize:12,color:"#9ca3af"}}>Loading items...</div>;
  return<div>{items.map((item:any)=>(<div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f3f4f6",fontSize:13}}><span style={{fontWeight:600}}>{item.item_name}</span><span style={{color:"#6366f1",fontWeight:600}}>x{item.quantity}</span></div>))}</div>;
}

export default function DepartmentPage({params}:{params:Promise<{id:string}>}){
  type Tab="items"|"stock"|"dispense"|"receive"|"request"|"history"|"reports";
  const [id,setId]=useState("");
  const [dept,setDept]=useState<any>(null);
  const [tab,setTab]=useState<Tab>("stock");
  const [stock,setStock]=useState<any[]>([]);
  const [transfers,setTransfers]=useState<any[]>([]);
  const [history,setHistory]=useState<any[]>([]);
  const [historyTotal,setHistoryTotal]=useState(0);
  const [reports,setReports]=useState<any[]>([]);
  const [reportType,setReportType]=useState<"stock"|"consumption">("stock");
  const [loading,setLoading]=useState(false);
  const [toast,setToast]=useState("");
  const [dispenseModal,setDispenseModal]=useState(false);
  const [dispenseItems,setDispenseItems]=useState<{itemId:string;itemName:string;uom:string;available:number;quantity:string;reason:string}[]>([]);
  const [dispenseSearch,setDispenseSearch]=useState("");
  const [dispenseSearchResults,setDispenseSearchResults]=useState<any[]>([]);
  const [showRequestModal,setShowRequestModal]=useState(false);
  const [receiving,setReceiving]=useState<Record<string,{receivedBy:string}>>({});
  const [receiveLoading,setReceiveLoading]=useState<string|null>(null);
  const [editItem,setEditItem]=useState<any>(null);
  const [editForm,setEditForm]=useState({name:"",uom:"",unit_cost:"",reorder_level:""});
  const [dispenseForm,setDispenseForm]=useState({
    dispensedBy:"",
    bedNumber:"",wardNumber:"",doctorName:"",
    procedureType:"",contrastLot:"",contrastConcentration:"",contrastVolume:"",
    filmUsed:"",chemicalsUsed:"",accessories:"",
    surgeonName:"",anaesthetist:"",caseNumber:"",notes:""
  });

  const showToast=(msg:string)=>{setToast(msg);setTimeout(()=>setToast(""),3000);};

  useEffect(()=>{
    params.then(p=>{
      setId(p.id);
      fetch(`/api/hospital/departments/${p.id}`).then(r=>r.json()).then(d=>{if(d)setDept(d);});
    });
  },[params]);

  const fetchStock=useCallback(async()=>{
    if(!id)return;setLoading(true);
    try{const r=await fetch(`/api/hospital/stock?department_id=${id}`);const d=await r.json();setStock(Array.isArray(d)?d:[]);}
    catch(e){console.error(e);}finally{setLoading(false);}
  },[id]);

  const fetchTransfers=useCallback(async()=>{
    if(!id)return;
    try{const r=await fetch(`/api/hospital/transfers?department_id=${id}&status=PENDING`);const d=await r.json();setTransfers(Array.isArray(d)?d:[]);}
    catch(e){console.error(e);}
  },[id]);

  const fetchHistory=useCallback(async()=>{
    if(!id)return;
    try{const r=await fetch(`/api/hospital/history?department_id=${id}&page=1`);const d=await r.json();setHistory(d.rows??[]);setHistoryTotal(d.total??0);}
    catch(e){console.error(e);}
  },[id]);

  const fetchReports=useCallback(async()=>{
    if(!id)return;
    try{const r=await fetch(`/api/hospital/reports?type=${reportType}&department_id=${id}`);const d=await r.json();setReports(Array.isArray(d)?d:[]);}
    catch(e){console.error(e);}
  },[id,reportType]);

  useEffect(()=>{if(id){fetchStock();fetchTransfers();}},[id,fetchStock,fetchTransfers]);
  useEffect(()=>{if(id&&tab==="history")fetchHistory();},[id,tab,fetchHistory]);
  useEffect(()=>{if(id&&tab==="reports")fetchReports();},[id,tab,reportType,fetchReports]);

  const searchDispenseItems=async(q:string)=>{
    setDispenseSearch(q);
    if(!q.trim()){setDispenseSearchResults([]);return;}
    try{const r=await fetch(`/api/hospital/stock?department_id=${id}`);const d=await r.json();setDispenseSearchResults((Array.isArray(d)?d:[]).filter((i:any)=>i.name.toLowerCase().includes(q.toLowerCase())&&(parseInt(i.quantity||0)-parseInt(i.reserved_quantity||0))>0).slice(0,8));}
    catch(e){console.error(e);}
  };

  const handleDispense=async()=>{
    if(!dispenseItems.length){showToast("Add at least one item");return;}
    if(!dispenseForm.dispensedBy.trim()){showToast("Enter your name");return;}
    for(const di of dispenseItems){
      if(!di.reason.trim()){showToast(`Reason required for ${di.itemName}`);return;}
      if(!parseInt(di.quantity)||parseInt(di.quantity)<1){showToast(`Invalid quantity for ${di.itemName}`);return;}
    }
    const shared={departmentId:id,dispensedBy:dispenseForm.dispensedBy,bedNumber:dispenseForm.bedNumber,wardNumber:dispenseForm.wardNumber,doctorName:dispenseForm.doctorName,procedureType:dispenseForm.procedureType,surgeonName:dispenseForm.surgeonName,anaesthetist:dispenseForm.anaesthetist,caseNumber:dispenseForm.caseNumber,contrastLot:dispenseForm.contrastLot,contrastConcentration:dispenseForm.contrastConcentration,contrastVolume:dispenseForm.contrastVolume,filmUsed:dispenseForm.filmUsed,chemicalsUsed:dispenseForm.chemicalsUsed,accessories:dispenseForm.accessories,notes:dispenseForm.notes};
    const errors:string[]=[];
    for(const di of dispenseItems){
      const res=await fetch("/api/hospital/dispenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...shared,itemId:di.itemId,quantity:parseInt(di.quantity),reason:di.reason})});
      if(!res.ok){const e=await res.json();errors.push(`${di.itemName}: ${e.error??'failed'}`);}
    }
    if(errors.length){showToast(errors[0]);return;}
    showToast(`${dispenseItems.length} item${dispenseItems.length>1?"s":""} dispensed!`);
    setDispenseModal(false);setDispenseItems([]);setDispenseSearch("");
    setDispenseForm({dispensedBy:"",bedNumber:"",wardNumber:"",doctorName:"",procedureType:"",contrastLot:"",contrastConcentration:"",contrastVolume:"",filmUsed:"",chemicalsUsed:"",accessories:"",surgeonName:"",anaesthetist:"",caseNumber:"",notes:""});
    fetchStock();
  };

  const handleReceive=async(transferId:string)=>{
    const rb=receiving[transferId];
    if(!rb?.receivedBy.trim()){showToast("Enter receiver name");return;}
    setReceiveLoading(transferId);
    try{
      const res=await fetch(`/api/hospital/transfers/${transferId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"RECEIVED",receivedBy:rb.receivedBy})});
      const data=await res.json();
      if(!res.ok){showToast(data.error||"Receive failed");return;}
      showToast("OK Received! Stock updated.");
      fetchTransfers();fetchStock();
    }catch(e:any){showToast(e?.message||"Network error");}
    finally{setReceiveLoading(null);}
  };

  const deptType=dept?.type??"general";
  const dc=DEPT_COLORS[deptType]??DEPT_COLORS.general;
  const totalStock=stock.length;
  const lowStock=stock.filter(i=>parseInt(i.quantity||0)>0&&parseInt(i.quantity||0)<=parseInt(i.reorder_level||0)).length;
  const outOfStock=stock.filter(i=>parseInt(i.quantity||0)===0).length;
  const pendingTransfers=transfers.length;

  return(
    <div style={s.page}>
      <style>{`* { box-sizing: border-box; } input, select { color: #111827 !important; } tr:hover td { background: #f9fafb; }`}</style>
      <div style={s.header}>
        <Link href="/hospital" style={{display:"flex",alignItems:"center",color:"#6b7280",textDecoration:"none"}}><ArrowLeft size={15}/></Link>
        <div style={{width:1,height:20,background:"#e5e7eb"}}/>
        <div style={{width:32,height:32,background:dc.bg,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}><dc.icon size={18} /></div>
        <div>
          <span style={{fontSize:14,fontWeight:700}}>{dept?.name??"Loading..."}</span>
          {dept&&<span style={{fontSize:11,color:"#6b7280",marginLeft:8}}>- {dept.type} - {dept.location||"No location"}</span>}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>fetchStock()} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:5}}><RefreshCw size={13} color="#374151"/></button>
          {(lowStock>0||outOfStock>0)&&(
            <button onClick={()=>setShowRequestModal(true)} style={{...s.btn("orange"),display:"flex",alignItems:"center",gap:6}}>
              Request Stock {outOfStock>0&&<span style={{background:"#fff",color:"#d97706",borderRadius:20,fontSize:10,fontWeight:700,padding:"1px 6px"}}>{outOfStock} out</span>}
            </button>
          )}
          {pendingTransfers>0&&<button onClick={()=>setTab("receive")} style={{...s.btn("blue"),display:"flex",alignItems:"center",gap:6}}>Receive ({pendingTransfers})</button>}
          <button onClick={()=>setDispenseModal(true)} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}>+ Dispense</button>
        </div>
      </div>

      <div style={{...s.content,marginTop:8}}>
        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {label:"Items in Dept",value:totalStock,color:dc.color,bg:dc.bg},
            {label:"Low Stock",value:lowStock,color:"#d97706",bg:"#fef3c7"},
            {label:"Out of Stock",value:outOfStock,color:"#dc2626",bg:"#fee2e2"},
            {label:"Pending Transfers",value:pendingTransfers,color:"#0891b2",bg:"#e0f2fe"},
          ].map(m=>(
            <div key={m.label} style={{background:m.bg,borderRadius:10,padding:"14px 18px"}}>
              <div style={{fontSize:11,fontWeight:600,color:m.color,marginBottom:4}}>{m.label}</div>
              <div style={{fontSize:28,fontWeight:700}}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Out of stock alert banner */}
        {outOfStock>0&&(
          <div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>!</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#991b1b"}}>{outOfStock} item{outOfStock!==1?"s":""} out of stock</div>
                <div style={{fontSize:12,color:"#b91c1c"}}>Request a transfer from Main Store to restock</div>
              </div>
            </div>
            <button onClick={()=>setShowRequestModal(true)} style={{...s.btn("red"),display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" as const}}>Request from Main Store</button>
          </div>
        )}

        {/* Low stock alert */}
        {lowStock>0&&outOfStock===0&&(
          <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>!</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#92400e"}}>{lowStock} item{lowStock!==1?"s":""} running low</div>
                <div style={{fontSize:12,color:"#b45309"}}>Consider requesting more stock from Main Store</div>
              </div>
            </div>
            <button onClick={()=>setShowRequestModal(true)} style={{...s.btn("orange"),display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" as const}}>Request Stock</button>
          </div>
        )}

        {/* Tabs */}
        <div style={s.tabs}>
          {(["items","stock","dispense","receive","request","history","reports"] as Tab[]).map(t=>(
            <button key={t} style={s.tab(tab===t)} onClick={()=>setTab(t)}>
              {t==="receive"&&pendingTransfers>0?`Receive (${pendingTransfers})`:
               t==="request"?"Request Stock":
               t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* -- ITEMS / STOCK TAB ---------------------------------------- */}
        {(tab==="items"||tab==="stock")&&(
          <>
            {editItem&&(
              <div style={s.overlay}><div style={{...s.modal,width:460}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Edit - {editItem.name}</h3>
                  <button onClick={()=>setEditItem(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={18} color="#6b7280"/></button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Name</label><input style={s.input} value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>UOM</label><input style={s.input} value={editForm.uom} onChange={e=>setEditForm(f=>({...f,uom:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Reorder Level</label><input type="number" style={s.input} value={editForm.reorder_level} onChange={e=>setEditForm(f=>({...f,reorder_level:e.target.value}))}/></div>
                  <div style={s.fgroup}><label style={s.label}>Unit Cost</label><input type="number" step="0.01" style={s.input} value={editForm.unit_cost} onChange={e=>setEditForm(f=>({...f,unit_cost:e.target.value}))}/></div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
                  <button onClick={()=>setEditItem(null)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
                  <button onClick={async()=>{await fetch(`/api/hospital/items/${editItem.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...editItem,...editForm,reorder_level:parseInt(editForm.reorder_level)||0,unit_cost:parseFloat(editForm.unit_cost)||null})});setEditItem(null);fetchStock();showToast("Updated!");}} style={s.btn("purple")}>Save</button>
                </div>
              </div></div>
            )}
            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:600}}>{dept?.name} - Current Stock</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#9ca3af"}}>{stock.length} items</span>
                  <button onClick={fetchStock} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",fontSize:11,padding:"4px 10px"}}>Refresh</button>
                </div>
              </div>
              {loading?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>Loading...</div>
              :stock.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No stock in this department. Request a transfer from Main Store.</div>
              :(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Item","Code","UOM","In Stock","Reserved","Available","Reorder","Expiry","Status","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {stock.map((item:any)=>{
                        const avail=parseInt(item.quantity||0)-parseInt(item.reserved_quantity||0);
                        const sc=stockColor(avail,parseInt(item.reorder_level||0));
                        return(
                          <tr key={item.id}>
                            <td style={{...s.td,minWidth:140,fontWeight:600}}>{item.name}{item.generic_name&&<div style={{fontSize:11,color:"#9ca3af"}}>{item.generic_name}</div>}</td>
                            <td style={{...s.td,fontFamily:"monospace",fontSize:11,color:"#6b7280"}}>{item.itemcode}</td>
                            <td style={s.td}>{item.uom}</td>
                            <td style={{...s.td,fontWeight:700}}>{item.quantity||0}</td>
                            <td style={{...s.td,color:"#d97706"}}>{item.reserved_quantity||0}</td>
                            <td style={{...s.td,fontWeight:700,color:sc.color}}>{avail}</td>
                            <td style={{...s.td,color:"#6b7280"}}>{item.reorder_level||0}</td>
                            <td style={{...s.td,fontSize:12,color:item.nearest_expiry&&new Date(item.nearest_expiry)<new Date(Date.now()+30*86400000)?"#dc2626":"#6b7280"}}>{item.nearest_expiry?new Date(item.nearest_expiry).toLocaleDateString():"-"}</td>
                            <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span></td>
                            <td style={s.td}>
                              <div style={{display:"flex",gap:4}}>
                                <button onClick={()=>{const avail=parseInt(item.quantity||0)-parseInt(item.reserved_quantity||0);setDispenseItems([{itemId:item.id,itemName:item.name,uom:item.uom||"",available:avail,quantity:"1",reason:""}]);setDispenseModal(true);}} style={{...s.btn("purple"),padding:"4px 10px",fontSize:11}}>Dispense</button>
                                <button onClick={()=>{setEditItem(item);setEditForm({name:item.name,uom:item.uom,unit_cost:item.unit_cost??"",reorder_level:item.reorder_level??"0"});}} style={{background:"#f0fdf4",border:"none",borderRadius:6,padding:"5px 7px",cursor:"pointer"}}><Edit size={12} color="#16a34a"/></button>
                                {parseInt(item.quantity||0)===0&&<button onClick={()=>setShowRequestModal(true)} style={{...s.btn("orange"),padding:"4px 8px",fontSize:10}}>Request</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* -- DISPENSE TAB -------------------------------------------- */}
        {tab==="dispense"&&(
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600}}>Dispense from {dept?.name}</span>
              <button onClick={()=>setDispenseModal(true)} style={{...s.btn("purple"),display:"flex",alignItems:"center",gap:6}}><Plus size={13} color="#fff"/> New Dispense</button>
            </div>
            <div style={{padding:40,textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}><dc.icon size={36} /></div>
              <div style={{fontSize:14,fontWeight:600,color:"#374151"}}>Select an item to dispense</div>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:4,marginBottom:20}}>Go to Stock tab and click Dispense on any item, or click below</div>
              <button onClick={()=>setDispenseModal(true)} style={{...s.btn("purple"),fontSize:13,padding:"10px 24px"}}>+ New Dispense</button>
            </div>
          </div>
        )}

        {/* -- REQUEST STOCK TAB --------------------------------------- */}
        {tab==="request"&&(
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <span style={{fontSize:13,fontWeight:600}}>Request Stock from Main Store</span>
                <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Low and out-of-stock items are shown below</div>
              </div>
              <button onClick={()=>setShowRequestModal(true)} style={{...s.btn("orange"),display:"flex",alignItems:"center",gap:6}}>New Request</button>
            </div>
            {/* Show items that need restocking */}
            {stock.filter(i=>parseInt(i.quantity||0)<=parseInt(i.reorder_level||0)).length===0?(
              <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:32,marginBottom:8}}>OK</div><div style={{fontSize:14,fontWeight:600}}>All items are well stocked</div></div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Item","In Stock","Reorder Level","Status","Action"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {stock.filter(i=>parseInt(i.quantity||0)<=parseInt(i.reorder_level||0)).map((item:any)=>{
                      const sc=stockColor(parseInt(item.quantity||0),parseInt(item.reorder_level||0));
                      const needed=Math.max(parseInt(item.reorder_level||0)-parseInt(item.quantity||0),1);
                      return(
                        <tr key={item.id}>
                          <td style={{...s.td,fontWeight:600}}>{item.name}</td>
                          <td style={{...s.td,fontWeight:700,color:sc.color}}>{item.quantity||0} {item.uom}</td>
                          <td style={{...s.td,color:"#6b7280"}}>{item.reorder_level||0}</td>
                          <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span></td>
                          <td style={s.td}><div style={{fontSize:12,color:"#6b7280"}}>Need ~<strong>{needed}</strong> {item.uom}<button onClick={()=>setShowRequestModal(true)} style={{marginLeft:8,...s.btn("orange"),padding:"3px 8px",fontSize:11}}>Request</button></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* -- RECEIVE TAB -------------------------------------------- */}
        {tab==="receive"&&(
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600}}>Incoming Transfers - Pending</span>
              <button onClick={fetchTransfers} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:5}}><RefreshCw size={13}/></button>
            </div>
            {transfers.length===0?(
              <div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>
                <div style={{fontSize:36,marginBottom:8}}><Package size={36} color="#d1d5db"/></div>
                <div style={{fontSize:14,fontWeight:600}}>No pending transfers</div>
                <div style={{fontSize:12,marginTop:4}}>Transfers from Main Store appear here. Use "Request Stock" to ask for items.</div>
              </div>
            ):(
              transfers.map(t=>(
                <div key={t.id} style={{borderBottom:"1px solid #f3f4f6",padding:"16px 20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:"monospace",fontSize:11,color:"#6366f1",fontWeight:600,marginBottom:2}}>{t.transfer_number}</div>
                      <div style={{fontSize:14,fontWeight:600}}>Transfer - {t.item_count??0} items</div>
                      <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Sent by: <strong>{t.sent_by??"Unknown"}</strong> - {new Date(t.createdat).toLocaleDateString()}</div>
                      {t.notes&&<div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>Note: {t.notes}</div>}
                    </div>
                    <span style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,background:"#fef3c7",color:"#92400e"}}>PENDING</span>
                  </div>
                  <div style={{background:"#f9fafb",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                    <TransferItemsList transferId={t.id}/>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <input placeholder="Received by (your name) *" value={receiving[t.id]?.receivedBy??""}
                      onChange={e=>setReceiving(r=>({...r,[t.id]:{receivedBy:e.target.value}}))}
                      style={{...s.input,maxWidth:280}}/>
                    <button disabled={receiveLoading===t.id} onClick={()=>handleReceive(t.id)}
                      style={{...s.btn("green"),display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap" as const}}>
                      {receiveLoading===t.id?"Confirming...":"OK Confirm Receipt"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* -- HISTORY TAB -------------------------------------------- */}
        {tab==="history"&&(
          <div style={s.card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:600}}>Department History</span>
              <span style={{fontSize:12,color:"#9ca3af"}}>{historyTotal} transactions</span>
            </div>
            {history.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No history yet</div>:(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Item","Action","Qty","Reference","By","Date"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {history.map((h:any)=>{
                      const colors:Record<string,[string,string]>={STOCK_IN:["#d1fae5","#065f46"],STOCK_OUT:["#fee2e2","#991b1b"],TRANSFER:["#dbeafe","#1d4ed8"],DISPENSE:["#ede9fe","#5b21b6"]};
                      const [bg,color]=colors[h.action_type]??["#f3f4f6","#374151"];
                      return(
                        <tr key={h.id}>
                          <td style={{...s.td,fontWeight:600}}>{h.item_name??"-"}</td>
                          <td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:bg,color}}>{h.action_type}</span></td>
                          <td style={{...s.td,fontWeight:700,color:["STOCK_IN","TRANSFER"].includes(h.action_type)?"#16a34a":"#dc2626"}}>{["STOCK_IN","TRANSFER"].includes(h.action_type)?"+":"-"}{h.quantity}</td>
                          <td style={{...s.td,fontFamily:"monospace",fontSize:11}}>{h.reference_id??"-"}</td>
                          <td style={s.td}>{h.created_by??"-"}</td>
                          <td style={{...s.td,fontSize:12,color:"#6b7280"}}>{new Date(h.createdat).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* -- REPORTS TAB -------------------------------------------- */}
        {tab==="reports"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {(["stock","consumption"] as const).map(type=>(<button key={type} onClick={()=>setReportType(type)} style={{padding:"8px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",border:`1px solid ${reportType===type?"#6366f1":"#e5e7eb"}`,background:reportType===type?"#6366f1":"#fff",color:reportType===type?"#fff":"#374151"}}>{type==="stock"?"Stock":"Consumption"}</button>))}
              <button onClick={()=>{const NL=String.fromCharCode(10);const csv=[reports.length>0?Object.keys(reports[0]).join(","):"",...reports.map(r=>Object.values(r).join(","))].join(NL);const blob=new Blob([csv],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${dept?.name||"dept"}-${reportType}.csv`;a.click();}} style={{...s.btn("ghost"),border:"1px solid #e5e7eb",marginLeft:"auto",display:"flex",alignItems:"center",gap:5}}><Download size={13}/> CSV</button>
            </div>
            <div style={s.card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6"}}><span style={{fontSize:13,fontWeight:600}}>{reportType==="stock"?"Stock on Hand":"Consumption"} - {dept?.name}</span></div>
              {reports.length===0?<div style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No data</div>:(
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{reportType==="stock"?["Item","UOM","Stock","Available","Reorder","Cost","Value","Status"].map(h=><th key={h} style={s.th}>{h}</th>):["Item","Action","Total Qty","Transactions","Last Movement"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {reports.map((r:any,i:number)=>{
                        if(reportType==="stock"){const avail=parseInt(r.available||r.total_stock||0);const sc=stockColor(avail,parseInt(r.reorder_level||0));return(<tr key={i}><td style={{...s.td,fontWeight:600}}>{r.name}</td><td style={s.td}>{r.uom}</td><td style={{...s.td,fontWeight:700}}>{r.total_stock||0}</td><td style={{...s.td,fontWeight:700,color:sc.color}}>{avail}</td><td style={{...s.td,color:"#6b7280"}}>{r.reorder_level||0}</td><td style={s.td}>{r.unit_cost?`$${parseFloat(r.unit_cost).toFixed(2)}`:"-"}</td><td style={{...s.td,fontWeight:600,color:"#6366f1"}}>${(avail*parseFloat(r.unit_cost||0)).toFixed(2)}</td><td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:sc.bg,color:sc.color}}>{sc.label}</span></td></tr>);}
                        return(<tr key={i}><td style={{...s.td,fontWeight:600}}>{r.item_name}</td><td style={s.td}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#ede9fe",color:"#5b21b6"}}>{r.action_type}</span></td><td style={{...s.td,fontWeight:700}}>{r.total_qty}</td><td style={s.td}>{r.tx_count}</td><td style={{...s.td,fontSize:12,color:"#6b7280"}}>{r.last_moved?new Date(r.last_moved).toLocaleDateString():"-"}</td></tr>);
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dispense Modal */}
      {dispenseModal&&(
        <div style={s.overlay}><div style={{...s.modal,width:720,maxHeight:"92vh"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:16,fontWeight:600,margin:0}}><dc.icon size={20} /> Dispense - {dept?.name}</h3>
            <button onClick={()=>setDispenseModal(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={18} color="#6b7280"/></button>
          </div>

          {/* Item search */}
          <div style={{marginBottom:12}}>
            <label style={s.label}>Add Items</label>
            <div style={{position:"relative"}}>
              <input style={s.input} value={dispenseSearch} onChange={e=>searchDispenseItems(e.target.value)} placeholder="Search department stock to add items..."/>
              {dispenseSearchResults.length>0&&(
                <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:"1px solid #6366f1",borderRadius:8,zIndex:100,maxHeight:220,overflowY:"auto" as const,boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
                  {dispenseSearchResults.map(item=>{
                    const alreadyAdded=dispenseItems.some(d=>d.itemId===item.id);
                    const avail=parseInt(item.quantity||0)-parseInt(item.reserved_quantity||0);
                    return(
                      <div key={item.id} onClick={()=>{
                        if(alreadyAdded)return;
                        setDispenseItems(prev=>[...prev,{itemId:item.id,itemName:item.name,uom:item.uom||"",available:avail,quantity:"1",reason:""}]);
                        setDispenseSearch("");setDispenseSearchResults([]);
                      }} style={{padding:"10px 14px",cursor:alreadyAdded?"default":"pointer",borderBottom:"1px solid #f9fafb",display:"flex",justifyContent:"space-between",alignItems:"center",opacity:alreadyAdded?0.5:1}} onMouseEnter={e=>{if(!alreadyAdded)e.currentTarget.style.background="#f9fafb";}} onMouseLeave={e=>(e.currentTarget.style.background="#fff")}>
                        <div><div style={{fontWeight:600,fontSize:13}}>{item.name}</div><div style={{fontSize:11,color:"#6b7280"}}>Available: <strong style={{color:avail===0?"#dc2626":"#16a34a"}}>{avail}</strong> {item.uom}</div></div>
                        {alreadyAdded?<span style={{fontSize:11,color:"#9ca3af"}}>Added</span>:<span style={{fontSize:11,color:"#6366f1",fontWeight:600}}>+ Add</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Items list - per-item qty + reason */}
          {dispenseItems.length>0&&(
            <div style={{border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden",marginBottom:16}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Item","Available","Qty","Reason",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {dispenseItems.map((di,idx)=>(
                    <tr key={di.itemId}>
                      <td style={{padding:"8px 10px",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>{di.itemName}</td>
                      <td style={{padding:"8px 10px",fontSize:12,color:di.available===0?"#dc2626":"#16a34a",fontWeight:600,whiteSpace:"nowrap"}}>{di.available} {di.uom}</td>
                      <td style={{padding:"8px 10px"}}>
                        <input type="text" inputMode="numeric" value={di.quantity} onChange={e=>setDispenseItems(prev=>prev.map((d,i)=>i===idx?{...d,quantity:e.target.value.replace(/[^0-9]/g,"")||""}:d))} style={{width:64,padding:"5px 8px",borderRadius:7,border:"1px solid #d1d5db",fontSize:13,textAlign:"center"}}/>
                      </td>
                      <td style={{padding:"8px 10px"}}>
                        <input value={di.reason} onChange={e=>setDispenseItems(prev=>prev.map((d,i)=>i===idx?{...d,reason:e.target.value}:d))} placeholder="Reason *" style={{width:"100%",padding:"5px 8px",borderRadius:7,border:`1px solid ${di.reason?"#d1d5db":"#fca5a5"}`,fontSize:13,boxSizing:"border-box" as const}}/>
                      </td>
                      <td style={{padding:"8px 10px"}}><button onClick={()=>setDispenseItems(prev=>prev.filter((_,i)=>i!==idx))} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer"}}><Trash2 size={12} color="#dc2626"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {dispenseItems.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#9ca3af",fontSize:13,marginBottom:12}}>Search above to add items to this dispense</div>}

          {/* Shared fields */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={{...s.label,color:"#dc2626"}}>Dispensed By *</label><input style={s.input} value={dispenseForm.dispensedBy} onChange={e=>setDispenseForm(f=>({...f,dispensedBy:e.target.value}))} placeholder="Your name"/></div>
            {deptType==="ward"&&<>
              <div style={s.fgroup}><label style={s.label}>Bed Number</label><input style={s.input} value={dispenseForm.bedNumber} onChange={e=>setDispenseForm(f=>({...f,bedNumber:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Ward Number</label><input style={s.input} value={dispenseForm.wardNumber} onChange={e=>setDispenseForm(f=>({...f,wardNumber:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Doctor Name</label><input style={s.input} value={dispenseForm.doctorName} onChange={e=>setDispenseForm(f=>({...f,doctorName:e.target.value}))}/></div>
            </>}
            {deptType==="radiology"&&<>
              <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={{...s.label,color:"#1d4ed8"}}>Procedure Type</label>
                <select style={s.input} value={dispenseForm.procedureType} onChange={e=>setDispenseForm(f=>({...f,procedureType:e.target.value}))}>
                  <option value="">Select procedure</option>
                  {["CT","MRI","X-Ray","Ultrasound","Mammography","Fluoroscopy","Angiography"].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={s.fgroup}><label style={s.label}>Contrast Lot</label><input style={s.input} value={dispenseForm.contrastLot} onChange={e=>setDispenseForm(f=>({...f,contrastLot:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Concentration</label><input style={s.input} value={dispenseForm.contrastConcentration} onChange={e=>setDispenseForm(f=>({...f,contrastConcentration:e.target.value}))} placeholder="e.g. 370mg/ml"/></div>
              <div style={s.fgroup}><label style={s.label}>Volume (ml)</label><input style={s.input} value={dispenseForm.contrastVolume} onChange={e=>setDispenseForm(f=>({...f,contrastVolume:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Film Used</label><input style={s.input} value={dispenseForm.filmUsed} onChange={e=>setDispenseForm(f=>({...f,filmUsed:e.target.value}))}/></div>
            </>}
            {deptType==="ot"&&<>
              <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={{...s.label,color:"#92400e"}}>Surgery / Procedure</label><input style={s.input} value={dispenseForm.procedureType} onChange={e=>setDispenseForm(f=>({...f,procedureType:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Surgeon</label><input style={s.input} value={dispenseForm.surgeonName} onChange={e=>setDispenseForm(f=>({...f,surgeonName:e.target.value}))}/></div>
              <div style={s.fgroup}><label style={s.label}>Anaesthetist</label><input style={s.input} value={dispenseForm.anaesthetist} onChange={e=>setDispenseForm(f=>({...f,anaesthetist:e.target.value}))}/></div>
              <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Case Number</label><input style={s.input} value={dispenseForm.caseNumber} onChange={e=>setDispenseForm(f=>({...f,caseNumber:e.target.value}))}/></div>
            </>}
            <div style={{gridColumn:"1/-1",...s.fgroup}}><label style={s.label}>Notes</label><input style={s.input} value={dispenseForm.notes} onChange={e=>setDispenseForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>

          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
            <button onClick={()=>setDispenseModal(false)} style={{...s.btn("ghost"),border:"1px solid #e5e7eb"}}>Cancel</button>
            <button onClick={handleDispense} style={s.btn("purple")} disabled={!dispenseItems.length}>
              Dispense {dispenseItems.length>0?`(${dispenseItems.length} item${dispenseItems.length>1?"s":""})`: ""}
            </button>
          </div>
        </div></div>
      )}

      {showRequestModal&&(
        <RequestStockModal
          deptId={id} deptName={dept?.name||"Department"} stock={stock}
          onClose={()=>setShowRequestModal(false)}
          onSuccess={()=>{fetchTransfers();showToast("Request sent to Main Store! They will see it in Transfers.");}}
        />
      )}

      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:"#16a34a",color:"#fff",padding:"11px 18px",borderRadius:10,fontSize:13,fontWeight:600,zIndex:2000}}>OK {toast}</div>}
    </div>
  );
}
