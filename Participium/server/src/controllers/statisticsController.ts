//! STATISTICS CONTROLLER

import { ReportRepository } from "@repositories/ReportRepository";
import { OfficeType } from "@models/enums/OfficeType";
import { BadRequestError } from "@utils/utils";

/**
 * Get statistics about reports
 * Returns an array of statistics grouped by date with total, approved and rejected counts
 * Supports optional filtering by date range, period, and category
 * @param fromDate - Start date for filtering (optional)
 * @param toDate - End date for filtering (optional)
 * @param period - Aggregation period: 'daily' | 'weekly' | 'monthly' | 'yearly' (optional)
 * @param category - Category filter (OfficeType) (optional)
 */
export async function getStatistics(
  fromDate?: string,
  toDate?: string,
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly',
  category?: OfficeType
): Promise<Array<{ date: string; totalReports: number; approvedReports: number; rejectedReports: number }>> {
  const reportRepo = new ReportRepository();
  
  // Validate inputs
  if (period && !['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
    throw new BadRequestError("Invalid period. Must be one of: daily, weekly, monthly, yearly");
  }
  
  if (category && !Object.values(OfficeType).includes(category)) {
    throw new BadRequestError(`Invalid category. Must be one of: ${Object.values(OfficeType).join(', ')}`);
  }

  // Get statistics from repository
  const stats = await reportRepo.getReportStatistics(fromDate, toDate, period, category);
  
  return stats;
}

export async function getMacroStatistics(selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'daily') {
  const reportRepo = new ReportRepository();
  
  // Validate period parameter if provided
  const validPeriods = ['daily', 'weekly', 'monthly'];
  
  if (!validPeriods.includes(selectedPeriod)) {
    throw new BadRequestError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
  }

  // Get statistics
  const [reportsByCategory, reportsByState, reportTrends] = await Promise.all([
    reportRepo.getReportCountByCategory(),
    reportRepo.getReportCountByState(),
    reportRepo.getReportTrendsByPeriod(selectedPeriod)
  ]);

  return {
    byCategory: reportsByCategory,
    byState: reportsByState,
    trends: {
      period: selectedPeriod,
      data: reportTrends
    }
  };
}

