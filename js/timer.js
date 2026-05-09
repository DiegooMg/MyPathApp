let timerInterval=null;
let timerEnd=0;

function startTimer(sec){
  if(!sec||sec<=0)return;
  stopTimer();
  timerEnd=Date.now()+sec*1000;
  document.getElementById('timerWrap').classList.add('visible');
  updateTimer();
  timerInterval=setInterval(updateTimer,500);
}

function updateTimer(){
  const remain=Math.max(0,Math.round((timerEnd-Date.now())/1000));
  document.getElementById('timerDisplay').textContent=formatTime(remain);
  if(remain<=0){
    stopTimer();
    if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);
    try{beep()}catch(e){}
    toast('¡DESCANSO COMPLETO!');
  }
}

function addTimer(sec){
  timerEnd=Math.max(Date.now()+1000, timerEnd+sec*1000);
  updateTimer();
}

function stopTimer(){
  if(timerInterval)clearInterval(timerInterval);
  timerInterval=null;
  document.getElementById('timerWrap').classList.remove('visible');
}

function formatTime(s){
  const m=Math.floor(s/60), ss=s%60;
  return `${m}:${String(ss).padStart(2,'0')}`;
}

function beep(){
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  [0, 0.25, 0.5].forEach(offset=>{
    const o=ctx.createOscillator();
    const g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=1200;
    o.type='square';
    g.gain.setValueAtTime(.6,ctx.currentTime+offset);
    g.gain.exponentialRampToValueAtTime(.01,ctx.currentTime+offset+.15);
    o.start(ctx.currentTime+offset);
    o.stop(ctx.currentTime+offset+.15);
  });
}
