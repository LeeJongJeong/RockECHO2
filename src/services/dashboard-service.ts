import { parseTagsOnly, toInt } from '../lib/json'
import {
  countActivitiesByActionSince,
  countActivitiesByActionsSince,
  countHelpfulTop3Feedback,
  countIncidentsSince,
  countKnowledgeByStatus,
  countRankedFeedback,
  countReviewerActivitySince,
  countSearchEvents,
  countSearchFeedbackByType,
  countTotalIncidents,
  countZeroResultSearchEvents,
  listApprovedSeedProgress,
  listRecentKnowledgeEntries,
  listZeroResultQueriesSince
} from '../repositories/dashboard-repository'
import { countActivityLogs, listAuditLogs } from '../repositories/activity-repository'

export async function getDashboardStats(db: D1Database) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalIncidents,
    incidentsThisWeek,
    statusCounts,
    totalProcessed,
    approvedActions,
    totalSearches,
    zeroResultSearches,
    helpful,
    notHelpful,
    top3Helpful,
    rankedFeedback,
    reviewerActivity,
    seedProgress,
    zeroResultQueries
  ] = await Promise.all([
    countTotalIncidents(db),
    countIncidentsSince(db, weekAgo),
    countKnowledgeByStatus(db),
    countActivitiesByActionsSince(db, ['approved', 'rejected'], monthAgo),
    countActivitiesByActionSince(db, 'approved', monthAgo),
    countSearchEvents(db),
    countZeroResultSearchEvents(db),
    countSearchFeedbackByType(db, 'helpful'),
    countSearchFeedbackByType(db, 'not_helpful'),
    countHelpfulTop3Feedback(db),
    countRankedFeedback(db),
    countReviewerActivitySince(db, weekAgo),
    listApprovedSeedProgress(db),
    listZeroResultQueriesSince(db, weekAgo)
  ])

  const statusMap: Record<string, number> = {}
  for (const row of statusCounts.results) {
    statusMap[row.status] = row.cnt
  }

  const seedMap: Record<string, number> = {}
  for (const row of seedProgress.results) {
    seedMap[row.dbms] = row.cnt
  }

  const totalFeedback = (helpful?.cnt || 0) + (notHelpful?.cnt || 0)
  return {
    total_incidents: totalIncidents?.cnt || 0,
    this_week_incidents: incidentsThisWeek?.cnt || 0,
    approved_count: statusMap.approved || 0,
    ai_generated_count: statusMap.ai_generated || 0,
    reviewed_count: statusMap.reviewed || 0,
    needs_review_count: statusMap.needs_review || 0,
    ai_approval_rate: totalProcessed?.cnt ? Math.round((approvedActions?.cnt || 0) / totalProcessed.cnt * 100) : 0,
    zero_result_rate: totalSearches?.cnt ? Math.round((zeroResultSearches?.cnt || 0) / totalSearches.cnt * 100) : 0,
    thumbs_down_rate: totalFeedback ? Math.round((notHelpful?.cnt || 0) / totalFeedback * 100) : 0,
    search_usefulness: totalFeedback ? Math.round((helpful?.cnt || 0) / totalFeedback * 100) : 0,
    search_accuracy_top3: rankedFeedback?.cnt ? Math.round((top3Helpful?.cnt || 0) / rankedFeedback.cnt * 100) : 0,
    reviewer_activity_week: reviewerActivity?.cnt || 0,
    seed_progress: seedMap,
    zero_result_queries_week: zeroResultQueries.results
  }
}

export async function getRecentKnowledge(db: D1Database, query: { limit?: string }) {
  const limit = toInt(query.limit, 10)
  const items = await listRecentKnowledgeEntries(db, limit)
  return {
    items: items.results.map((entry) => parseTagsOnly(entry as Record<string, unknown>))
  }
}

export async function getAuditLog(db: D1Database, query: { limit?: string; offset?: string }) {
  const limit = toInt(query.limit, 30)
  const offset = toInt(query.offset, 0)
  const [items, total] = await Promise.all([
    listAuditLogs(db, limit, offset),
    countActivityLogs(db)
  ])

  return {
    items: items.results,
    total: total?.cnt || 0
  }
}
