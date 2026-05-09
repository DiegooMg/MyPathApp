# MyPath — Documento de contexto para Claude Code

## Qué es

PWA (Progressive Web App) de entrenamiento y nutrición personal. Un solo archivo `index.html` autocontenido (HTML + CSS + JS). Funciona offline, guarda datos en `localStorage` del dispositivo. Deployada en Netlify desde un repo de GitHub. No tiene backend, no hay cuentas de usuario, no hay base de datos externa.

**Archivos del proyecto:**
```
index.html     — toda la app (80 KB, ~2550 líneas)
manifest.json  — metadata PWA para instalación en móvil
sw.js          — service worker para offline (cache version: mypath-v4)
```

Cuando se actualiza, hay que subir la cache version del sw.js (mypath-v4 → mypath-v5, etc.) para que el móvil descargue la versión nueva.

---

## Stack técnico

- **HTML/CSS/JS** vanilla en un solo archivo
- **Fuentes:** Bebas Neue (logo/títulos), JetBrains Mono (body/monospace), Syne (headings de cards). Cargadas desde Google Fonts.
- **Sin frameworks, sin npm, sin build step.** Solo abrir en navegador.
- **Storage:** `localStorage` bajo la key `mypath_v1`
- **Paleta:**
  ```css
  --bg: #0a0a0a
  --card: #1a1a1a
  --card-2: #222
  --border: #2a2a2a
  --text: #f5f5f0
  --muted: #888
  --accent: #ff4500   /* naranja */
  --accent-2: #ffb800 /* ámbar */
  --green: #22c55e
  --red: #ef4444
  --blue: #3b82f6
  ```

---

## Estructura de navegación

4 pestañas fijas en la parte inferior:
1. **🏋️ Entreno** — rutina del día, registro de sets
2. **🍽️ Nutri** — macros del día, agua, suplementos
3. **📈 Avance** — gráficas de peso corporal y progreso por ejercicio
4. **⚙️ Ajustes** — instalación como PWA, export/import JSON, borrar datos

---

## State (localStorage, key: `mypath_v1`)

```js
{
  sessions: {
    "2026-04-24": {          // fecha ISO
      1: {                    // número de día de rutina (1-7)
        _custom: [],          // ejercicios custom añadidos en esa sesión
        "e1_1": {             // id del ejercicio
          sets: [{w, r, d, cascaded?}],  // peso, reps, done, cascadeado
          notes: "",
          approach: false,
          tech: [],           // ["dropset","restpause",...]
          override: {}        // cambios de nombre/sets/reps/rest/type para esa sesión
        }
      }
    }
  },
  bodyweight: [{date, w}],    // historial de peso corporal
  nutrition: {
    "2026-04-24": {
      cycle: "torso",         // tipo de día nutricional
      foods: [{name,kcal,p,c,f}],
      water: 0,               // ml
      supps: ["creatina",...]
    }
  },
  customExercises: {
    1: [{id,name,sets,reps,rest,type,persist:true}]  // ejercicios custom persistentes por día
  },
  selectedDay: null,          // null = usa el día real de hoy
  lastCycle: "torso"
}
```

---

## Rutina (Upper/Lower 4+1 días)

Basada en un informe técnico de recomposición corporal personalizado.

| Día | Nombre | Ejercicios |
|-----|--------|-----------|
| D1 | Torso Fuerza | 9 ej (press banca, remo, press militar, dominadas, laterales, face pulls, core) |
| D2 | Pierna Fuerza | 6 ej (sentadilla, hip thrust, RDL, prensa, curl femoral, gemelo) |
| D3 | Descanso | — |
| D4 | Torso Hipertrofia | 12 ej (press inclinado, remo polea, pullover, laterales, pájaros, curl inclinado, EZ, overhead, pressdown, core x3) |
| D5 | Pierna Hipertrofia | 7 ej (hip thrust, búlgara, stiff, ext cuádriceps, curl femoral, abducción, gemelo) |
| D6 | Hombro/Brazo/Core + LISS | 7 ej — OPCIONAL |
| D7 | Descanso | — |

Cada ejercicio tiene: `{id, name, sets, reps, rest, type?, hint?, custom?, persist?}`
- `type: 'time'` → sin columnas peso/reps, solo checkbox por set (ej: plank, LISS)
- `hint` → texto informativo extra (ej: "RIR 1-2", "lengthened")

---

## Funciones clave (JS)

### Fechas
- `todayKey()` → `"2026-04-24"` (fecha ISO de hoy)
- `todayDayNum()` → 1-7 (lunes=1, domingo=7)
- `dateForDay(dayNum)` → fecha ISO de ese día en la semana actual
- `dateKeyForDay(day)` → `dateForDay(day||selectedDay||todayDayNum())`
- **Importante:** todas las funciones de sesión usan `dateKeyForDay(day)`, NO `todayKey()`. Solo nutrición y peso corporal usan `todayKey()` directamente.

### Entrenamiento
- `renderTraining()` → renderiza el día activo completo. Re-render completo. Excepto:
- `updateSetCascade(day,exId,idx,field,val)` → actualiza un set sin re-render (usa `syncCascadeDOM` para preservar el foco del input)
- `syncCascadeDOM(exId,sets,field)` → actualiza inputs en el DOM directamente sin destruir el árbol
- Cascade: al escribir en set 1, se copia a todos los sets vacíos de ese ejercicio. Si el usuario edita un set manualmente, se marca `cascaded=false` y ya no se sobrescribe.

### Modales
- `openEditModal(day,exId)` → editar nombre/sets/reps/rest/tipo de un ejercicio (session-only)
- `saveEdit()` → guarda override en `state.sessions[dk][day][exId].override`
- `resetEdit()` → borra el override
- `openTechModal(day,exId)` → seleccionar técnicas avanzadas
- `openAddExerciseModal(day)` → añadir ejercicio custom
- `saveAddExercise()` → guarda en `_custom` de la sesión y opcionalmente en `state.customExercises[day]` si `persist=true`
- `deleteCustomExercise(day,exId)` → borra de sesión y de `customExercises`
- `showAlternatives(day,exId)` → rota entre original → alt1 → alt2 → original

### Timer
- `startTimer(sec)` → activa el timer flotante
- Al terminar: vibración + 3 pitidos cortos (Web Audio API, frecuencia 1200hz, square wave)

### Nutrición
- Ciclos por tipo de día (6 tipos): laboral+pierna, laboral+torso, laboral sin entreno, off+pierna, off+torso, off sin entreno
- TDEE estimado ~3350 kcal/día (trabajo en cocina 7.5h/día + 4 días gym)
- Target: 2750 kcal promedio semanal con ciclado

---

## Datos nutricionales (cycles)

```js
pierna:      {kcal:3000, p:190, c:345, f:78}  // laboral + pierna
torso:       {kcal:2850, p:190, c:305, f:78}  // laboral + torso
laboral:     {kcal:2700, p:190, c:245, f:78}  // laboral sin entreno
off_pierna:  {kcal:2750, p:190, c:280, f:78}  // off + pierna
off_torso:   {kcal:2600, p:190, c:240, f:78}  // off + torso
off:         {kcal:2450, p:190, c:200, f:78}  // off sin entreno
```

---

## Perfil del usuario (Diego)

- 28 años, 183 cm, 90 kg, ~16-17% BF
- Meta: recomposición corporal con sesgo a definición, verano 2026
- Trabajo: cocina, 7.5h/día de pie, exposición a calor → NEAT muy alto
- Cardio: 3×30 min cinta inclinada/semana
- Artritis leve en tobillos y rodillas → sin alto impacto
- Nivel: avanzado (3+ años)
- Suplementación: creatina, omega-3, vit D3, colágeno+vitC, cafeína, whey, magnesio

---

## Features implementadas

- [x] Rutina 4+1 días con selector de día
- [x] Registro de peso + reps por set
- [x] Cascade: set 1 copia a todos; editar set manual lo fija
- [x] Último peso/reps de la misma sesión la semana pasada como placeholder
- [x] Override de ejercicio por sesión (nombre, sets, reps, descanso, tipo)
- [x] Ejercicios de tipo "tiempo" (solo checkbox, sin peso/reps)
- [x] Checkbox de aproximación
- [x] Técnicas avanzadas: dropset, rest-pause, myo-reps, cluster, parciales, tempo, pre/post fatiga
- [x] Timer de descanso flotante (beep 3x al terminar, vibración)
- [x] Notas por ejercicio
- [x] Botón de alternativa (rota entre original + 2 opciones, 28 ejercicios cubiertos)
- [x] Añadir ejercicio custom (solo hoy o persistente en rutina)
- [x] Borrar ejercicio custom
- [x] Fecha real por día (D4 del jueves → 2026-04-24)
- [x] Hero muestra "Hoy" / "JUE 24 ABR" según día
- [x] Auto-refresh a medianoche (check cada 30s)
- [x] Nutrición ciclada por 6 tipos de día
- [x] Log de comidas con macros acumulados
- [x] Contador de agua (+250/+500 ml)
- [x] Checklist de suplementos diarios
- [x] Gráfica de peso corporal
- [x] Gráfica de progreso por ejercicio
- [x] Stats: sesiones, racha, volumen semanal, PRs
- [x] Export/import JSON
- [x] PWA instalable (service worker, manifest)
- [x] Logo SVG: MY-P▲TH (Bebas Neue, A = 3 flechas) con glow detrás
- [x] Fondo: grid de dots + gradientes cálidos naranjo/ámbar

---

## Roadmap de features pendientes (en orden de prioridad)

### Próximas (pueden hacerse en el mismo index.html)

1. **Felicitación al completar entreno** — al marcar todos los sets del día, mostrar modal/overlay con: racha actual, kcal estimadas quemadas (basado en peso corporal + tipo de sesión + duración), mensaje motivador. Incluir opción de registrar cardio extra al final.

2. **Frases motivadoras diarias** — array de ~30-50 frases, una aleatoria por día (seed = fecha) mostrada arriba del todo en la página de entreno.

3. **Cardio post-entreno** — campo al final de cada sesión para registrar: modalidad, duración y zona cardíaca. Suma kcal al total del día.

4. **Notificación en barra de herramientas del móvil** con el timer de descanso (requiere Notification API + Web Worker para funcionar con app en background). Funciona bien en Android, limitado en iOS.

5. **Guía de ejercicios** — nueva sección o modal con descripción técnica de cada ejercicio, músculos trabajados, y enlace a video de YouTube. Las imágenes propias son difíciles por copyright; mejor usar ilustraciones SVG o links externos.

6. **Mejora visual general** — los cambios de diseño pendientes incluyen:
   - Pulir el fondo (actualmente: grid de dots + gradientes, pero puede mejorar)
   - Revisar tipografía de los cards

### Mediano plazo (requieren algo más de trabajo)

7. **Editor de rutina personalizada** — nueva pestaña donde el usuario crea su propia rutina: nombre del día, lista de ejercicios con todos sus parámetros. Guardada en `state.customRoutine`. Cuando existe, reemplaza a `ROUTINE`. Necesita UI de drag-to-reorder y gestión de múltiples días.

8. **Perfil de usuario** — nombre, peso, altura, edad, sexo. Almacenado en `state.profile`. Usado para calcular kcal quemadas y personalizar mensajes. Podría estar en Ajustes.

### Largo plazo (requieren backend)

9. **Funcionalidad social** — ver si un amigo va a entrenar, comparar progreso. Requiere autenticación + base de datos. Opciones recomendadas: Firebase Realtime DB o Supabase (ambos tienen tier gratuito). Esto implicaría convertir el proyecto en algo más complejo (React + build step recomendado en ese punto).

---

## Convenciones de código

- Todo en un solo `<script>` embebido. No hay módulos.
- **No usar `todayKey()` en funciones de sesión de entrenamiento.** Usar `dateKeyForDay(day)`.
- Al modificar datos que necesitan re-render, llamar `renderTraining()` al final.
- La excepción es `updateSetCascade`: usa `syncCascadeDOM()` para no perder el foco del input.
- Los IDs de ejercicios de la rutina siguen el patrón `e{día}_{número}` (ej: `e1_3`).
- Los ejercicios custom tienen IDs `custom_{timestamp}`.
- Los overrides de sesión se guardan en `state.sessions[dk][day][exId].override` y son session-scoped (se pierden al día siguiente, que es lo deseado).
- Los ejercicios custom persistentes se guardan en `state.customExercises[day][]`.
- Al añadir features nuevas que requieran nuevo state, añadir el campo en la función `load()` con valor por defecto.
- Subir la version del cache en `sw.js` (`mypath-vN`) en cada deploy para forzar refresh en móviles que tienen la PWA instalada.

---

## Comandos útiles para Claude Code

```bash
# Ver la app en el navegador
# Abrí index.html con Live Server (extensión VS Code)
# O: python3 -m http.server 8080 → localhost:8080

# Validar JS (detecta errores de sintaxis)
node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const m=html.match(/<script>([\s\S]*?)<\/script>/);try{new Function(m[1]);console.log('✓ JS OK')}catch(e){console.error('✗',e.message)}"

# Verificar balance de tags HTML
python3 -c "import re;html=open('index.html').read();[(print(f'✓ <{t}>') if len(re.findall(f'<{t}[\s>]',html))==len(re.findall(f'</{t}>',html)) else print(f'✗ <{t}>')) for t in ['div','button','script','select','textarea']]"

# Deploy: subir cambios a GitHub → Netlify actualiza automáticamente en ~30 seg
git add -A && git commit -m "descripción del cambio" && git push
```
