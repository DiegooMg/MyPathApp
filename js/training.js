/* ===== ALTERNATIVE PICKER ===== */
function makeAltId(name){
  return 'alt_'+name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'_')
    .replace(/^_|_$/g,'');
}

let altPickerDay=null,altPickerSlotId=null,altPickerOrigName='';

function openAltPicker(day,slotId,origName){
  altPickerDay=day;
  altPickerSlotId=slotId;
  altPickerOrigName=origName;
  document.getElementById('altPickerSearch').value='';
  renderAltPicker();
  document.getElementById('modalAltPicker').classList.add('open');
}

function renderAltPicker(){
  const query=(document.getElementById('altPickerSearch').value||'').toLowerCase().trim();
  const slotId=altPickerSlotId;
  const origName=altPickerOrigName;
  const dk=dateKeyForDay(altPickerDay);
  const dayData=(state.sessions[dk]&&state.sessions[dk][altPickerDay])||{};
  const activeAlt=(dayData[slotId]&&dayData[slotId].activeAlt)||null;

  const predefined=ALTERNATIVES[slotId]||[];
  const custom=(state.customAlternatives&&state.customAlternatives[slotId])||[];
  const known=[origName,...predefined,...custom].filter((n,i,a)=>a.indexOf(n)===i);
  const filteredKnown=query?known.filter(n=>n.toLowerCase().includes(query)):known;

  let html='';
  if(filteredKnown.length){
    html+='<div class="lib-group-title" style="margin-bottom:8px">Conocidos</div>';
    filteredKnown.forEach(name=>{
      const aid=name===origName?null:makeAltId(name);
      const isActive=aid?activeAlt===aid:!activeAlt;
      html+=`<div class="lib-ex-item${isActive?' added':''}" data-alt="${escapeHTML(name)}">
        <div>
          <div>${escapeHTML(name)}</div>
          ${name===origName?'<div style="font-size:10px;color:var(--muted)">Ejercicio original</div>':''}
        </div>
        <span class="lib-add-btn">${isActive?'✓':'→'}</span>
      </div>`;
    });
  }

  html+='<div class="lib-group-title" style="margin:12px 0 8px">Biblioteca</div>';
  Object.entries(EXERCISE_LIBRARY).forEach(([group,exercises])=>{
    const notInKnown=exercises.filter(ex=>
      (!query||ex.name.toLowerCase().includes(query))&&
      !known.some(k=>k.toLowerCase()===ex.name.toLowerCase())
    );
    if(!notInKnown.length)return;
    html+=`<div class="lib-group"><div class="lib-group-title">${group}</div>`;
    notInKnown.forEach(ex=>{
      html+=`<div class="lib-ex-item" data-alt="${escapeHTML(ex.name)}">
        <div>
          <div>${escapeHTML(ex.name)}</div>
          <div style="font-size:10px;color:var(--muted)">${ex.sets}×${ex.reps}</div>
        </div>
        <span class="lib-add-btn">→</span>
      </div>`;
    });
    html+='</div>';
  });

  const container=document.getElementById('altPickerList');
  container.innerHTML=html;
  container.querySelectorAll('[data-alt]').forEach(el=>{
    el.onclick=()=>selectAlternative(el.dataset.alt);
  });
}

function selectAlternative(name){
  const dk=dateKeyForDay(altPickerDay);
  if(!state.sessions[dk])state.sessions[dk]={};
  if(!state.sessions[dk][altPickerDay])state.sessions[dk][altPickerDay]={};
  const dayData=state.sessions[dk][altPickerDay];

  if(!dayData[altPickerSlotId])dayData[altPickerSlotId]={};

  if(name===altPickerOrigName){
    delete dayData[altPickerSlotId].activeAlt;
  }else{
    const aid=makeAltId(name);
    dayData[altPickerSlotId].activeAlt=aid;
    if(!dayData[aid])dayData[aid]={_name:name,sets:[],notes:'',approach:false,tech:[],skipped:false};
    else if(!dayData[aid]._name)dayData[aid]._name=name;
    if(!state.customAlternatives)state.customAlternatives={};
    if(!state.customAlternatives[altPickerSlotId])state.customAlternatives[altPickerSlotId]=[];
    if(!state.customAlternatives[altPickerSlotId].includes(name)){
      state.customAlternatives[altPickerSlotId].push(name);
    }
  }

  save();
  closeModal('modalAltPicker');
  renderTraining();
}

function renderDaySelector(){
  const sel=document.getElementById('daySelector');
  sel.innerHTML='';
  const today=todayDayNum();
  const active=state.selectedDay||today;
  for(let i=1;i<=7;i++){
    const day=getEffectiveRoutineDay(i);
    const chip=document.createElement('button');
    chip.className='day-chip';
    if(day.rest)chip.classList.add('rest');
    if(i===active)chip.classList.add('active');
    if(i===today)chip.classList.add('today');
    chip.innerHTML=`<span class="d-num">D${i}</span>${day.name.split(' ')[0]}`;
    chip.onclick=()=>{state.selectedDay=i;save();renderTraining()};
    sel.appendChild(chip);
  }
}

function renderTraining(){
  renderDaySelector();
  const day=state.selectedDay||todayDayNum();
  const r=getEffectiveRoutineDay(day);
  const dateKey=dateForDay(day);
  const today=isToday(dateKey);

  document.getElementById('heroLabel').textContent=`Día ${day} · ${r.emoji}`;
  document.getElementById('heroTitle').textContent=r.name.toUpperCase();
  document.getElementById('heroSub').textContent=today?'Hoy':formatDateShort(dateKey).toUpperCase();

  const list=document.getElementById('exerciseList');
  list.innerHTML='';
  if(r.rest){
    list.innerHTML=`<div class="empty"><div class="empty-emoji">🛌</div>${today?'Hoy toca descansar.':formatDateShort(dateKey).toUpperCase()+' · Descanso.'}<br>La recuperación es donde crece el músculo.</div>`;
    return;
  }

  if(!state.sessions[dateKey])state.sessions[dateKey]={};
  if(!state.sessions[dateKey][day])state.sessions[dateKey][day]={};
  const sessionData=state.sessions[dateKey][day];

  const allExercises=getEditorExercises(day);
  if(sessionData._custom){
    sessionData._custom.forEach(c=>{
      if(!allExercises.some(e=>e.id===c.id))allExercises.push(c);
    });
  }

  /* Build PR map from all sessions EXCEPT today */
  const exBest={};
  Object.entries(state.sessions).forEach(([dk2,dayMap])=>{
    if(dk2===dateKey)return;
    Object.values(dayMap).forEach(exMap=>{
      Object.entries(exMap).forEach(([id,data])=>{
        if(id==='_custom'||!data||!data.sets)return;
        data.sets.forEach(s=>{
          if(s.w!==''&&s.r!==''){
            const w=parseFloat(s.w);const r=parseInt(s.r);
            if(!isNaN(w)&&!isNaN(r)&&w>0){
              if(!exBest[id]||w>exBest[id].w||(w===exBest[id].w&&r>exBest[id].r)){
                exBest[id]={w,r};
              }
            }
          }
        });
      });
    });
  });

  allExercises.forEach((exOrig,idx)=>{
    const override=(sessionData[exOrig.id]&&sessionData[exOrig.id].override)||{};
    const ex={
      ...exOrig,
      name:override.name||exOrig.name,
      sets:override.sets||exOrig.sets,
      reps:override.reps||exOrig.reps,
      rest:override.rest!=null?override.rest:exOrig.rest,
    };
    const modified=Object.keys(override).length>0;

    if(!sessionData[exOrig.id])sessionData[exOrig.id]={};
    const activeAlt=sessionData[exOrig.id].activeAlt||null;
    const dataKey=activeAlt||exOrig.id;
    const dispName=(activeAlt&&sessionData[activeAlt]&&sessionData[activeAlt]._name)||ex.name;

    if(!sessionData[dataKey])sessionData[dataKey]={};
    const data=sessionData[dataKey];
    if(!data.sets)data.sets=Array(ex.sets).fill(null).map(()=>({w:'',r:'',d:false}));
    if(data.approach===undefined)data.approach=false;
    if(!data.tech)data.tech=[];
    if(data.skipped===undefined)data.skipped=false;
    while(data.sets.length<ex.sets)data.sets.push({w:'',r:'',d:false});
    while(data.sets.length>ex.sets)data.sets.pop();

    const lastSession=findLastSessionForDay(dataKey,day,dateKey);
    const allDone=data.sets.every(s=>s.d);
    const isTime=(override.type?override.type:exOrig.type)==='time';

    let setsHTML='';
    if(isTime){
      setsHTML=data.sets.map((s,i)=>`
        <div class="set-row" style="grid-template-columns:32px 1fr 40px">
          <div class="set-label">${i+1}</div>
          <div style="font-size:12px;color:var(--muted);padding:8px">${ex.reps}</div>
          <button class="set-check ${s.d?'done':''}" onclick="toggleDone(${day},'${dataKey}',${i},${ex.rest})">${s.d?'✓':''}</button>
        </div>
      `).join('');
    }else{
      setsHTML=data.sets.map((s,i)=>{
        const lastSet=lastSession&&lastSession.sets&&lastSession.sets[i];
        const phW=lastSet?lastSet.w:'—';
        const phR=lastSet?lastSet.r:'—';
        const wClass=s.w!==''?'filled':(lastSet?'prefilled':'');
        const rClass=s.r!==''?'filled':(lastSet?'prefilled':'');
        return `
          <div class="set-row">
            <div class="set-label">${i+1}</div>
            <input type="number" step="0.5" inputmode="decimal" class="set-input ${wClass}" placeholder="${phW}" value="${s.w}" oninput="updateSetCascade(${day},'${dataKey}',${i},'w',this.value)" data-field="w" data-idx="${i}">
            <input type="number" inputmode="numeric" class="set-input ${rClass}" placeholder="${phR}" value="${s.r}" oninput="updateSetCascade(${day},'${dataKey}',${i},'r',this.value)" data-field="r" data-idx="${i}">
            <button class="set-check ${s.d?'done':''}" onclick="toggleDone(${day},'${dataKey}',${i},${ex.rest})">${s.d?'✓':''}</button>
          </div>
        `;
      }).join('');
    }

    const setsHeader=isTime
      ?`<div class="set-row-head" style="grid-template-columns:32px 1fr 40px"><div>Set</div><div>Objetivo</div><div>✓</div></div>`
      :`<div class="set-row-head"><div>Set</div><div>Peso kg</div><div>Reps</div><div>✓</div></div>`;

    const techTagsHTML=data.tech.length
      ? `<div class="tech-tags">${data.tech.map(t=>{
          const opt=TECH_OPTIONS.find(o=>o.id===t);
          return opt?`<span class="tech-tag">${opt.label}</span>`:'';
        }).join('')}</div>`
      : '';

    const altHTML=`<button class="btn-sm${activeAlt?' primary':''}" onclick="openAltPicker(${day},'${exOrig.id}',this.closest('.exercise').dataset.origname)">🔄 Alternativa</button>`;

    const isCustom=ex.id.startsWith('custom_')||exOrig.custom;
    const deleteHTML=isCustom?`<button class="btn-sm danger" onclick="deleteCustomExercise(${day},'${ex.id}')">🗑️</button>`:'';
    const customBadge=isCustom?`<span class="prescr-chip" style="color:var(--green);border-color:var(--green);font-size:9px">${exOrig.persist?'RUTINA':'SOLO HOY'}</span>`:'';

    const card=document.createElement('div');
    card.className='exercise'+(allDone&&!data.skipped?' done':'')+(data.skipped?' skipped':'');
    card.dataset.exid=dataKey;
    card.dataset.origname=exOrig.name;
    card.innerHTML=`
      <div class="exercise-head">
        <div style="flex:1;min-width:0">
          <div class="ex-name-row">
            <div class="exercise-name">${escapeHTML(dispName)}</div>
            ${exBest[dataKey]?`<span class="ex-pr-badge">🏆 ${exBest[dataKey].w}kg×${exBest[dataKey].r}</span>`:''}
          </div>
          <div class="prescr-chips">
            <span class="prescr-chip ${modified&&(override.sets||override.reps)?'modified':''}" onclick="openEditModal(${day},'${exOrig.id}')">${ex.sets}×${ex.reps} <span class="pencil">✎</span></span>
            ${ex.rest?`<span class="prescr-chip ${modified&&override.rest!=null?'modified':''}" onclick="openEditModal(${day},'${exOrig.id}')">⏱ ${formatTime(ex.rest)} <span class="pencil">✎</span></span>`:''}
            ${ex.hint?`<span class="prescr-chip" style="color:var(--muted);border-color:var(--border)">${ex.hint}</span>`:''}
            ${customBadge}
            ${data.skipped?`<span class="prescr-chip" style="color:var(--red);border-color:var(--red)">NO HECHO</span>`:''}
          </div>
          ${lastSession&&!isTime?`<div class="last-hint">Última: ${formatLastSession(lastSession)}</div>`:''}
        </div>
        <div class="exercise-num">${String(idx+1).padStart(2,'0')}</div>
      </div>
      <div class="approach-row ${data.approach?'done':''}" onclick="toggleApproach(${day},'${dataKey}')">
        <div class="approach-check">${data.approach?'✓':''}</div>
        <div style="flex:1">Aproximación realizada</div>
        <button class="btn-sm" style="margin:0;padding:3px 10px;font-size:10px" onclick="event.stopPropagation();startTimer(state.approachTimerSec||120)">⏱ ${formatTime(state.approachTimerSec||120)}</button>
      </div>
      ${data.skipped?`<div style="padding:12px;background:rgba(239,68,68,.08);border:1px solid var(--red);border-radius:8px;font-size:12px;color:var(--red);text-align:center">Ejercicio omitido · queda registrado en el historial</div>`:`
      <div class="sets">
        ${setsHeader}
        ${setsHTML}
      </div>`}
      ${techTagsHTML}
      <div class="ex-actions">
        ${!data.skipped&&ex.rest?`<button class="btn-sm" onclick="startTimer(${ex.rest})">⏱ ${formatTime(ex.rest)}</button>`:''}
        ${!data.skipped?altHTML:''}
        <button class="btn-sm" onclick="toggleNotes('${dataKey}')">📝 Notas</button>
        ${!data.skipped?`<button class="btn-sm ${data.tech.length?'primary':''}" onclick="openTechModal(${day},'${dataKey}')">⚡ Técnicas${data.tech.length?' ('+data.tech.length+')':''}</button>`:''}
        <button class="btn-sm ${data.skipped?'danger':''}" onclick="toggleSkipped(${day},'${dataKey}')">${data.skipped?'↩ Deshacer':'⊘ No hecho'}</button>
        ${deleteHTML}
      </div>
      <div class="notes-area" id="notes-${dataKey}">
        <textarea placeholder="${data.skipped?'Motivo (dolor, tiempo, etc.)…':'Cómo fue la serie, técnica, sensaciones…'}" oninput="updateNotes(${day},'${dataKey}',this.value)">${escapeHTML(data.notes||'')}</textarea>
      </div>
    `;
    list.appendChild(card);
  });

  const addBtn=document.createElement('button');
  addBtn.className='btn-sm primary';
  addBtn.style.cssText='width:100%;padding:14px;margin-top:8px;font-size:12px;letter-spacing:2px';
  addBtn.textContent='+ AÑADIR EJERCICIO';
  addBtn.onclick=()=>openAddExerciseModal(day);
  list.appendChild(addBtn);

  save();
}

function updateSetCascade(day,exId,idx,field,val){
  const dk=dateKeyForDay(day);
  const data=state.sessions[dk][day][exId];
  data.sets[idx][field]=val;
  if(val!==''){
    for(let i=idx+1;i<data.sets.length;i++){
      if(!data.sets[i].d && (data.sets[i][field]==='' || data.sets[i].cascaded)){
        data.sets[i][field]=val;
        data.sets[i].cascaded=true;
      }
    }
    syncCascadeDOM(exId,data.sets,field,idx+1);
    save();
    return;
  }
  data.sets[idx].cascaded=false;
  save();
}

function syncCascadeDOM(exId,sets,field,fromIdx=0){
  const card=document.querySelector(`[data-exid="${exId}"]`);
  if(!card)return;
  const inputs=card.querySelectorAll(`.set-input[data-field="${field}"]`);
  inputs.forEach(inp=>{
    const i=parseInt(inp.dataset.idx);
    if(i>=fromIdx && sets[i]){
      inp.value=sets[i][field];
      inp.classList.toggle('filled',sets[i][field]!=='');
      inp.classList.remove('prefilled');
    }
  });
}

function toggleDone(day,exId,idx,restSec){
  const dk=dateKeyForDay(day);
  const s=state.sessions[dk][day][exId].sets[idx];
  s.d=!s.d;
  save();
  renderTraining();
  if(s.d && restSec){startTimer(restSec)}
}

function toggleSkipped(day,exId){
  const dk=dateKeyForDay(day);
  const data=state.sessions[dk][day][exId];
  data.skipped=!data.skipped;
  if(data.skipped)data.sets.forEach(s=>s.d=false);
  save();
  renderTraining();
  toast(data.skipped?'Marcado como no hecho':'Restaurado');
}

function toggleApproach(day,exId){
  const dk=dateKeyForDay(day);
  state.sessions[dk][day][exId].approach=!state.sessions[dk][day][exId].approach;
  save();
  renderTraining();
}

function updateNotes(day,exId,val){
  const dk=dateKeyForDay(day);
  state.sessions[dk][day][exId].notes=val;
  save();
}

function toggleNotes(exId){
  document.getElementById('notes-'+exId).classList.toggle('open');
}


let addExDay=null;

function openAddExerciseModal(day){
  addExDay=day;
  document.getElementById('modalAdd').classList.add('open');
  document.getElementById('addExName').value='';
  document.getElementById('addExSets').value='3';
  document.getElementById('addExReps').value='10-12';
  document.getElementById('addExRest').value='90';
  document.getElementById('addExType').value='reps';
  document.getElementById('addExPersist').checked=false;
}

function saveAddExercise(){
  const day=addExDay;
  if(!day)return;
  const name=document.getElementById('addExName').value.trim();
  const sets=parseInt(document.getElementById('addExSets').value)||3;
  const reps=document.getElementById('addExReps').value.trim()||'10';
  const rest=parseInt(document.getElementById('addExRest').value)||90;
  const type=document.getElementById('addExType').value;
  const persist=document.getElementById('addExPersist').checked;
  if(!name){toast('Escribe un nombre');return}

  const id='custom_'+Date.now();
  const exDef={id,name,sets,reps,rest,type:type==='time'?'time':undefined,hint:'',custom:true,persist};

  if(persist){
    if(!state.customExercises)state.customExercises={};
    if(!state.customExercises[day])state.customExercises[day]=[];
    state.customExercises[day].push(exDef);
  }

  const dk=dateKeyForDay(day);
  if(!state.sessions[dk])state.sessions[dk]={};
  if(!state.sessions[dk][day])state.sessions[dk][day]={};
  if(!state.sessions[dk][day]._custom)state.sessions[dk][day]._custom=[];
  state.sessions[dk][day]._custom.push(exDef);
  state.sessions[dk][day][id]={
    sets:Array(sets).fill(null).map(()=>({w:'',r:'',d:false})),
    notes:'',approach:false,tech:[]
  };

  save();
  closeModal('modalAdd');
  renderTraining();
  toast(persist?'Ejercicio añadido a la rutina':'Ejercicio añadido (solo hoy)');
}

function deleteCustomExercise(day,exId){
  if(!confirm('¿Eliminar este ejercicio?'))return;
  const dk=dateKeyForDay(day);
  if(state.sessions[dk]&&state.sessions[dk][day]&&state.sessions[dk][day]._custom){
    state.sessions[dk][day]._custom=state.sessions[dk][day]._custom.filter(e=>e.id!==exId);
    delete state.sessions[dk][day][exId];
  }
  if(state.customExercises&&state.customExercises[day]){
    state.customExercises[day]=state.customExercises[day].filter(e=>e.id!==exId);
    if(!state.customExercises[day].length)delete state.customExercises[day];
  }
  save();
  renderTraining();
  toast('Ejercicio eliminado');
}
