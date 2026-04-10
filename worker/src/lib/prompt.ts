import type { Answer, Member, Question } from './types';

function formatAnswersFor(
  name: string,
  answers: Answer[],
  questions: Question[]
): string {
  const lines = [`${name}:`];
  for (const q of questions) {
    if (q.type !== 'choice') continue;
    const a = answers.find((x) => x.questionId === q.id);
    if (!a || a.optionIndex == null) continue;
    const pick = q.options[a.optionIndex] ?? '(sin respuesta)';
    lines.push(`  - ${q.text} → ${pick}`);
  }
  return lines.join('\n');
}

export function buildPairPrompt(
  members: Array<Member & { answers: Answer[] }>,
  questions: Question[]
): string {
  const blocks = members
    .map((m) => formatAnswersFor(m.name, m.answers, questions))
    .join('\n\n');

  const who =
    members.length === 2
      ? `${members[0].name} y ${members[1].name}`
      : `${members
          .slice(0, -1)
          .map((m) => m.name)
          .join(', ')} y ${members[members.length - 1].name}`;

  const groupKind = members.length === 2 ? 'dúo' : 'trío';

  return `Eres el copiloto de una dinámica de networking para emprendedores en el Encuentro Anual SinOficina 2026. Acaban de responder un quiz y el algoritmo ha emparejado a ${who} como ${groupKind} afín.

Respuestas del ${groupKind}:

${blocks}

Escribe UNA sola frase en español (máximo 2 líneas, ~30 palabras) que explique por qué tienen afinidad. Destaca 2 o 3 puntos concretos en los que coincidan (usa el contenido de sus respuestas, no el nombre de la categoría). Tono: divertido, cercano, con guiño. Tutea.

Reglas estrictas:
- Responde SOLO con la frase, sin preámbulo, sin comillas, sin "Aquí tienes:", sin emojis.
- No empieces literalmente con "Los dos" / "Las dos" / "Los tres"; varía el inicio.
- Menciona los nombres solo si aporta, no obligatoriamente.
- Si hay poca coincidencia real, sé honesto con humor ("os complementáis bien porque...").`;
}
