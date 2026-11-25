# Security Specification: Hendry_soulveyra HR Screening & Daily Video Assessment

## 1. Data Invariants
1. **Single Active Daily Config**: Only `dailyAssessments/current` can be read publicly (`get`), and `list` on `dailyAssessments` is denied. Only a verified HR admin (`hendry.njt@gmail.com` or an entry in `/admins/{uid}`) may create or update `dailyAssessments/current`.
2. **PII Isolation on Candidate Submissions**: `candidateSubmissions` contains PII (`fullName`, `mobile`, `email`). Public candidates can `create` a validated submission, but `get`, `list`, `update`, and `delete` are strictly restricted to verified HR admins. No unauthenticated or non-admin user may ever read or enumerate submissions.
3. **Strict Schema & Size Guards**: Every string field has `.size()` bounds; every array (`questions`, `iqPrompts`, `mcqAnswers`) has fixed or bounded size and index-level type checks; scores are bounded (`mcqScore` 0..8, `iqScore` 0..2, `totalScore` 0..10).
4. **Server Timestamp Integrity**: `updatedAt` on `dailyAssessments/current` and `createdAt` on `candidateSubmissions` MUST equal `request.time`.
5. **No Self-Assigned Admin Roles**: `/admins/{uid}` is locked against client creation/updates.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Daily Config Write**: Anonymous client tries to overwrite `dailyAssessments/current` with a phishing URL. -> **DENIED**
2. **Unverified Email Admin Spoof**: Signed-in user with `email_verified: false` tries to update `dailyAssessments/current` or list `candidateSubmissions`. -> **DENIED**
3. **Shadow Field Injection on Submission**: Candidate includes `isAdmin: true` or `bonusScore: 99` in `candidateSubmissions/{id}`. -> **DENIED** by `keys().hasOnly(...)`
4. **Score Forgery (>10)**: Candidate submits `totalScore: 100` or `mcqScore: 20`. -> **DENIED** by range bounds
5. **ID Poisoning**: Candidate sends a 1.5KB document ID for `submissionId`. -> **DENIED** by `isValidId()`
6. **PII Scraping via List**: Non-admin user attempts `getDocs(collection(db, 'candidateSubmissions'))`. -> **DENIED**
7. **PII Read via Direct Get**: Non-admin user attempts `getDoc(doc(db, 'candidateSubmissions', 'known-id'))`. -> **DENIED**
8. **Client-Forged Timestamp**: Candidate submits `createdAt` backdated to 2020 instead of `serverTimestamp()`. -> **DENIED** by `createdAt == request.time`
9. **Invalid Company Enum**: Candidate submits `company: "EvilCorp"`. -> **DENIED** by enum check
10. **Oversized Comment DoS**: Candidate submits a 50KB string in `iqResponse`. -> **DENIED** by `iqResponse.size() <= 1000`
11. **Self-Admin Escalation**: Authenticated non-admin writes `/admins/{theirUid}` with `role: 'admin'`. -> **DENIED**
12. **Blanket Config Enumeration**: Public user attempts `list` on `/dailyAssessments`. -> **DENIED**
