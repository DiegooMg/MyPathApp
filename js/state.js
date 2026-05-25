const STORE_KEY='mypath_v1';
let state=load();

function load(){
  try{
    const s=JSON.parse(localStorage.getItem(STORE_KEY))||{};
    return {
      sessions:s.sessions||{},
      bodyweight:s.bodyweight||[],
      nutrition:s.nutrition||{},
      customExercises:s.customExercises||{},
      customRoutine:s.customRoutine||{},
      selectedDay:s.selectedDay||null,
      lastCycle:s.lastCycle||'torso',
      theme:s.theme||'orange',
      aiGenerations:s.aiGenerations||{count:0,lastReset:'2000-01-01'},
      approachTimerSec:s.approachTimerSec||120,
      customAlternatives:s.customAlternatives||{},
    };
  }catch(e){return {sessions:{},bodyweight:[],nutrition:{},customExercises:{},customRoutine:{},selectedDay:null,lastCycle:'torso',theme:'orange',aiGenerations:{count:0,lastReset:'2000-01-01'},approachTimerSec:120,customAlternatives:{}}}
}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state))}

function todayKey(){return new Date().toISOString().split('T')[0]}
function todayDayNum(){
  const d=new Date().getDay();
  return d===0?7:d;
}

function dateForDay(dayNum){
  const now=new Date();
  const currentDayNum=todayDayNum();
  const diff=dayNum-currentDayNum;
  const d=new Date(now);
  d.setDate(d.getDate()+diff);
  return d.toISOString().split('T')[0];
}

function formatDateShort(dateKey){
  const d=new Date(dateKey+'T12:00:00');
  const days=['dom','lun','mar','mié','jue','vie','sáb'];
  const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function isToday(dateKey){
  return dateKey===todayKey();
}

function dateKeyForDay(day){
  return dateForDay(day||state.selectedDay||todayDayNum());
}
