function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`mypath_backup_${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e){
  const file=e.target.files[0];
  if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const imported=JSON.parse(r.result);
      if(!confirm('¿Sobrescribir los datos actuales?'))return;
      state=imported;save();
      toast('Datos importados');
      renderTraining();
    }catch(err){alert('Archivo inválido')}
  };
  r.readAsText(file);
}

function confirmWipe(){
  if(!confirm('¿Borrar TODOS los datos? No se puede deshacer.'))return;
  if(!confirm('¿Seguro? Perderás todo el historial.'))return;
  localStorage.removeItem(STORE_KEY);
  state=load();
  toast('Datos borrados');
  renderTraining();
}

const AI_WORKER_URL='https://withered-hall-7512.diegomg1997.workers.dev';

async function generateAIRoutine(){
  const profile={
    name:document.getElementById('aiName').value||'Usuario',
    age:document.getElementById('aiAge').value||25,
    weight:document.getElementById('aiWeight').value||75,
    height:document.getElementById('aiHeight').value||175,
    sex:document.getElementById('aiSex').value,
    goal:document.getElementById('aiGoal').value,
    level:document.getElementById('aiLevel').value,
    daysPerWeek:document.getElementById('aiDays').value,
    equipment:document.getElementById('aiEquipment').value,
    injuries:document.getElementById('aiInjuries').value||'ninguna',
    notes:document.getElementById('aiNotes').value||'',
  };

  const btn=document.getElementById('aiGenerateBtn');
  const status=document.getElementById('aiStatus');
  btn.disabled=true;
  status.style.display='block';
  status.style.color='var(--muted)';
  status.textContent='⏳ Generando rutina con Claude AI…';

  try{
    const res=await fetch(AI_WORKER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(profile),
    });

    if(!res.ok){
      const err=await res.json().catch(()=>({error:'Error del servidor'}));
      throw new Error(err.error||'Error del servidor');
    }

    const data=await res.json();

    if(!data.days||!Array.isArray(data.days)){
      throw new Error('Formato de rutina inválido');
    }

    state.customRoutine={};
    data.days.forEach((day,idx)=>{
      const dayNum=day.dayNum||(idx+1);
      state.customRoutine[dayNum]={
        name:day.name,
        emoji:day.emoji||'💪',
        sub:day.sub||'',
        rest:!day.exercises||day.exercises.length===0,
        exercises:(day.exercises||[]).map((ex,i)=>({
          id:ex.id||`gen_${dayNum}_${i+1}`,
          name:ex.name,
          sets:ex.sets||3,
          reps:ex.reps||'10-12',
          rest:ex.rest||90,
          hint:ex.hint||'',
        })),
      };
    });

    for(let i=1;i<=7;i++){
      if(!state.customRoutine[i]){
        state.customRoutine[i]={name:'Descanso',emoji:'😴',sub:'Día off',rest:true,exercises:[]};
      }
    }

    save();
    state.selectedDay=null;
    save();
    renderTraining();
    status.textContent='✓ ¡Rutina aplicada! Revisa la pestaña de Entreno.';
    status.style.color='var(--green)';
    toast('✓ Rutina generada y aplicada');

  }catch(err){
    status.textContent='✗ Error: '+err.message;
    status.style.color='var(--red)';
  }finally{
    btn.disabled=false;
  }
}
