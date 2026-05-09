function getNutriToday(){
  const dk=todayKey();
  if(!state.nutrition[dk]){
    const dayN=todayDayNum();
    let cycle='laboral';
    if(dayN===2||dayN===5)cycle='pierna';
    else if(dayN===1||dayN===4)cycle='torso';
    else if(dayN===3||dayN===7)cycle='off';
    else if(dayN===6)cycle='torso';
    state.nutrition[dk]={cycle,foods:[],water:0,supps:[]};
    save();
  }
  return state.nutrition[dk];
}

function renderNutrition(){
  const n=getNutriToday();
  const c=CYCLES[n.cycle];
  document.getElementById('nutriSub').textContent=`${c.label} · ${c.kcal} kcal objetivo`;

  const cg=document.getElementById('cycleGrid');
  cg.innerHTML='';
  Object.entries(CYCLES).forEach(([k,v])=>{
    const el=document.createElement('button');
    el.className='cycle-chip'+(n.cycle===k?' active':'');
    el.innerHTML=`${v.label}<span class="kcal">${v.kcal}</span>`;
    el.onclick=()=>{n.cycle=k;state.lastCycle=k;save();renderNutrition()};
    cg.appendChild(el);
  });

  const totals=n.foods.reduce((a,f)=>({k:a.k+(+f.kcal||0),p:a.p+(+f.p||0),c:a.c+(+f.c||0),f:a.f+(+f.f||0)}),{k:0,p:0,c:0,f:0});
  const mg=document.getElementById('macrosGrid');
  mg.innerHTML='';
  const rows=[
    {label:'Kcal',val:Math.round(totals.k),target:c.kcal,color:''},
    {label:'Proteína',val:Math.round(totals.p),target:c.p,color:'protein',unit:'g'},
    {label:'Carbos',val:Math.round(totals.c),target:c.c,color:'carbs',unit:'g'},
    {label:'Grasas',val:Math.round(totals.f),target:c.f,color:'fat',unit:'g'},
  ];
  rows.forEach(r=>{
    const pct=Math.min(100,(r.val/r.target)*100);
    const over=r.val>r.target*1.1;
    mg.innerHTML+=`
      <div class="macro-card">
        <div class="macro-label">${r.label}</div>
        <div class="macro-value">${r.val}</div>
        <div class="macro-target">/ ${r.target}${r.unit?r.unit:' kcal'}</div>
        <div class="macro-bar"><div class="macro-bar-fill ${r.color} ${over?'over':''}" style="width:${pct}%"></div></div>
      </div>
    `;
  });

  const fl=document.getElementById('foodLog');
  if(n.foods.length){
    fl.innerHTML='<div style="margin-top:10px;font-size:9px;color:var(--muted);letter-spacing:2px">LOG DE HOY</div>'+
      n.foods.map((f,i)=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid var(--border);font-size:12px">
          <div style="flex:1"><div>${f.name||'Sin nombre'}</div><div style="color:var(--muted);font-size:10px;margin-top:2px">${f.kcal||0} kcal · P${f.p||0} C${f.c||0} G${f.f||0}</div></div>
          <button class="btn-sm" style="padding:4px 8px;flex:0;min-width:28px" onclick="removeFood(${i})">✕</button>
        </div>
      `).join('');
  }else{
    fl.innerHTML='';
  }

  document.getElementById('waterAmount').innerHTML=`${(n.water/1000).toFixed(1)}<span style="font-size:16px;letter-spacing:1px"> L</span>`;
  document.getElementById('waterTarget').textContent=`Objetivo: ${['pierna','torso','laboral'].includes(n.cycle)?'5.0':'3.5'} L`;

  const sl=document.getElementById('suppsList');
  sl.innerHTML='';
  SUPPS.forEach(s=>{
    const done=n.supps.includes(s.id);
    const el=document.createElement('button');
    el.className='check-item'+(done?' done':'');
    el.innerHTML=`<div class="check-box">${done?'✓':''}</div><div><div>${s.name}</div></div><div class="dose">${s.dose}</div>`;
    el.onclick=()=>{
      if(done)n.supps=n.supps.filter(x=>x!==s.id);
      else n.supps.push(s.id);
      save();renderNutrition();
    };
    sl.appendChild(el);
  });
}

function addFood(){
  const n=getNutriToday();
  const name=document.getElementById('addName').value.trim();
  const kcal=parseFloat(document.getElementById('addKcal').value)||0;
  const p=parseFloat(document.getElementById('addProt').value)||0;
  const c=parseFloat(document.getElementById('addCarbs').value)||0;
  const f=parseFloat(document.getElementById('addFat').value)||0;
  if(!kcal && !p && !c && !f){toast('Añade al menos un valor');return}
  n.foods.push({name:name||'Comida',kcal,p,c,f});
  save();
  ['addName','addKcal','addProt','addCarbs','addFat'].forEach(id=>document.getElementById(id).value='');
  renderNutrition();
}

function removeFood(i){
  const n=getNutriToday();
  n.foods.splice(i,1);save();renderNutrition();
}

function addWater(ml){
  const n=getNutriToday();
  n.water=(n.water||0)+ml;save();renderNutrition();
}

function resetWater(){
  const n=getNutriToday();n.water=0;save();renderNutrition();
}

function resetSupps(){
  const n=getNutriToday();n.supps=[];save();renderNutrition();
}

function resetNutri(){
  if(!confirm('¿Borrar el log de comidas de hoy?'))return;
  const n=getNutriToday();n.foods=[];save();renderNutrition();
}
