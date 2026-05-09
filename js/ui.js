function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),1600);
}

function renderHeader(){
  const now=new Date();
  const days=['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  document.getElementById('headerDay').textContent=days[now.getDay()];
  document.getElementById('headerDate').textContent=now.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}).toUpperCase();
}

function escapeHTML(s){
  if(!s)return '';
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function findLastSessionForDay(exId,dayNum,skipDate){
  const dates=Object.keys(state.sessions).sort().reverse();
  for(const d of dates){
    if(d===skipDate)continue;
    const dayData=state.sessions[d][dayNum];
    if(dayData && dayData[exId] && dayData[exId].sets && dayData[exId].sets.some(x=>x.w!=='')){
      return dayData[exId];
    }
  }
  for(const d of dates){
    if(d===skipDate)continue;
    for(const dayN of Object.keys(state.sessions[d])){
      const s=state.sessions[d][dayN][exId];
      if(s && s.sets && s.sets.some(x=>x.w!=='')){return s}
    }
  }
  return null;
}

function formatLastSession(s){
  const filled=s.sets.filter(x=>x.w!=='');
  if(!filled.length)return '—';
  const best=filled.reduce((a,b)=>parseFloat(b.w)>parseFloat(a.w)?b:a);
  return `${best.w}kg × ${best.r||'-'} (${filled.length} sets)`;
}

function findLastSession(exId,skipDate){
  const s=findLastSessionForDay(exId,null,skipDate);
  if(!s)return null;
  const filled=s.sets.filter(x=>x.w!=='');
  if(!filled.length)return null;
  const best=filled.reduce((a,b)=>parseFloat(b.w)>parseFloat(a.w)?b:a);
  return `${best.w}kg × ${best.r||'-'}`;
}

function updateSet(day,exId,idx,field,val){updateSetCascade(day,exId,idx,field,val)}
