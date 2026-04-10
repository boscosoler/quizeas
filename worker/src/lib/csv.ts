import type { Pair, Participant, Question } from './types';

function escapeCsv(value: string): string {
  if (value == null) return '';
  const needsQuoting = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function answersToString(
  answers: Participant['answers'],
  questions: Question[]
): string {
  return questions
    .filter((q) => q.type === 'choice')
    .map((q) => {
      const a = answers.find((x) => x.questionId === q.id);
      if (!a || a.optionIndex == null) return `${q.id}:-`;
      return `${q.id}:${q.options[a.optionIndex] ?? '?'}`;
    })
    .join(' | ');
}

/**
 * Spec §8.1: "Participante A, Participante B, %, Razón, Respuestas A, Respuestas B".
 * Trios get an extra row with the C member appended to the same pair metadata.
 */
export function buildCsv(
  pairs: Pair[],
  participantsById: Map<string, Participant>,
  questions: Question[]
): string {
  const header = [
    'Tipo',
    'Participante A',
    'Participante B',
    'Participante C',
    'Compatibilidad (%)',
    'Razón',
    'Respuestas A',
    'Respuestas B',
    'Respuestas C',
  ];

  const rows: string[] = [header.map(escapeCsv).join(',')];

  for (const pair of pairs) {
    const [a, b, c] = pair.members;
    const pa = participantsById.get(a?.sessionId ?? '');
    const pb = participantsById.get(b?.sessionId ?? '');
    const pc = c ? participantsById.get(c.sessionId) : undefined;

    const row = [
      pair.type,
      a?.name ?? '',
      b?.name ?? '',
      c?.name ?? '',
      String(pair.percentage),
      pair.reason,
      pa ? answersToString(pa.answers, questions) : '',
      pb ? answersToString(pb.answers, questions) : '',
      pc ? answersToString(pc.answers, questions) : '',
    ];
    rows.push(row.map(escapeCsv).join(','));
  }

  return rows.join('\r\n');
}
