/* Tab navigation */
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('page-'+t.dataset.page).classList.add('active');
    if(t.dataset.page==='progress'){renderProgress()}
    if(t.dataset.page==='nutri'){renderNutrition()}
    if(t.dataset.page==='settings'){renderThemeGrid();renderSettings()}
  });
});

/* Close modals on backdrop click */
document.getElementById('modalEdit').addEventListener('click',e=>{
  if(e.target.id==='modalEdit')closeModal('modalEdit');
});
document.getElementById('modalTech').addEventListener('click',e=>{
  if(e.target.id==='modalTech')closeModal('modalTech');
});
document.getElementById('modalAdd').addEventListener('click',e=>{
  if(e.target.id==='modalAdd')closeModal('modalAdd');
});
document.getElementById('modalEditor').addEventListener('click',e=>{
  if(e.target.id==='modalEditor')closeModal('modalEditor');
});

/* Init */
renderHeader();
applyTheme(state.theme||'orange');
renderTraining();

/* Redraw charts on resize */
window.addEventListener('resize',()=>{
  if(document.getElementById('page-progress').classList.contains('active'))renderProgress();
});

/* Auto-refresh header and training when day changes */
let _lastDateCheck=todayKey();
setInterval(()=>{
  const now=todayKey();
  if(now!==_lastDateCheck){
    _lastDateCheck=now;
    renderHeader();
    state.selectedDay=null;
    save();
    renderTraining();
  }
},30000);

/* Service worker for offline */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
