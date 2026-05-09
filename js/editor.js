let editorDay=1;

function openRoutineEditor(){
  editorDay=state.selectedDay||todayDayNum();
  document.getElementById('modalEditor').classList.add('open');
  renderEditorDayTabs();
  renderEditorExList();
  renderLibrary();
}

function renderEditorDayTabs(){
  const tabs=document.getElementById('editorDayTabs');
  tabs.innerHTML='';
  for(let i=1;i<=7;i++){
    const r=getEffectiveRoutineDay(i);
    const btn=document.createElement('button');
    btn.className='editor-day-tab'+(i===editorDay?' active':'');
    btn.innerHTML=`D${i}<br><span style="font-size:9px;opacity:.7">${r.name.split(' ')[0]}</span>`;
    btn.onclick=()=>{editorDay=i;renderEditorDayTabs();renderEditorExList();renderLibrary()};
    tabs.appendChild(btn);
  }
}

function getEffectiveRoutineDay(day){
  if(state.customRoutine&&state.customRoutine[day]){
    return state.customRoutine[day];
  }
  return ROUTINE[day];
}

function getEditorExercises(day){
  const r=getEffectiveRoutineDay(day);
  const base=r.exercises?[...r.exercises]:[];
  const persist=(state.customExercises&&state.customExercises[day])||[];
  return [...base,...persist];
}

function renderEditorExList(){
  const list=document.getElementById('editorExList');
  const exercises=getEditorExercises(editorDay);
  const r=getEffectiveRoutineDay(editorDay);
  if(r.rest){
    list.innerHTML='<div style="color:var(--muted);font-size:12px;padding:10px">Día de descanso. Podés convertirlo en día de entreno añadiendo ejercicios abajo.</div>';
    return;
  }
  if(!exercises.length){
    list.innerHTML='<div style="color:var(--muted);font-size:12px;padding:10px">Sin ejercicios. Añadí de la biblioteca.</div>';
    return;
  }
  list.innerHTML=exercises.map((ex,idx)=>{
    const isCustom=ex.id&&ex.id.startsWith('custom_');
    return `
      <div class="editor-ex-item${isCustom?' custom-persist':''}">
        <span class="editor-ex-drag">⠿</span>
        <div class="editor-ex-name">
          <div style="font-size:13px">${escapeHTML(ex.name)}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${ex.sets}×${ex.reps}${ex.rest?' · '+formatTime(ex.rest):''}</div>
        </div>
        ${isCustom?'<span class="editor-ex-badge">Custom</span>':''}
        <button class="editor-ex-del" onclick="removeExFromDay(${editorDay},'${ex.id}',${isCustom})">✕</button>
      </div>
    `;
  }).join('');
}

function removeExFromDay(day,exId,isCustom){
  if(isCustom){
    if(state.customExercises&&state.customExercises[day]){
      state.customExercises[day]=state.customExercises[day].filter(e=>e.id!==exId);
      if(!state.customExercises[day].length)delete state.customExercises[day];
    }
  }else{
    ensureCustomRoutine(day);
    state.customRoutine[day].exercises=state.customRoutine[day].exercises.filter(e=>e.id!==exId);
  }
  save();
  renderEditorExList();
  renderLibrary();
  renderTraining();
  toast('Ejercicio eliminado');
}

function ensureCustomRoutine(day){
  if(!state.customRoutine)state.customRoutine={};
  if(!state.customRoutine[day]){
    const r=ROUTINE[day];
    state.customRoutine[day]={
      name:r.name,
      emoji:r.emoji,
      sub:r.sub,
      rest:r.rest||false,
      exercises:r.exercises?r.exercises.map(e=>({...e})):[],
    };
  }
}

function renderLibrary(){
  const query=(document.getElementById('libSearch').value||'').toLowerCase().trim();
  const container=document.getElementById('libraryList');
  const currentIds=new Set(getEditorExercises(editorDay).map(e=>e.name.toLowerCase()));
  let html='';
  Object.entries(EXERCISE_LIBRARY).forEach(([group,exercises])=>{
    const filtered=exercises.filter(ex=>!query||ex.name.toLowerCase().includes(query));
    if(!filtered.length)return;
    html+=`<div class="lib-group"><div class="lib-group-title">${group}</div>`;
    filtered.forEach(ex=>{
      const already=currentIds.has(ex.name.toLowerCase());
      html+=`
        <div class="lib-ex-item${already?' added':''}" onclick="${already?'':'addExFromLibrary('+JSON.stringify(ex).replace(/"/g,"'")+')'}">
          <div>
            <div>${ex.name}</div>
            <div style="font-size:10px;color:var(--muted)">${ex.sets}×${ex.reps}${ex.hint?' · '+ex.hint:''}</div>
          </div>
          <span class="lib-add-btn">${already?'✓':'+'}</span>
        </div>
      `;
    });
    html+='</div>';
  });
  if(!html)html='<div style="color:var(--muted);font-size:12px;padding:10px 0">Sin resultados</div>';
  container.innerHTML=html;
}

function addExFromLibrary(exDef){
  const id='custom_'+Date.now();
  const newEx={...exDef,id,custom:true,persist:true};
  if(!state.customExercises)state.customExercises={};
  if(!state.customExercises[editorDay])state.customExercises[editorDay]=[];
  state.customExercises[editorDay].push(newEx);
  save();
  renderEditorExList();
  renderLibrary();
  renderTraining();
  toast('Añadido: '+exDef.name);
}

function addCustomFromEditor(){
  const name=document.getElementById('libCustomName').value.trim();
  if(!name){toast('Escribe un nombre');return}
  addExFromLibrary({name,sets:3,reps:'10-12',rest:90});
  document.getElementById('libCustomName').value='';
}
