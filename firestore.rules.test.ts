/**
 * Security Rules Verification Suite (Dirty Dozen Adversarial Payloads)
 * Documents expected PERMISSION_DENIED outcomes for every adversarial vector.
 */

export const dirtyDozenCases = [
  { name: 'Unauthenticated dailyAssessments/current write', expected: 'PERMISSION_DENIED' },
  { name: 'Unverified email admin spoof', expected: 'PERMISSION_DENIED' },
  { name: 'Shadow field injection (isAdmin: true) on candidateSubmissions', expected: 'PERMISSION_DENIED' },
  { name: 'Forged totalScore > 10 on candidateSubmissions', expected: 'PERMISSION_DENIED' },
  { name: 'Oversized 1.5KB document ID poisoning', expected: 'PERMISSION_DENIED' },
  { name: 'Non-admin list query on candidateSubmissions', expected: 'PERMISSION_DENIED' },
  { name: 'Non-admin direct get on candidateSubmissions', expected: 'PERMISSION_DENIED' },
  { name: 'Client-forged backdated createdAt timestamp', expected: 'PERMISSION_DENIED' },
  { name: 'Invalid company enum value', expected: 'PERMISSION_DENIED' },
  { name: 'Oversized 50KB iqResponse string', expected: 'PERMISSION_DENIED' },
  { name: 'Self-admin role escalation on /admins/{uid}', expected: 'PERMISSION_DENIED' },
  { name: 'Public list query on /dailyAssessments', expected: 'PERMISSION_DENIED' },
];
