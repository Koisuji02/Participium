import { getStatistics } from '../../../src/controllers/statisticsController';
import { ReportRepository } from '../../../src/repositories/ReportRepository';
import { OfficeType } from '../../../src/models/enums/OfficeType';
import { BadRequestError } from '../../../src/utils/utils';

// Mock the repository
jest.mock('../../../src/repositories/ReportRepository');

describe('Statistics Controller - Unit Tests', () => {
  let mockReportRepo: jest.Mocked<ReportRepository>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create mock instance
    mockReportRepo = {
      getReportStatistics: jest.fn()
    } as any;
    
    // Mock the constructor to return our mock instance
    (ReportRepository as jest.Mock).mockImplementation(() => mockReportRepo);
  });

  describe('getStatistics - No filters', () => {
    it('should return empty array when no reports exist', async () => {
      mockReportRepo.getReportStatistics.mockResolvedValueOnce([]);

      const result = await getStatistics();

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledTimes(1);
      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    it('should return statistics array when reports exist', async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 10, approvedReports: 8, rejectedReports: 2 },
        { date: '2026-01-04', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics();

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledTimes(1);
      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getStatistics - Date range filters', () => {
    it('should apply fromDate filter', async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics('2026-01-01');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith('2026-01-01', undefined, undefined, undefined);
      expect(result).toEqual(mockStats);
    });

    it('should apply toDate filter', async () => {
      const mockStats = [
        { date: '2026-01-03', totalReports: 3, approvedReports: 3, rejectedReports: 0 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, '2026-01-31');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, '2026-01-31', undefined, undefined);
      expect(result).toEqual(mockStats);
    });

    it('should apply both fromDate and toDate filters', async () => {
      const mockStats = [
        { date: '2026-01-15', totalReports: 8, approvedReports: 6, rejectedReports: 2 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics('2026-01-01', '2026-01-31');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith('2026-01-01', '2026-01-31', undefined, undefined);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getStatistics - Period filter', () => {
    it('should work with daily period', async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 3, approvedReports: 2, rejectedReports: 1 },
        { date: '2026-01-04', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, undefined, 'daily');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, 'daily', undefined);
      expect(result).toEqual(mockStats);
    });

    it('should work with weekly period', async () => {
      const mockStats = [
        { date: '2026-W01', totalReports: 15, approvedReports: 12, rejectedReports: 3 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, undefined, 'weekly');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, 'weekly', undefined);
      expect(result).toEqual(mockStats);
    });

    it('should work with monthly period', async () => {
      const mockStats = [
        { date: '2026-01', totalReports: 50, approvedReports: 40, rejectedReports: 10 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, undefined, 'monthly');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, 'monthly', undefined);
      expect(result).toEqual(mockStats);
    });

    it('should work with yearly period', async () => {
      const mockStats = [
        { date: '2026', totalReports: 500, approvedReports: 400, rejectedReports: 100 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, undefined, 'yearly');

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, 'yearly', undefined);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getStatistics - Category filter', () => {
    it('should filter by category', async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 8, approvedReports: 7, rejectedReports: 1 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, undefined, undefined, OfficeType.WASTE);

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, OfficeType.WASTE);
      expect(result).toEqual(mockStats);
    });

    it('should work with different category types', async () => {
      const categories = [
        OfficeType.WATER_SUPPLY,
        OfficeType.PUBLIC_LIGHTING,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.OTHER
      ];

      for (const category of categories) {
        const mockStats = [
          { date: '2026-01-05', totalReports: 5, approvedReports: 4, rejectedReports: 1 }
        ];
        
        mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

        const result = await getStatistics(undefined, undefined, undefined, category);

        expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, undefined, category);
        expect(result).toEqual(mockStats);
      }
    });
  });

  describe('getStatistics - Combined filters', () => {
    it('should apply period and category together', async () => {
      const mockStats = [
        { date: '2026-01', totalReports: 25, approvedReports: 20, rejectedReports: 5 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics(undefined, undefined, 'monthly', OfficeType.WASTE);

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith(undefined, undefined, 'monthly', OfficeType.WASTE);
      expect(result).toEqual(mockStats);
    });

    it('should apply all filters together', async () => {
      const mockStats = [
        { date: '2026-01-15', totalReports: 10, approvedReports: 8, rejectedReports: 2 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics('2026-01-01', '2026-01-31', 'daily', OfficeType.WASTE);

      expect(mockReportRepo.getReportStatistics).toHaveBeenCalledWith('2026-01-01', '2026-01-31', 'daily', OfficeType.WASTE);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getStatistics - Input validation', () => {
    it('should throw BadRequestError for invalid period', async () => {
      await expect(getStatistics(undefined, undefined, 'invalid' as any)).rejects.toThrow(BadRequestError);
      await expect(getStatistics(undefined, undefined, 'invalid' as any)).rejects.toThrow('Invalid period. Must be one of: daily, weekly, monthly, yearly');
    });

    it('should throw BadRequestError for invalid category', async () => {
      await expect(getStatistics(undefined, undefined, undefined, 'invalid_category' as any)).rejects.toThrow(BadRequestError);
      await expect(getStatistics(undefined, undefined, undefined, 'invalid_category' as any)).rejects.toThrow('Invalid category');
    });

    it('should validate period even with valid category', async () => {
      await expect(getStatistics(undefined, undefined, 'day' as any, OfficeType.WASTE)).rejects.toThrow(BadRequestError);
    });

    it('should validate category even with valid period', async () => {
      await expect(getStatistics(undefined, undefined, 'monthly', 'not_a_category' as any)).rejects.toThrow(BadRequestError);
    });
  });

  describe('getStatistics - Edge cases', () => {
    it('should handle empty results gracefully', async () => {
      mockReportRepo.getReportStatistics.mockResolvedValueOnce([]);

      const result = await getStatistics(undefined, undefined, 'monthly', OfficeType.WASTE);

      expect(result).toEqual([]);
    });

    it('should handle zero counts in results', async () => {
      const mockStats = [
        { date: '2026-01-05', totalReports: 0, approvedReports: 0, rejectedReports: 0 }
      ];

      mockReportRepo.getReportStatistics.mockResolvedValueOnce(mockStats);

      const result = await getStatistics();

      expect(result).toEqual(mockStats);
    });
  });

  describe('getStatistics - Repository instantiation', () => {
    it('should create a new ReportRepository instance', async () => {
      mockReportRepo.getReportStatistics.mockResolvedValueOnce([]);

      await getStatistics();

      expect(ReportRepository).toHaveBeenCalledTimes(1);
    });
  });
});

