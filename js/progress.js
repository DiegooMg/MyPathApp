/* Build a name lookup from all known exercise sources */
function buildIdNames(){
  const m={};
  // 1. Static routine
  Object.values(ROUTINE).forEach(d=>{if(d.exercises)d.exercises.forEach(e=>m[e.id]=e.name)});
  // 2. AI/custom routine
  if(state.customRoutine)Object.values(state.customRoutine).forEach(d=>{if(d.exercises)d.exercises.forEach(e=>m[e.id]=e.name)});
  // 3. Persistent custom exercises
  if(state.customExercises)Object.values(state.customExercises).forEach(arr=>arr.forEach(e=>{if(e&&e.id&&e.name)m[e.id]=e.name}));
  // 4. Session-level _custom arrays, override names, and alt exercise names
  Object.values(state.sessions).forEach(dayMap=>{
    Object.values(dayMap).forEach(exMap=>{
      if(exMap._custom)exMap._custom.forEach(e=>{if(e&&e.id&&e.name)m[e.id]=e.name});
      Object.entries(exMap).forEach(([id,data])=>{
        if(id==='_custom'||!data)return;
        if(data.override&&data.override.name)m[id]=data.override.name;
        if(id.startsWith('alt_')&&data._name)m[id]=data._name;
      });
    });
  });
  return m;
}

function renderProgress(){
  /* ---- Stats ---- */
  let sessions=0,volume=0,prs=0;
  const exBest={};
  const weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
  Object.entries(state.sessions).forEach(([date,dayMap])=>{
    const dt=new Date(date+'T12:00:00');
    Object.entries(dayMap).forEach(([dayN,exMap])=>{
      let sessionHasData=false;
      Object.entries(exMap).forEach(([exId,data])=>{
        if(exId==='_custom'||!data||!data.sets)return;
        data.sets.forEach(s=>{
          if(s.d||(s.w!==''&&s.r!=='')){
            sessionHasData=true;
            if(s.w!==''&&s.r!==''){
              const vol=parseFloat(s.w)*parseInt(s.r);
              if(!isNaN(vol)&&dt>=weekAgo)volume+=vol;
              const w=parseFloat(s.w);
              if(!isNaN(w)){
                if(!exBest[exId]||w>exBest[exId].w){
                  if(exBest[exId])prs++;
                  exBest[exId]={w,date};
                }
              }
            }
          }
        });
      });
      if(sessionHasData)sessions++;
    });
  });
  document.getElementById('statSessions').textContent=sessions;
  document.getElementById('statVolume').textContent=Math.round(volume).toLocaleString('es-ES');
  document.getElementById('statPRs').textContent=prs;

  /* ---- Racha ---- */
  let streak=0;
  const today=new Date();today.setHours(0,0,0,0);
  for(let i=0;i<365;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const dk=d.toISOString().split('T')[0];
    const sess=state.sessions[dk];
    if(sess){
      let hasData=false;
      Object.values(sess).forEach(exMap=>{
        Object.entries(exMap).forEach(([id,e])=>{
          if(id!=='_custom'&&e&&e.sets&&e.sets.some(s=>s.w!==''||s.r!==''))hasData=true;
        });
      });
      if(hasData){streak++;continue}
    }
    if(i===0)continue;
    break;
  }
  document.getElementById('statStreak').textContent=streak;

  /* ---- Populate exercise picker ---- */
  const idNames=buildIdNames();

  // Collect every exercise ID that has at least one set with a weight, a rep count, or a done-check
  const exSet=new Set();
  Object.values(state.sessions).forEach(dayMap=>{
    Object.values(dayMap).forEach(exMap=>{
      Object.entries(exMap).forEach(([id,data])=>{
        if(id==='_custom'||!data||!data.sets)return;
        if(data.sets.some(s=>s.w!==''||s.r!==''||s.d===true))exSet.add(id);
      });
    });
  });

  const picker=document.getElementById('exPicker');
  const sub=document.getElementById('exChartSub');
  const prev=picker.value;

  if(exSet.size===0){
    picker.innerHTML='<option value="">Sin sesiones registradas aún</option>';
    sub.textContent='Completá entrenamientos para ver el progreso aquí';
  }else{
    picker.innerHTML='<option value="">— Elegí un ejercicio ('+exSet.size+') —</option>';
    Array.from(exSet)
      .sort((a,b)=>(idNames[a]||a).localeCompare(idNames[b]||b,'es'))
      .forEach(id=>{
        const o=document.createElement('option');
        o.value=id;
        o.textContent=idNames[id]||id;
        picker.appendChild(o);
      });
    sub.textContent='Tocá el selector para elegir un ejercicio y ver su gráfico';
  }
  if(prev&&exSet.has(prev))picker.value=prev;

  drawBodyweightChart();
  drawExerciseChart();
}

function addBodyweight(){
  const v=parseFloat(document.getElementById('bwInput').value);
  if(!v||v<30||v>300){toast('Peso inválido');return}
  const dk=todayKey();
  const existing=state.bodyweight.find(b=>b.date===dk);
  if(existing)existing.w=v;
  else state.bodyweight.push({date:dk,w:v});
  state.bodyweight.sort((a,b)=>a.date.localeCompare(b.date));
  save();
  document.getElementById('bwInput').value='';
  toast('Peso guardado');
  renderProgress();
}

function drawBodyweightChart(){
  const cv=document.getElementById('bwChart');
  const data=state.bodyweight.slice(-30);
  drawLineChart(cv,data.map(d=>({x:d.date,y:d.w})),'kg');
  const sub=document.getElementById('bwSub');
  if(data.length>=2){
    const delta=(data[data.length-1].w-data[0].w).toFixed(1);
    sub.textContent=`${data[0].w}kg → ${data[data.length-1].w}kg (${delta>0?'+':''}${delta}kg últimos ${data.length} registros)`;
  }else if(data.length===1){
    sub.textContent=`Último registro: ${data[0].w} kg (${data[0].date})`;
  }
}

function drawExerciseChart(){
  const cv=document.getElementById('exChart');
  const id=document.getElementById('exPicker').value;
  const histEl=document.getElementById('exHistory');
  const sub=document.getElementById('exChartSub');
  if(!id){
    clearCanvas(cv);
    histEl.innerHTML='';
    sub.textContent='Tocá el selector para elegir un ejercicio';
    return;
  }

  const idNames=buildIdNames();
  const name=idNames[id]||id;
  const pts=[];

  Object.keys(state.sessions).sort().forEach(date=>{
    Object.values(state.sessions[date]).forEach(exMap=>{
      const data=exMap[id];
      if(!data||!data.sets)return;
      const filled=data.sets.filter(s=>s.w!==''&&s.r!=='');
      if(!filled.length)return;
      const maxW=Math.max(...filled.map(s=>parseFloat(s.w)));
      const totalVol=filled.reduce((sum,s)=>sum+parseFloat(s.w)*parseInt(s.r),0);
      // deduplicate: if same date already added, keep highest weight
      const existing=pts.find(p=>p.x===date);
      if(existing){if(maxW>existing.y){existing.y=maxW;existing.vol=Math.round(totalVol);existing.filled=filled}}
      else pts.push({x:date,y:maxW,vol:Math.round(totalVol),filled});
    });
  });

  drawLineChart(cv,pts.slice(-20),'kg');
  sub.textContent=name+(pts.length>0?' · '+pts.length+' sesiones':'');

  if(pts.length===0){
    histEl.innerHTML='<div style="text-align:center;color:var(--muted);font-size:12px;padding:12px 0">Sin datos de peso para este ejercicio</div>';
    return;
  }

  histEl.innerHTML=pts.slice(-10).reverse().map(p=>{
    const setsStr=p.filled.map(s=>`${s.w}kg×${s.r}`).join(' · ');
    return `<div class="history-item">
      <div class="history-row">
        <span class="history-date">${p.x}</span>
        <span class="history-max">${p.y} kg max</span>
      </div>
      <div class="history-sets">${setsStr}</div>
      <div class="history-vol">Vol. sesión: ${p.vol} kg · ${p.filled.length} sets</div>
    </div>`;
  }).join('');
}

function exportExerciseProgress(){
  const id=document.getElementById('exPicker').value;
  if(!id){toast('Elegí un ejercicio primero');return}
  const idNames=buildIdNames();
  const name=idNames[id]||id;
  const rows=[['Ejercicio','Fecha','Set','Peso (kg)','Reps','Volumen (kg)']];
  Object.keys(state.sessions).sort().forEach(date=>{
    Object.values(state.sessions[date]).forEach(exMap=>{
      const data=exMap[id];
      if(!data||!data.sets)return;
      data.sets.forEach((s,i)=>{
        if(s.w!==''||s.r!==''){
          const w=parseFloat(s.w)||0;const r=parseInt(s.r)||0;
          rows.push(['"'+name+'"',date,i+1,s.w||'',s.r||'',w&&r?w*r:'']);
        }
      });
    });
  });
  if(rows.length<=1){toast('Sin datos para exportar');return}
  _downloadCSV(rows,'mypath_'+name.replace(/[^a-zA-Z0-9áéíóúñü]/gi,'_')+'_'+todayKey()+'.csv');
  toast('✓ CSV descargado');
}

function exportAllProgress(){
  const idNames=buildIdNames();
  const rows=[['Ejercicio','Fecha','Dia Rutina','Set','Peso (kg)','Reps','Completado','Volumen (kg)']];
  Object.keys(state.sessions).sort().forEach(date=>{
    Object.entries(state.sessions[date]).forEach(([dayN,exMap])=>{
      Object.entries(exMap).forEach(([exId,data])=>{
        if(exId==='_custom'||!data||!data.sets)return;
        const name=idNames[exId]||exId;
        data.sets.forEach((s,i)=>{
          if(s.w!==''||s.r!==''||s.d){
            const w=parseFloat(s.w)||0;const r=parseInt(s.r)||0;
            rows.push(['"'+name+'"',date,dayN,i+1,s.w||'',s.r||'',s.d?1:0,w&&r?w*r:'']);
          }
        });
      });
    });
  });
  if(rows.length<=1){toast('Sin sesiones con datos para exportar');return}
  _downloadCSV(rows,'mypath_progreso_completo_'+todayKey()+'.csv');
  toast('✓ Historial completo descargado');
}

function _downloadCSV(rows,filename){
  const csv='﻿'+rows.map(r=>r.join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

function clearCanvas(cv){
  const ctx=cv.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  cv.width=cv.offsetWidth*dpr;cv.height=cv.offsetHeight*dpr;
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle='#555';
  ctx.font=`${12*dpr}px JetBrains Mono`;
  ctx.textAlign='center';
  ctx.fillText('Sin datos aún',cv.width/2,cv.height/2);
}

function drawLineChart(cv,data,unit){
  const ctx=cv.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  cv.width=cv.offsetWidth*dpr;
  cv.height=cv.offsetHeight*dpr;
  ctx.scale(dpr,dpr);
  const w=cv.offsetWidth,h=cv.offsetHeight;
  ctx.clearRect(0,0,w,h);
  if(!data||data.length===0){
    ctx.fillStyle='#555';ctx.font='12px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('Sin datos aún',w/2,h/2);return;
  }
  const pad={l:36,r:12,t:12,b:22};
  const chartW=w-pad.l-pad.r,chartH=h-pad.t-pad.b;
  const ys=data.map(d=>d.y);
  const minY=Math.min(...ys)*.98,maxY=Math.max(...ys)*1.02;
  const rangeY=Math.max(0.1,maxY-minY);
  const n=data.length;
  ctx.strokeStyle='#222';ctx.lineWidth=1;
  for(let i=0;i<=3;i++){
    const y=pad.t+(chartH*i/3);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    const val=(maxY-(rangeY*i/3)).toFixed(1);
    ctx.fillStyle='#555';ctx.font='10px JetBrains Mono';ctx.textAlign='right';
    ctx.fillText(val,pad.l-6,y+3);
  }
  const grad=ctx.createLinearGradient(0,pad.t,0,h-pad.b);
  grad.addColorStop(0,'rgba(255,69,0,.3)');
  grad.addColorStop(1,'rgba(255,69,0,0)');
  ctx.fillStyle=grad;
  ctx.beginPath();
  data.forEach((d,i)=>{
    const x=pad.l+(n>1?chartW*i/(n-1):chartW/2);
    const y=pad.t+chartH*(1-(d.y-minY)/rangeY);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  const lastX=pad.l+(n>1?chartW:chartW/2);
  ctx.lineTo(lastX,h-pad.b);ctx.lineTo(pad.l,h-pad.b);
  ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ff4500';ctx.lineWidth=2;
  ctx.beginPath();
  data.forEach((d,i)=>{
    const x=pad.l+(n>1?chartW*i/(n-1):chartW/2);
    const y=pad.t+chartH*(1-(d.y-minY)/rangeY);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle='#ffb800';
  data.forEach((d,i)=>{
    const x=pad.l+(n>1?chartW*i/(n-1):chartW/2);
    const y=pad.t+chartH*(1-(d.y-minY)/rangeY);
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle='#888';ctx.font='9px JetBrains Mono';ctx.textAlign='center';
  if(n>=1){
    ctx.fillText(data[0].x.slice(5),pad.l,h-6);
    if(n>1)ctx.fillText(data[data.length-1].x.slice(5),w-pad.r,h-6);
  }
}
