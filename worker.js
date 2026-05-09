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

    const systemPrompt = `Eres un entrenador personal profesional. Genera una rutina semanal de entrenamiento personalizada basada en el perfil del usuario. Devuelve ÚNICAMENTE JSON válido con este formato exacto, sin texto adicional:
{
  "days": [
    {
      "dayNum": 1,
      "name": "Nombre del día",
      "emoji": "💪",
      "sub": "descripción corta del día",
      "exercises": [
        { "id": "gen_1", "name": "Nombre ejercicio en español", "sets": 4, "reps": "6-8", "rest": 180, "hint": "" }
      ]
    }
  ]
}

Reglas:
- Incluye 7 días (del 1 al 7). Los días de descanso tienen exercises vacío [].
- Usa nombres de ejercicios en español.
- Adapta al equipamiento disponible, lesiones y objetivos.
- Los IDs deben ser únicos: gen_1, gen_2, etc. (continuos a través de todos los días).
- rest es en segundos (60-210). reps es un string como "8-10" o "15-20".
- Solo devuelve el JSON, nada más.`;

    const userMessage = `Crea una rutina semanal personalizada para:
Nombre: ${profile.name || 'Usuario'}
Edad: ${profile.age || 25} años
Peso: ${profile.weight || 75} kg
Altura: ${profile.height || 175} cm
Sexo: ${profile.sex || 'masculino'}
Objetivo: ${profile.goal || 'recomposición corporal'}
Nivel: ${profile.level || 'intermedio'}
Días disponibles por semana: ${profile.daysPerWeek || 4}
Equipamiento: ${profile.equipment || 'gimnasio completo'}
Lesiones o limitaciones: ${profile.injuries || 'ninguna'}
Notas adicionales: ${profile.notes || 'ninguna'}`;

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
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
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
