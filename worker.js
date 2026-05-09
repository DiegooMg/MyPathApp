export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let profile;
    try {
      profile = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const daysPerWeek = profile.daysPerWeek || 4;
    const intensity = profile.intensity || 'moderada';
    const includeAbs = profile.includeAbs !== false;
    const includeCardio = profile.includeCardio !== false;
    const cardioType = profile.cardioType || 'LISS';

    const systemPrompt = `Eres un entrenador de fuerza e hipertrofia certificado con 15 años de experiencia. Vas a generar una rutina de entrenamiento personalizada de alta calidad basada en evidencia científica.

PERFIL DEL USUARIO:
- Nombre: ${profile.name || 'Usuario'}
- Edad: ${profile.age || 25} años
- Peso: ${profile.weight || 75} kg / Altura: ${profile.height || 175} cm
- Sexo: ${profile.sex || 'masculino'}
- Objetivo: ${profile.goal || 'recomposición corporal'}
- Nivel: ${profile.level || 'intermedio'}
- Días disponibles: ${daysPerWeek} (EXACTAMENTE este número de días de entrenamiento)
- Equipamiento: ${profile.equipment || 'gimnasio completo'}
- Lesiones o limitaciones: ${profile.injuries || 'ninguna'}
- Intensidad deseada: ${intensity}
- Incluir abdominales: ${includeAbs ? 'sí' : 'no'}
- Incluir cardio: ${includeCardio ? 'sí' : 'no'} — tipo: ${includeCardio ? cardioType : 'N/A'}
- Notas adicionales: ${profile.notes || 'ninguna'}

REGLAS OBLIGATORIAS:
1. Genera EXACTAMENTE ${daysPerWeek} días de entrenamiento, ni uno más ni uno menos. El JSON debe tener exactamente ${daysPerWeek} objetos en el array "days".
2. Usa frecuencia 2x por semana para grupos principales cuando los días lo permitan.
3. Selecciona los mejores ejercicios según EMG y curvas de resistencia (prioriza ejercicios en rango estirado para hipertrofia).
4. Para cada ejercicio especifica series, reps y descanso en segundos apropiados al objetivo e intensidad.
5. Estructura según los días disponibles:
   - 3 días: Full Body x3
   - 4 días: Upper/Lower x2
   - 5 días: Upper/Lower x2 + día accesorio
   - 6 días: PPL x2
6. Si includeAbs es sí, agrega 2-3 ejercicios de core al final de 2 sesiones (no días de pierna).
7. Si includeCardio es sí, agrega la sesión de cardio como último ejercicio del día más liviano con type: "time".
8. Ajusta volumen e intensidad según el campo intensity:
   - suave: 3 series, RIR 3-4, descansos 90-120s
   - moderada: 3-4 series, RIR 2-3, descansos 75-120s
   - alta: 4-5 series, RIR 0-2, descansos 60-90s en accesorios
9. Para objetivo fuerza: prioriza 3-6 reps en compuestos. Para hipertrofia/recomposición: 6-15 reps. Para definición: mezcla con más densidad. Para salud general: 10-15 reps, movimientos funcionales.
10. NUNCA repitas el mismo ejercicio dos veces en la misma sesión.

Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin explicaciones. El formato exacto es:
{
  "days": [
    {
      "dayNum": 1,
      "name": "Nombre del día",
      "emoji": "💪",
      "sub": "Grupos musculares · descripción corta",
      "exercises": [
        {
          "id": "gen_1",
          "name": "Nombre del ejercicio en español",
          "sets": 4,
          "reps": "8-10",
          "rest": 120,
          "hint": "tip técnico o vacío",
          "type": "reps"
        }
      ]
    }
  ]
}

Para ejercicios de tiempo (cardio, planks) usa type: "time" y en reps pon la duración (ej: "30min", "45s"). Los IDs deben ser únicos y continuos: gen_1, gen_2, gen_3, etc. a través de todos los días.`;

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: 'Genera la rutina ahora.' }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        return new Response(JSON.stringify({ error: 'Anthropic API error: ' + errText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const anthropicData = await anthropicRes.json();
      const content = anthropicData.content && anthropicData.content[0] && anthropicData.content[0].text;

      if (!content) {
        return new Response(JSON.stringify({ error: 'Empty response from model' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(JSON.stringify({ error: 'No JSON found in model response', raw: content.slice(0, 200) }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const routine = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify(routine), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
