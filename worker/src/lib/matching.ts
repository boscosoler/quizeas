import type { Answer, Participant, Pair, Question } from './types';

/**
 * Spec §7.1: Ponderated similarity.
 * For each weighted choice question where both picked the same option,
 * add matchWeight points. Divide by max possible points → percentage.
 * Question 0 (name) is excluded by type !== 'choice'.
 */
export interface Similarity {
  points: number;
  max: number;
  percentage: number;
}

export function computeSimilarity(
  a: Answer[],
  b: Answer[],
  questions: Question[]
): Similarity {
  let points = 0;
  let max = 0;

  for (const q of questions) {
    if (q.type !== 'choice' || q.matchWeight === 0) continue;
    max += q.matchWeight;

    const aOpt = a.find((x) => x.questionId === q.id)?.optionIndex;
    const bOpt = b.find((x) => x.questionId === q.id)?.optionIndex;
    if (aOpt != null && bOpt != null && aOpt === bOpt) {
      points += q.matchWeight;
    }
  }

  const percentage = max === 0 ? 0 : Math.round((points / max) * 100);
  return { points, max, percentage };
}

interface Candidate {
  i: number;
  j: number;
  points: number;
  percentage: number;
}

/**
 * Spec §7.2: Greedy 1-to-1 pairing.
 * Order all candidate pairs by similarity desc, assign matches skipping
 * anyone already paired. If the count is odd, the leftover joins the
 * existing pair with which they have the highest compatibility (trio).
 *
 * Returns Pair objects with empty `reason` — to be filled by Claude later.
 */
export function greedyPairing(
  participants: Participant[],
  questions: Question[]
): Pair[] {
  const n = participants.length;
  if (n < 2) return [];

  const candidates: Candidate[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = computeSimilarity(
        participants[i].answers,
        participants[j].answers,
        questions
      );
      candidates.push({ i, j, points: sim.points, percentage: sim.percentage });
    }
  }

  candidates.sort(
    (a, b) => b.percentage - a.percentage || b.points - a.points || a.i - b.i
  );

  const targetPairs = Math.floor(n / 2);
  const assigned = new Set<number>();
  const pairs: Pair[] = [];

  for (const c of candidates) {
    if (pairs.length >= targetPairs) break;
    if (assigned.has(c.i) || assigned.has(c.j)) continue;
    assigned.add(c.i);
    assigned.add(c.j);
    pairs.push({
      id: crypto.randomUUID(),
      type: 'pair',
      members: [
        { sessionId: participants[c.i].sessionId, name: participants[c.i].name },
        { sessionId: participants[c.j].sessionId, name: participants[c.j].name },
      ],
      percentage: c.percentage,
      reason: '',
    });
  }

  // Odd participant: attach to the pair where compatibility is highest.
  if (n % 2 === 1) {
    const leftoverIdx = participants.findIndex((_p, idx) => !assigned.has(idx));
    if (leftoverIdx !== -1 && pairs.length > 0) {
      let bestPair = 0;
      let bestPct = -1;
      for (let p = 0; p < pairs.length; p++) {
        for (const m of pairs[p].members) {
          const memberIdx = participants.findIndex(
            (pp) => pp.sessionId === m.sessionId
          );
          if (memberIdx === -1) continue;
          const sim = computeSimilarity(
            participants[leftoverIdx].answers,
            participants[memberIdx].answers,
            questions
          );
          if (sim.percentage > bestPct) {
            bestPct = sim.percentage;
            bestPair = p;
          }
        }
      }
      pairs[bestPair].type = 'trio';
      pairs[bestPair].members.push({
        sessionId: participants[leftoverIdx].sessionId,
        name: participants[leftoverIdx].name,
      });
      assigned.add(leftoverIdx);
    }
  }

  return pairs;
}
