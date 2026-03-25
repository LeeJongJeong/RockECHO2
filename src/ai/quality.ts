import type { KnowledgeEntry, KnowledgeQualityReport, QualityIssue, RunbookStep } from '../types'

const MUTATING_SQL_PATTERNS = [
  /\balter\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /\binsert\b/i,
  /\bdrop\b/i,
  /\btruncate\b/i,
  /\bcreate\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bkill\b/i,
  /\brestart\b/i,
  /\bstop\b/i,
  /\bstart\b/i,
  /\bflush\b/i,
  /\bconfig\s+set\b/i,
  /\bset\s+global\b/i,
  /\bset\s+persist\b/i,
  /\bvacuum\b/i,
  /\breindex\b/i,
  /\banalyze\b/i,
  /\bpg_cancel_backend\b/i,
  /\bpg_terminate_backend\b/i,
  /\brs\.stepDown\b/i,
  /\bsh\.stopBalancer\b/i
]

const READ_ONLY_SQL_PATTERNS = [
  /^\s*select\b/i,
  /^\s*show\b/i,
  /^\s*with\b/i,
  /^\s*explain\b/i,
  /^\s*info\b/i,
  /^\s*db\./i,
  /^\s*rs\./i,
  /^\s*cluster\b/i,
  /^\s*latency\b/i,
  /^\s*slowlog\b/i
]

const REMEDIATION_PATTERNS = [
  /\bkill\b/i,
  /\bcancel\b/i,
  /\bterminate\b/i,
  /\brestart\b/i,
  /\bset\b/i,
  /\bvacuum\b/i,
  /\breindex\b/i,
  /\banalyze\b/i,
  /\bconfig\b/i,
  /\bstop\b/i,
  /\bstart\b/i,
  /\bfailover\b/i,
  /\bmitigation\b/i,
  /\b조치\b/,
  /\b해소\b/,
  /\b재시작\b/,
  /\b종료\b/,
  /\b적용\b/
]

const VERIFICATION_PATTERNS = [
  /\bverify\b/i,
  /\bvalidation?\b/i,
  /\bcheck\b/i,
  /\bconfirm\b/i,
  /\bstatus\b/i,
  /\bagain\b/i,
  /\bre-check\b/i,
  /\bhealth\b/i,
  /\bverify\b/i,
  /\b검증\b/,
  /\b확인\b/,
  /\b재확인\b/,
  /\b후 상태\b/,
  /\b정상화\b/
]

function countNumberedLines(action: string): number {
  return action
    .split(/\r?\n/)
    .filter((line) => /^\s*\d+\.\s+/.test(line))
    .length
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isReadOnlyStep(step: RunbookStep): boolean {
  return READ_ONLY_SQL_PATTERNS.some((pattern) => pattern.test(step.sql || ''))
}

function isMutatingStep(step: RunbookStep): boolean {
  return MUTATING_SQL_PATTERNS.some((pattern) => pattern.test(step.sql || ''))
}

function looksLikeVerificationStep(step: RunbookStep): boolean {
  const combined = `${step.title || ''} ${step.sql || ''}`
  return VERIFICATION_PATTERNS.some((pattern) => pattern.test(combined)) || isReadOnlyStep(step)
}

function looksLikeRemediationStep(step: RunbookStep): boolean {
  const combined = `${step.title || ''} ${step.sql || ''}`
  return REMEDIATION_PATTERNS.some((pattern) => pattern.test(combined)) || isMutatingStep(step)
}

function pushIssue(issues: QualityIssue[], code: string, severity: 'error' | 'warning', message: string) {
  issues.push({ code, severity, message })
}

function inspectSteps(steps: RunbookStep[], kind: 'runbook' | 'diagnostic', issues: QualityIssue[]) {
  const minSteps = kind === 'runbook' ? 4 : 2

  if (steps.length < minSteps) {
    pushIssue(
      issues,
      `${kind}_too_short`,
      'error',
      kind === 'runbook'
        ? 'Runbook must have at least 4 ordered steps including pre-check and verification.'
        : 'Diagnostic steps should contain at least 2 ordered read-only inspection steps when the evidence is limited.'
    )
  }

  const titleSet = new Set<string>()

  steps.forEach((step, index) => {
    if (!step.title || step.title.trim().length < 4) {
      pushIssue(issues, `${kind}_title_missing_${index + 1}`, 'error', `${kind} step ${index + 1} has no meaningful title.`)
    }

    if (!step.sql || step.sql.trim().length < 6) {
      pushIssue(issues, `${kind}_sql_missing_${index + 1}`, 'error', `${kind} step ${index + 1} has no executable SQL or command.`)
    }

    const normalizedTitle = normalizeWhitespace(step.title || '')
    if (normalizedTitle) {
      if (titleSet.has(normalizedTitle)) {
        pushIssue(issues, `${kind}_duplicate_title_${index + 1}`, 'warning', `${kind} contains duplicated step titles.`)
      }
      titleSet.add(normalizedTitle)
    }
  })
}

export function evaluateKnowledgeQuality(entry: Partial<KnowledgeEntry>): KnowledgeQualityReport {
  const issues: QualityIssue[] = []
  const runbook = Array.isArray(entry.runbook) ? entry.runbook : []
  const diagnosticSteps = Array.isArray(entry.diagnostic_steps) ? entry.diagnostic_steps : []
  const action = typeof entry.action === 'string' ? entry.action : ''

  if (!entry.title || entry.title.trim().length < 5) {
    pushIssue(issues, 'title_missing', 'error', 'Title is too short.')
  }

  if (!entry.symptom || entry.symptom.trim().length < 8) {
    pushIssue(issues, 'symptom_missing', 'error', 'Symptom summary is too short.')
  }

  if (!entry.cause || entry.cause.trim().length < 12) {
    pushIssue(issues, 'cause_missing', 'error', 'Cause narrative is too short.')
  }

  if (!entry.version_range || !entry.version_range.trim()) {
    pushIssue(issues, 'version_range_missing', 'warning', 'Version range is missing.')
  }

  if (countNumberedLines(action) < 3) {
    pushIssue(issues, 'action_not_detailed', 'error', 'Action must be a numbered list with at least 3 items.')
  }

  inspectSteps(runbook, 'runbook', issues)
  inspectSteps(diagnosticSteps, 'diagnostic', issues)

  if (diagnosticSteps.some((step) => isMutatingStep(step))) {
    pushIssue(issues, 'diagnostic_has_mutation', 'error', 'Diagnostic steps must be read-only and must not contain destructive or state-changing commands.')
  }

  const diagnosticReadOnlyCount = diagnosticSteps.filter((step) => isReadOnlyStep(step)).length
  if (diagnosticSteps.length > 0 && diagnosticReadOnlyCount < Math.max(1, diagnosticSteps.length - 1)) {
    pushIssue(issues, 'diagnostic_not_read_only', 'error', 'Diagnostic steps do not look like consistent read-only inspection queries.')
  }

  const runbookPrecheck = runbook[0] ? isReadOnlyStep(runbook[0]) || looksLikeVerificationStep(runbook[0]) : false
  if (runbook.length > 0 && !runbookPrecheck) {
    pushIssue(issues, 'runbook_missing_precheck', 'warning', 'Runbook should begin with a pre-check or current-state verification step.')
  }

  const runbookRemediationCount = runbook.filter((step) => looksLikeRemediationStep(step)).length
  if (runbook.length > 0 && runbookRemediationCount === 0) {
    pushIssue(issues, 'runbook_missing_mitigation', 'error', 'Runbook does not contain an explicit mitigation or corrective action step.')
  }

  const runbookVerificationCount = runbook.filter((step) => looksLikeVerificationStep(step)).length
  if (runbook.length > 0 && runbookVerificationCount < 2) {
    pushIssue(issues, 'runbook_missing_verification', 'error', 'Runbook must contain verification after the mitigation.')
  }

  const placeholderCount = [...runbook, ...diagnosticSteps].reduce((count, step) => {
    return count + ((step.sql || '').match(/<[^>]+>/g)?.length || 0)
  }, 0)
  if (placeholderCount >= 6) {
    pushIssue(issues, 'too_many_placeholders', 'warning', 'Too many unresolved placeholders remain in SQL or commands.')
  }

  const errorPenalty = issues.filter((issue) => issue.severity === 'error').length * 16
  const warningPenalty = issues.filter((issue) => issue.severity === 'warning').length * 6
  const score = Math.max(0, 100 - errorPenalty - warningPenalty)
  const needsRepair = issues.some((issue) => issue.severity === 'error') || score < 78

  return { score, issues, needsRepair }
}

export function formatQualityIssuesForPrompt(report: KnowledgeQualityReport): string {
  if (report.issues.length === 0) {
    return 'No quality issues were detected.'
  }

  return report.issues
    .map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.message}`)
    .join('\n')
}
