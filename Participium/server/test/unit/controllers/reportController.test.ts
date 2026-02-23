import {
  getReports,
  getReportsByOffice,
  getReport,
  uploadReport,
  deleteReport,
  getMyReports
} from '../../../src/controllers/reportController';
import { ReportRepository } from '../../../src/repositories/ReportRepository';
import { UserRepository } from '../../../src/repositories/UserRepository';
import { FollowRepository } from '../../../src/repositories/FollowRepository';
import * as mapperService from '../../../src/services/mapperService';
import * as fileUtils from '../../../src/utils/fileUtils';
import { OfficeType } from '../../../src/models/enums/OfficeType';
import { ReportState } from '../../../src/models/enums/ReportState';
import { BadRequestError } from '../../../src/utils/utils';
import { ReportDAO } from '../../../src/models/dao/ReportDAO';
import { UserDAO } from '../../../src/models/dao/UserDAO';
import { Report } from '../../../src/models/dto/Report';

jest.mock('@repositories/ReportRepository');
jest.mock('@repositories/UserRepository');
jest.mock('@repositories/FollowRepository');
jest.mock('@services/mapperService');
jest.mock('@utils/fileUtils');

describe('reportController', () => {
  let mockReportRepo: jest.Mocked<ReportRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockFollowRepo: jest.Mocked<FollowRepository>;

  beforeEach(() => {
    mockReportRepo = {
      getApprovedReports: jest.fn(),
      getReportById: jest.fn(),
      createReport: jest.fn(),
      deleteReport: jest.fn(),
      getReportsByAuthorId: jest.fn()
    } as any;

    mockUserRepo = {
      getUserById: jest.fn()
    } as any;

    mockFollowRepo = {
      follow: jest.fn()
    } as any;

    (ReportRepository as jest.Mock).mockImplementation(() => mockReportRepo);
    (UserRepository as jest.Mock).mockImplementation(() => mockUserRepo);
    (FollowRepository as jest.Mock).mockImplementation(() => mockFollowRepo);

    (mapperService.mapReportDAOToDTO as jest.Mock).mockImplementation((dao) => ({
      id: dao.id,
      title: dao.title,
      category: dao.category,
      state: dao.state
    }));

    (fileUtils.validatePhotosCount as jest.Mock).mockReturnValue(undefined);
    (fileUtils.getPhotoPaths as jest.Mock).mockReturnValue(['/path/photo1.jpg']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===================== getReports =====================
  describe('getReports', () => {
    it('should return approved reports', async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 1,
          title: 'Report 1',
          category: OfficeType.WATER_SUPPLY,
          state: ReportState.ASSIGNED
        } as any,
        {
          id: 2,
          title: 'Report 2',
          category: OfficeType.ROADS_AND_URBAN_FURNISHINGS,
          state: ReportState.IN_PROGRESS
        } as any
      ];

      mockReportRepo.getApprovedReports.mockResolvedValue(mockReports);

      const result = await getReports();

      expect(mockReportRepo.getApprovedReports).toHaveBeenCalled();
      expect(mapperService.mapReportDAOToDTO).toHaveBeenCalledTimes(2);
      expect(mapperService.mapReportDAOToDTO).toHaveBeenCalledWith(
        mockReports[0],
        { includeFollowerUsers: false }
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no approved reports exist', async () => {
      mockReportRepo.getApprovedReports.mockResolvedValue([]);

      const result = await getReports();

      expect(mockReportRepo.getApprovedReports).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // ===================== getReportsByOffice =====================
  describe('getReportsByOffice', () => {
    it('should return reports filtered by office type', async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 1,
          title: 'Water Report',
          category: OfficeType.WATER_SUPPLY,
          state: ReportState.ASSIGNED
        } as any,
        {
          id: 2,
          title: 'Road Report',
          category: OfficeType.ROADS_AND_URBAN_FURNISHINGS,
          state: ReportState.IN_PROGRESS
        } as any,
        {
          id: 3,
          title: 'Another Water Report',
          category: OfficeType.WATER_SUPPLY,
          state: ReportState.SUSPENDED
        } as any
      ];

      mockReportRepo.getApprovedReports.mockResolvedValue(mockReports);

      const result = await getReportsByOffice(OfficeType.WATER_SUPPLY);

      expect(mockReportRepo.getApprovedReports).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(mapperService.mapReportDAOToDTO).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no reports match office type', async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 1,
          title: 'Road Report',
          category: OfficeType.ROADS_AND_URBAN_FURNISHINGS,
          state: ReportState.IN_PROGRESS
        } as any
      ];

      mockReportRepo.getApprovedReports.mockResolvedValue(mockReports);

      const result = await getReportsByOffice(OfficeType.WATER_SUPPLY);

      expect(result).toEqual([]);
    });

    it('should handle all office types correctly', async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 1,
          title: 'Lighting Report',
          category: OfficeType.PUBLIC_LIGHTING,
          state: ReportState.ASSIGNED
        } as any
      ];

      mockReportRepo.getApprovedReports.mockResolvedValue(mockReports);

      const result = await getReportsByOffice(OfficeType.PUBLIC_LIGHTING);

      expect(result).toHaveLength(1);
    });
  });

  // ===================== getReport =====================
  describe('getReport', () => {
    it('should return a specific report with follower users', async () => {
      const mockReport: ReportDAO = {
        id: 1,
        title: 'Test Report',
        category: OfficeType.WASTE,
        state: ReportState.ASSIGNED
      } as any;

      mockReportRepo.getReportById.mockResolvedValue(mockReport);

      const result = await getReport(1);

      expect(mockReportRepo.getReportById).toHaveBeenCalledWith(1);
      expect(mapperService.mapReportDAOToDTO).toHaveBeenCalledWith(
        mockReport,
        { includeFollowerUsers: true }
      );
      expect(result).toBeDefined();
    });

    it('should throw error if report not found', async () => {
      mockReportRepo.getReportById.mockRejectedValue(new Error('Report not found'));

      await expect(getReport(999)).rejects.toThrow('Report not found');
      expect(mockReportRepo.getReportById).toHaveBeenCalledWith(999);
    });
  });

  // ===================== uploadReport =====================
  describe('uploadReport', () => {
    const validReportDto: Report = {
      title: 'New Report',
      category: OfficeType.WATER_SUPPLY,
      anonymity: false,
      location: {
        Coordinates: {
          latitude: 45.0703,
          longitude: 7.6869
        }
      },
      document: {
        description: 'Test description'
      }
    } as any;

    const mockFiles = [
      {
        filename: 'photo1.jpg',
        path: '/uploads/photo1.jpg'
      }
    ] as any[];

    it('should upload report with authenticated user', async () => {
      const mockUser: UserDAO = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      } as any;

      const mockCreatedReport: ReportDAO = {
        id: 10,
        title: 'New Report',
        category: OfficeType.WATER_SUPPLY,
        state: ReportState.PENDING,
        author: mockUser
      } as any;

      mockUserRepo.getUserById.mockResolvedValue(mockUser);
      mockReportRepo.createReport.mockResolvedValue(mockCreatedReport);

      const result = await uploadReport(validReportDto, mockFiles, 1);

      expect(mockUserRepo.getUserById).toHaveBeenCalledWith(1);
      expect(fileUtils.validatePhotosCount).toHaveBeenCalledWith(mockFiles);
      expect(fileUtils.getPhotoPaths).toHaveBeenCalledWith(mockFiles);
      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        'New Report',
        { Coordinates: { latitude: 45.0703, longitude: 7.6869 } },
        mockUser,
        false,
        OfficeType.WATER_SUPPLY,
        {
          Description: 'Test description',
          Photos: ['/path/photo1.jpg']
        }
      );
      expect(mockFollowRepo.follow).toHaveBeenCalledWith(1, 10);
      expect(result).toBeDefined();
    });

    it('should upload anonymous report without user', async () => {
      const anonymousReport: Report = {
        ...validReportDto,
        anonymity: true
      };

      const mockCreatedReport: ReportDAO = {
        id: 11,
        title: 'New Report',
        category: OfficeType.WATER_SUPPLY,
        state: ReportState.PENDING,
        author: null
      } as any;

      mockReportRepo.createReport.mockResolvedValue(mockCreatedReport);

      const result = await uploadReport(anonymousReport, mockFiles);

      expect(mockUserRepo.getUserById).not.toHaveBeenCalled();
      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        'New Report',
        { Coordinates: { latitude: 45.0703, longitude: 7.6869 } },
        null,
        true,
        OfficeType.WATER_SUPPLY,
        expect.any(Object)
      );
      expect(mockFollowRepo.follow).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestError if report data is missing', async () => {
      await expect(uploadReport(null as any, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Missing report data')
      );
    });

    it('should throw BadRequestError if title is missing', async () => {
      const invalidReport = { ...validReportDto, title: undefined };

      await expect(uploadReport(invalidReport as any, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Missing required field: title')
      );
    });

    it('should throw BadRequestError if category is missing', async () => {
      const invalidReport = { ...validReportDto, category: undefined };

      await expect(uploadReport(invalidReport as any, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Missing required field: category')
      );
    });

    it('should throw BadRequestError if category is invalid', async () => {
      const invalidReport = { ...validReportDto, category: 'INVALID_CATEGORY' as any };

      await expect(uploadReport(invalidReport, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Invalid category value: INVALID_CATEGORY')
      );
    });

    it('should throw BadRequestError if coordinates are missing', async () => {
      const invalidReport = {
        ...validReportDto,
        location: {}
      };

      await expect(uploadReport(invalidReport as any, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Missing or invalid location coordinates')
      );
    });

    it('should throw BadRequestError if latitude is invalid', async () => {
      const invalidReport = {
        ...validReportDto,
        location: {
          Coordinates: {
            latitude: 'invalid' as any,
            longitude: 7.6869
          }
        }
      } as any;

      await expect(uploadReport(invalidReport, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Missing or invalid location coordinates')
      );
    });

    it('should throw BadRequestError if longitude is invalid', async () => {
      const invalidReport = {
        ...validReportDto,
        location: {
          Coordinates: {
            latitude: 45.0703,
            longitude: null as any
          }
        }
      } as any;

      await expect(uploadReport(invalidReport, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Missing or invalid location coordinates')
      );
    });

    it('should handle lowercase "coordinates" field', async () => {
      const reportWithLowercaseCoords: any = {
        title: 'New Report',
        category: OfficeType.WATER_SUPPLY,
        anonymity: false,
        location: {
          coordinates: {
            latitude: 45.0703,
            longitude: 7.6869
          }
        },
        document: {
          description: 'Test description'
        }
      };

      const mockCreatedReport: ReportDAO = {
        id: 12,
        title: 'New Report',
        category: OfficeType.WATER_SUPPLY,
        state: ReportState.PENDING
      } as any;

      mockReportRepo.createReport.mockResolvedValue(mockCreatedReport);

      const result = await uploadReport(reportWithLowercaseCoords, mockFiles);

      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        'New Report',
        { Coordinates: { latitude: 45.0703, longitude: 7.6869 } },
        null,
        false,
        OfficeType.WATER_SUPPLY,
        expect.any(Object)
      );
      expect(result).toBeDefined();
    });

    it('should validate photos count', async () => {
      (fileUtils.validatePhotosCount as jest.Mock).mockImplementation(() => {
        throw new BadRequestError('Invalid number of photos');
      });

      await expect(uploadReport(validReportDto, mockFiles, 1)).rejects.toThrow(
        new BadRequestError('Invalid number of photos')
      );
    });

    it('should handle all valid office types', async () => {
      const mockCreatedReport: ReportDAO = {
        id: 13,
        title: 'Test',
        state: ReportState.PENDING
      } as any;

      mockReportRepo.createReport.mockResolvedValue(mockCreatedReport);

      const officeTypes = [
        OfficeType.WATER_SUPPLY,
        OfficeType.ARCHITECTURAL_BARRIERS,
        OfficeType.PUBLIC_LIGHTING,
        OfficeType.WASTE,
        OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS,
        OfficeType.ROADS_AND_URBAN_FURNISHINGS,
        OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS,
        OfficeType.ORGANIZATION,
        OfficeType.OTHER
      ];

      for (const officeType of officeTypes) {
        const report = { ...validReportDto, category: officeType } as any;
        await expect(uploadReport(report, mockFiles)).resolves.toBeDefined();
      }
    });

    it('should handle report without description', async () => {
      const reportWithoutDesc: Report = {
        ...validReportDto,
        document: undefined
      };

      const mockCreatedReport: ReportDAO = {
        id: 14,
        title: 'Test',
        state: ReportState.PENDING
      } as any;

      mockReportRepo.createReport.mockResolvedValue(mockCreatedReport);

      const result = await uploadReport(reportWithoutDesc, mockFiles);

      expect(mockReportRepo.createReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        null,
        false,
        expect.any(String),
        {
          Description: undefined,
          Photos: expect.any(Array)
        }
      );
      expect(result).toBeDefined();
    });
  });

  // ===================== deleteReport =====================
  describe('deleteReport', () => {
    it('should delete a report successfully', async () => {
      mockReportRepo.deleteReport.mockResolvedValue(undefined);

      await deleteReport(1);

      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith(1);
    });

    it('should throw error if report not found during deletion', async () => {
      mockReportRepo.deleteReport.mockRejectedValue(new Error('Report not found'));

      await expect(deleteReport(999)).rejects.toThrow('Report not found');
      expect(mockReportRepo.deleteReport).toHaveBeenCalledWith(999);
    });
  });

  // ===================== getMyReports =====================
  describe('getMyReports', () => {
    it('should return reports for a specific user', async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 1,
          title: 'My Report 1',
          category: OfficeType.WATER_SUPPLY,
          state: ReportState.ASSIGNED,
          author: { id: 1 } as any
        } as any,
        {
          id: 2,
          title: 'My Report 2',
          category: OfficeType.WASTE,
          state: ReportState.IN_PROGRESS,
          author: { id: 1 } as any
        } as any
      ];

      mockReportRepo.getReportsByAuthorId.mockResolvedValue(mockReports);

      const result = await getMyReports(1);

      expect(mockReportRepo.getReportsByAuthorId).toHaveBeenCalledWith(1);
      expect(mapperService.mapReportDAOToDTO).toHaveBeenCalledTimes(2);
      expect(mapperService.mapReportDAOToDTO).toHaveBeenCalledWith(
        mockReports[0],
        { includeFollowerUsers: false }
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no reports', async () => {
      mockReportRepo.getReportsByAuthorId.mockResolvedValue([]);

      const result = await getMyReports(1);

      expect(mockReportRepo.getReportsByAuthorId).toHaveBeenCalledWith(1);
      expect(result).toEqual([]);
    });

    it('should handle different user IDs', async () => {
      const mockReports: ReportDAO[] = [
        {
          id: 5,
          title: 'User 5 Report',
          category: OfficeType.PUBLIC_LIGHTING,
          state: ReportState.SUSPENDED,
          author: { id: 5 } as any
        } as any
      ];

      mockReportRepo.getReportsByAuthorId.mockResolvedValue(mockReports);

      const result = await getMyReports(5);

      expect(mockReportRepo.getReportsByAuthorId).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });
  });
});
