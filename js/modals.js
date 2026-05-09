let editContext={day:null,exId:null};

function getEffectiveExercise(day,exId){
  const orig=ROUTINE[day].exercises?ROUTINE[day].exercises.find(e=>e.id===exId):null;
  const dk=dateKeyForDay(day);
  const sd=state.sessions[dk]&&state.sessions[dk][day]&&state.sessions[dk][day][exId];
  const override=(sd&&sd.override)||{};
  const customList=(state.sessions[dk]&&state.sessions[dk][day]&&state.sessions[dk][day]._custom)||[];
  const customOrig=customList.find(e=>e.id===exId);
  const base=orig||customOrig||{name:'?',sets:3,reps:'10',rest:60,type:'reps'};
  return {
    orig:base,
    name:override.name||base.name,
    sets:override.sets||base.sets,
    reps:override.reps||base.reps,
    rest:override.rest!=null?override.rest:base.rest,
    type:override.type||base.type||'reps',
  };
}

function openEditModal(day,exId){
  editContext={day,exId};
  const eff=getEffectiveExercise(day,exId);
  document.getElementById('modalEditTitle').textContent='Editar · '+eff.orig.name;
  document.getElementById('modalName').value=eff.name;
  document.getElementById('modalSets').value=eff.sets;
  document.getElementById('modalReps').value=eff.reps;
  document.getElementById('modalRest').value=eff.rest;
  document.getElementById('modalType').value=eff.type==='time'?'time':'reps';
  document.getElementById('modalEdit').classList.add('open');
}

function saveEdit(){
  const {day,exId}=editContext;
  if(!day||!exId)return;
  const orig=ROUTINE[day].exercises?ROUTINE[day].exercises.find(e=>e.id===exId):null;
  const dk=dateKeyForDay(day);
  const customList=(state.sessions[dk]&&state.sessions[dk][day]&&state.sessions[dk][day]._custom)||[];
  const customOrig=customList.find(e=>e.id===exId);
  const base=orig||customOrig;
  if(!base)return;

  const name=document.getElementById('modalName').value.trim();
  const sets=parseInt(document.getElementById('modalSets').value);
  const reps=document.getElementById('modalReps').value.trim();
  const rest=parseInt(document.getElementById('modalRest').value);
  const type=document.getElementById('modalType').value;

  if(!name){toast('El nombre no puede estar vacío');return}
  if(!sets||sets<1||sets>15){toast('Series entre 1 y 15');return}
  if(!reps){toast('Añade un rango de reps');return}
  if(isNaN(rest)||rest<0){toast('Descanso inválido');return}

  if(!state.sessions[dk])state.sessions[dk]={};
  if(!state.sessions[dk][day])state.sessions[dk][day]={};
  if(!state.sessions[dk][day][exId]){
    state.sessions[dk][day][exId]={sets:[],notes:'',approach:false,tech:[]};
  }

  if(customOrig){
    customOrig.name=name;
    customOrig.sets=sets;
    customOrig.reps=reps;
    customOrig.rest=rest;
    customOrig.type=type==='time'?'time':undefined;
  }else{
    const override={};
    if(name!==base.name)override.name=name;
    if(sets!==base.sets)override.sets=sets;
    if(reps!==base.reps)override.reps=reps;
    if(rest!==base.rest)override.rest=rest;
    const origType=base.type||'reps';
    if(type!==origType)override.type=type==='time'?'time':'reps';

    if(Object.keys(override).length){
      state.sessions[dk][day][exId].override=override;
    }else{
      delete state.sessions[dk][day][exId].override;
    }
  }
  save();
  closeModal('modalEdit');
  renderTraining();
  toast('Ejercicio actualizado');
}

function resetEdit(){
  const {day,exId}=editContext;
  if(!day||!exId)return;
  if(!confirm('¿Restaurar el ejercicio a su configuración original?'))return;
  const dk=dateKeyForDay(day);
  if(state.sessions[dk]&&state.sessions[dk][day]&&state.sessions[dk][day][exId]){
    delete state.sessions[dk][day][exId].override;
  }
  save();
  closeModal('modalEdit');
  renderTraining();
  toast('Restaurado');
}

let techContext={day:null,exId:null};

function openTechModal(day,exId){
  techContext={day,exId};
  const dk=dateKeyForDay(day);
  const current=(state.sessions[dk]&&state.sessions[dk][day]&&state.sessions[dk][day][exId]&&state.sessions[dk][day][exId].tech)||[];
  const grid=document.getElementById('techGrid');
  grid.innerHTML='';
  TECH_OPTIONS.forEach(opt=>{
    const el=document.createElement('button');
    el.className='tech-opt'+(current.includes(opt.id)?' active':'');
    el.textContent=opt.label;
    el.dataset.id=opt.id;
    el.onclick=()=>el.classList.toggle('active');
    grid.appendChild(el);
  });
  document.getElementById('modalTech').classList.add('open');
}

function saveTech(){
  const {day,exId}=techContext;
  if(!day||!exId)return;
  const selected=[];
  document.querySelectorAll('#techGrid .tech-opt.active').forEach(el=>selected.push(el.dataset.id));
  const dk=dateKeyForDay(day);
  if(!state.sessions[dk])state.sessions[dk]={};
  if(!state.sessions[dk][day])state.sessions[dk][day]={};
  if(!state.sessions[dk][day][exId])state.sessions[dk][day][exId]={sets:[],notes:'',approach:false,tech:[]};
  state.sessions[dk][day][exId].tech=selected;
  save();
  closeModal('modalTech');
  renderTraining();
}

function closeModal(id){
  document.getElementById(id).classList.remove('open');
}

function showHistory(exId,exName){
  const items=[];
  const dates=Object.keys(state.sessions).sort().reverse();
  for(const d of dates){
    for(const dayN of Object.keys(state.sessions[d])){
      const s=state.sessions[d][dayN][exId];
      if(s && s.sets.some(x=>x.w!=='')){
        const best=s.sets.filter(x=>x.w!=='').reduce((a,b)=>parseFloat(b.w)>parseFloat(a.w)?b:a);
        items.push(`${d} → ${best.w}kg × ${best.r||'-'}`);
      }
    }
  }
  alert(exName+'\n\n'+(items.length?items.slice(0,20).join('\n'):'Sin historial todavía.'));
}
