const THEMES = [
  {
    id:'orange',
    name:'Naranja',
    bg:'#0a0a0a', card:'#1a1a1a', accent:'#ff4500', accent2:'#ffb800',
  },
  {
    id:'dark-blue',
    name:'Azul noche',
    bg:'#080c14', card:'#131c2e', accent:'#3b82f6', accent2:'#60d4f7',
  },
  {
    id:'light',
    name:'Claro',
    bg:'#f0f0ec', card:'#ffffff', accent:'#e03a00', accent2:'#d4900a',
  },
  {
    id:'pink',
    name:'Rosa',
    bg:'#0d080f', card:'#1e1024', accent:'#d946ef', accent2:'#f0a8ff',
  },
  {
    id:'military',
    name:'Militar',
    bg:'#080a06', card:'#161a0e', accent:'#84cc16', accent2:'#bef264',
  },
];

function applyTheme(id){
  document.documentElement.setAttribute('data-theme', id==='orange'?'':id);
  const t=THEMES.find(t=>t.id===id)||THEMES[0];
  document.querySelector('meta[name="theme-color"]').setAttribute('content',t.bg);
  state.theme=id;
  save();
  renderThemeGrid();
}

function renderThemeGrid(){
  const grid=document.getElementById('themeGrid');
  if(!grid)return;
  const current=state.theme||'orange';
  grid.innerHTML=THEMES.map(t=>`
    <button class="theme-card ${t.id===current?'active':''}"
      style="background:${t.bg};border-color:${t.id===current?t.accent:'transparent'}"
      onclick="applyTheme('${t.id}')">
      <div class="theme-preview">
        <div class="theme-dot" style="background:${t.accent}"></div>
        <div class="theme-dot" style="background:${t.accent2}"></div>
        <div class="theme-dot" style="background:${t.card}"></div>
      </div>
      <div class="theme-name" style="color:${t.accent}">${t.name}</div>
      <span class="theme-check" style="color:${t.accent}">✓</span>
    </button>
  `).join('');
}
