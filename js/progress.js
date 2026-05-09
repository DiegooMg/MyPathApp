function renderProgress(){
  let sessions=0, volume=0, prs=0;
  const exBest={};
  const weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
  Object.entries(state.sessions).forEach(([date,dayMap])=>{
    const dt=new Date(date);
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

  let streak=0;
  const today=new Date();today.setHours(0,0,0,0);
  for(let i=0;i<365;i++){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const dk=d.toISOString().split('T')[0];
    const sess=state.sessions[dk];
    if(sess){
      let hasData=false;
      Object.values(sess).forEach(ex=>{
        Object.values(ex).forEach(e=>{if(e.sets&&e.sets.some(s=>s.w!==''))hasData=true});
      });
      if(hasData){streak++;continue}
    }
    if(i===0)continue;
    break;
  }
  document.getElementById('statStreak').textContent=streak;

  const exSet=new Set();
  Object.values(state.sessions).forEach(dayMap=>{
    Object.values(dayMap).forEach(exMap=>{
      Object.keys(exMap).forEach(id=>{
        if(id==='_custom')return;
        const data=exMap[id];
        if(!data||!data.sets)return;
        if(data.sets.some(s=>s.d||s.w!==''||s.r!==''))exSet.add(id);
      });
    });
  });
  const picker=document.getElementById('exPicker');
  const cur=picker.value;
  picker.innerHTML='<option value="">Selecciona ejercicio…</option>';
  const idNames={};
  Object.values(ROUTINE).forEach(d=>{
    if(d.exercises)d.exercises.forEach(e=>idNames[e.id]=e.name);
  });
  if(state.customRoutine){
    Object.values(state.customRoutine).forEach(d=>{
      if(d.exercises)d.exercises.forEach(e=>idNames[e.id]=e.name);
    });
  }
  if(state.customExercises){
    Object.values(state.customExercises).forEach(arr=>{
      arr.forEach(e=>idNames[e.id]=e.name);
    });
  }
  Object.values(state.sessions).forEach(dayMap=>{
    Object.values(dayMap).forEach(exMap=>{
      if(exMap._custom)exMap._custom.forEach(e=>idNames[e.id]=e.name);
    });
  });
  Array.from(exSet).sort((a,b)=>(idNames[a]||a).localeCompare(idNames[b]||b)).forEach(id=>{
    const o=document.createElement('option');
    o.value=id;o.textContent=idNames[id]||id;
    picker.appendChild(o);
  });
  if(cur && exSet.has(cur))picker.value=cur;
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
    sub.textContent=`${data[0].w}kg → ${data[data.length-1].w}kg (${delta>0?'+':''}${delta}kg)`;
  }
}

function drawExerciseChart(){
  const cv=document.getElementById('exChart');
  const id=document.getElementById('exPicker').value;
  const history=document.getElementById('exHistory');
  if(!id){clearCanvas(cv);history.innerHTML='';return}
  const pts=[];
  Object.keys(state.sessions).sort().forEach(date=>{
    Object.values(state.sessions[date]).forEach(exMap=>{
      const s=exMap[id];
      if(s && s.sets.some(x=>x.w!=='')){
        const maxW=Math.max(...s.sets.filter(x=>x.w!=='').map(x=>parseFloat(x.w)));
        pts.push({x:date,y:maxW});
      }
    });
  });
  drawLineChart(cv,pts.slice(-20),'kg');
  history.innerHTML=pts.slice(-8).reverse().map(p=>`<div class="history-item"><span>${p.x}</span><span class="best">${p.y} kg</span></div>`).join('');
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
  const w=cv.offsetWidth, h=cv.offsetHeight;
  ctx.clearRect(0,0,w,h);

  if(!data||data.length===0){
    ctx.fillStyle='#555';ctx.font='12px JetBrains Mono';ctx.textAlign='center';
    ctx.fillText('Sin datos aún',w/2,h/2);return;
  }

  const pad={l:36,r:12,t:12,b:22};
  const chartW=w-pad.l-pad.r;
  const chartH=h-pad.t-pad.b;
  const ys=data.map(d=>d.y);
  const minY=Math.min(...ys)*.98;
  const maxY=Math.max(...ys)*1.02;
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
  ctx.lineTo(lastX,h-pad.b);
  ctx.lineTo(pad.l,h-pad.b);
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
