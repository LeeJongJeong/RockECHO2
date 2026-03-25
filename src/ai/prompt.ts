import { getDbmsGuide } from './dbms-guides'

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

function formatContext(contextInfo: string): string {
  return contextInfo
    ? ['Approved reference entries:', contextInfo].join('\n')
    : 'Approved reference entries: none'
}

export function buildSummarySystemPrompt(dbms: string): string {
  const guide = getDbmsGuide(dbms)

  return [
    `You are RockECHO's senior ${dbms.toUpperCase()} incident analyst.`,
    'Return one strict JSON object only. No markdown. No prose outside JSON.',
    'All narrative text must be written in Korean.',
    'Keep SQL, commands, product names, identifiers, version strings, and error codes exactly as they appear.',
    'This stage only creates the concise incident summary and the operator-facing action outline.',
    'Required keys: title, symptom, cause, action, tags, aliases, version_range, ai_quality_score.',
    'Rules:',
    '- symptom must be a concise 1 to 2 line summary of the real observed symptoms only.',
    '- cause must explain the most likely root cause, not just restate the symptom.',
    '- action must be a Korean numbered list with at least 3 items.',
    '- tags must have 5 to 10 short keywords.',
    '- aliases must have 2 to 5 useful alternate search phrases.',
    '- version_range must never be empty.',
    '- ai_quality_score must be a number between 0.0 and 1.0.',
    'Summary focus:',
    bulletList(guide.summaryFocus)
  ].join('\n')
}

export function buildSummaryUserPrompt(rawInput: string, errorLog: string | undefined, dbms: string, contextInfo = '', signalInfo = ''): string {
  return [
    `DBMS: ${dbms}`,
    formatContext(contextInfo),
    signalInfo ? `Extracted incident signals:\n${signalInfo}` : 'Extracted incident signals: none',
    errorLog ? `Error Log Context:\n${errorLog}` : '',
    'Analyze the following raw incident notes and return the summary JSON for stage 1.',
    'Do not generate runbook or diagnostic_steps in this stage.',
    'Raw input:',
    rawInput
  ].join('\n\n')
}

export function buildSummaryRepairSystemPrompt(dbms: string): string {
  const guide = getDbmsGuide(dbms)

  return [
    `You repair RockECHO stage 1 summary output for ${dbms.toUpperCase()}.`,
    'Return one strict JSON object only.',
    'All narrative text must be in Korean.',
    'Required keys: title, symptom, cause, action, tags, aliases, version_range, ai_quality_score.',
    'Do not add runbook or diagnostic_steps.',
    'Preserve valid technical facts, SQL, commands, identifiers, versions, and error codes.',
    'Summary focus:',
    bulletList(guide.summaryFocus)
  ].join('\n')
}

export function buildSummaryRepairUserPrompt(
  rawInput: string,
  errorLog: string | undefined,
  dbms: string,
  previousResponse: string,
  contextInfo = '',
  signalInfo = ''
): string {
  return [
    `DBMS: ${dbms}`,
    formatContext(contextInfo),
    signalInfo ? `Extracted incident signals:\n${signalInfo}` : 'Extracted incident signals: none',
    errorLog ? `Error Log Context:\n${errorLog}` : '',
    'Repair the previous stage 1 response into valid JSON with all required keys.',
    'Previous response:',
    previousResponse,
    'Raw input:',
    rawInput
  ].join('\n\n')
}

export function buildProcedureSystemPrompt(dbms: string): string {
  const guide = getDbmsGuide(dbms)

  return [
    `You are RockECHO's ${dbms.toUpperCase()} runbook author and diagnostic reviewer.`,
    'Return one strict JSON object only. No markdown.',
    'All narrative text must be in Korean.',
    'Keep SQL, commands, identifiers, version strings, product names, and error codes exactly as-is.',
    'Required keys: action, runbook, diagnostic_steps, ai_quality_score.',
    'Rules for action:',
    '- action must be a Korean numbered list with at least 3 detailed items.',
    '- action should separate immediate mitigation, post-action verification, and recurrence prevention.',
    'Rules for diagnostic_steps:',
    '- diagnostic_steps should usually contain 2 to 6 ordered steps depending on the evidence density and incident complexity.',
    '- Every diagnostic step must be read-only.',
    '- Start broad, then narrow down to the suspected subsystem.',
    '- Reuse exact object names, session ids, parameter names, and error codes from the extracted signals whenever available.',
    '- Each item must have step, title, sql.',
    'Rules for runbook:',
    '- runbook must contain 4 to 6 ordered steps.',
    '- Step 1 should be a pre-check.',
    '- Middle steps should contain the smallest safe mitigation.',
    '- Final step must verify recovery.',
    '- When a concrete table, index, process, session, parameter, or replica is mentioned, carry that exact identifier into the step title or SQL instead of generic placeholders.',
    '- Each item must have step, title, sql.',
    'Diagnostic focus:',
    bulletList(guide.diagnosticFocus),
    'Runbook focus:',
    bulletList(guide.runbookFocus),
    'Safety rules:',
    bulletList(guide.safetyRules),
    'Helpful read-only examples:',
    bulletList(guide.readOnlyExamples),
    'Helpful mitigation examples:',
    bulletList(guide.mitigationExamples),
    'Helpful verification examples:',
    bulletList(guide.verificationExamples)
  ].join('\n')
}

export function buildProcedureUserPrompt(
  rawInput: string,
  dbms: string,
  summaryDraft: Record<string, unknown>,
  contextInfo = '',
  signalInfo = ''
): string {
  return [
    `DBMS: ${dbms}`,
    formatContext(contextInfo),
    signalInfo ? `Extracted incident signals:\n${signalInfo}` : 'Extracted incident signals: none',
    'Use the summary draft and the raw input to generate the best possible diagnostic_steps and runbook.',
    'Do not return vague placeholders unless the raw input truly lacks a concrete identifier.',
    'If the extracted signals contain object names, settings, or commands, reflect them directly in the step titles and SQL where appropriate.',
    'Summary draft:',
    JSON.stringify(summaryDraft, null, 2),
    'Raw input:',
    rawInput
  ].join('\n\n')
}

export function buildProcedureRepairSystemPrompt(dbms: string): string {
  const guide = getDbmsGuide(dbms)

  return [
    `You repair RockECHO stage 2 procedure output for ${dbms.toUpperCase()}.`,
    'Return one strict JSON object only.',
    'All narrative text must be in Korean.',
    'Required keys: action, runbook, diagnostic_steps, ai_quality_score.',
    'diagnostic_steps must stay read-only.',
    'runbook must include pre-check, mitigation, and post-check verification.',
    'Use the reported quality issues to correct the draft, not just rephrase it.',
    'Diagnostic focus:',
    bulletList(guide.diagnosticFocus),
    'Runbook focus:',
    bulletList(guide.runbookFocus),
    'Safety rules:',
    bulletList(guide.safetyRules)
  ].join('\n')
}

export function buildProcedureRepairUserPrompt(
  rawInput: string,
  dbms: string,
  summaryDraft: Record<string, unknown>,
  currentDraft: Record<string, unknown>,
  qualityIssues: string,
  contextInfo = '',
  signalInfo = ''
): string {
  return [
    `DBMS: ${dbms}`,
    formatContext(contextInfo),
    signalInfo ? `Extracted incident signals:\n${signalInfo}` : 'Extracted incident signals: none',
    'Repair the procedure draft using the quality issues below.',
    'Keep any concrete object names, parameter names, and error indicators from the extracted signals in the repaired output whenever they are relevant.',
    'Quality issues:',
    qualityIssues,
    'Summary draft:',
    JSON.stringify(summaryDraft, null, 2),
    'Current procedure draft:',
    JSON.stringify(currentDraft, null, 2),
    'Raw input:',
    rawInput
  ].join('\n\n')
}
