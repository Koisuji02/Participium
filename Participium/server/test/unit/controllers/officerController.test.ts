import "reflect-metadata";
import {
  createOfficer,
  getOfficer,
  getAllOfficers,
  getAllOfficersByOfficeType,
  updateOfficer,
  addRoleToOfficer,
  removeRoleFromOfficer,
  assignReportToOfficer,
  retrieveDocs,
  getAssignedReports,
  reviewDoc,
  deleteOfficer
} from "../../../src/controllers/officerController";
import { OfficerRepository } from "../../../src/repositories/OfficerRepository";
import { ReportRepository } from "../../../src/repositories/ReportRepository";
import { NotificationRepository } from "../../../src/repositories/NotificationRepository";
import { mapOfficerDAOToDTO, mapReportDAOToDTO } from "../../../src/services/mapperService";
import { ReportState } from "../../../src/models/enums/ReportState";
import { OfficeType } from "../../../src/models/enums/OfficeType";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

jest.mock("../../../src/repositories/OfficerRepository");
jest.mock("../../../src/repositories/ReportRepository");
jest.mock("../../../src/repositories/NotificationRepository");
jest.mock("../../../src/services/mapperService");

describe("OfficerController Unit Tests", () => {
  let mockOfficerRepo: jest.Mocked<OfficerRepository>;
  let mockReportRepo: jest.Mocked<ReportRepository>;
  let mockNotificationRepo: jest.Mocked<NotificationRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOfficerRepo = new OfficerRepository() as jest.Mocked<OfficerRepository>;
    mockReportRepo = new ReportRepository() as jest.Mocked<ReportRepository>;
    mockNotificationRepo = new NotificationRepository() as jest.Mocked<NotificationRepository>;
    (OfficerRepository as jest.MockedClass<typeof OfficerRepository>).mockImplementation(() => mockOfficerRepo);
    (ReportRepository as jest.MockedClass<typeof ReportRepository>).mockImplementation(() => mockReportRepo);
    (NotificationRepository as jest.MockedClass<typeof NotificationRepository>).mockImplementation(() => mockNotificationRepo);
  });

  describe("createOfficer", () => {
    it("dovrebbe creare un nuovo officer con un singolo ruolo", async () => {
      const officerDto = {
        username: "officer1",
        name: "Luigi",
        surname: "Bianchi",
        email: "luigi@office.com",
        password: "password123",
        roles: [
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };

      const mockCreatedOfficer = { id: 1, username: "officer1", email: "luigi@office.com" };
      const mockFinalOfficer = { ...mockCreatedOfficer, roles: officerDto.roles };
      
      mockOfficerRepo.createOfficer = jest.fn().mockResolvedValue(mockCreatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockFinalOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockFinalOfficer);

      const result = await createOfficer(officerDto as any);

      expect(mockOfficerRepo.createOfficer).toHaveBeenCalledWith(
        "officer1",
        "Luigi",
        "Bianchi",
        "luigi@office.com",
        "password123"
      );
      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalled();
      expect(result).toEqual(mockFinalOfficer);
    });

    it("dovrebbe creare un officer con multipli ruoli", async () => {
      const officerDto = {
        username: "officer2",
        name: "Mario",
        surname: "Rossi",
        email: "mario@office.com",
        password: "password456",
        roles: [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null },
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS }
        ]
      };

      const mockCreatedOfficer = { id: 2, username: "officer2", email: "mario@office.com" };
      const mockFinalOfficer = { ...mockCreatedOfficer, roles: officerDto.roles };
      
      mockOfficerRepo.createOfficer = jest.fn().mockResolvedValue(mockCreatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockFinalOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockFinalOfficer);

      const result = await createOfficer(officerDto as any);

      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockFinalOfficer);
    });

    it("dovrebbe lanciare errore se nessun ruolo è fornito", async () => {
      const officerDto = {
        username: "officer3",
        name: "Test",
        surname: "User",
        email: "test@office.com",
        password: "password",
        roles: []
      };

      await expect(createOfficer(officerDto as any))
        .rejects
        .toThrow("At least one role is required to create an officer");
    });

    it("dovrebbe gestire ruoli senza office (null)", async () => {
      const officerDto = {
        username: "officer4",
        name: "Admin",
        surname: "User",
        email: "admin@office.com",
        password: "adminpass",
        roles: [
          { role: OfficerRole.MUNICIPAL_ADMINISTRATOR, office: null }
        ]
      };

      const mockCreatedOfficer = { id: 4, username: "officer4" };
      const mockFinalOfficer = { ...mockCreatedOfficer, roles: officerDto.roles };
      
      mockOfficerRepo.createOfficer = jest.fn().mockResolvedValue(mockCreatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockFinalOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockFinalOfficer);

      const result = await createOfficer(officerDto as any);

      expect(result).toEqual(mockFinalOfficer);
    });
  });

  describe("getAllOfficers", () => {
    it("dovrebbe recuperare tutti gli officers", async () => {
      const mockOfficers = [
        { id: 1, username: "officer1", email: "officer1@office.com" },
        { id: 2, username: "officer2", email: "officer2@office.com" }
      ];

      mockOfficerRepo.getAllOfficers = jest.fn().mockResolvedValue(mockOfficers);
      (mapOfficerDAOToDTO as jest.Mock).mockImplementation((officer) => officer);

      const result = await getAllOfficers();

      expect(mockOfficerRepo.getAllOfficers).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("dovrebbe restituire array vuoto se non ci sono officers", async () => {
      mockOfficerRepo.getAllOfficers = jest.fn().mockResolvedValue([]);
      (mapOfficerDAOToDTO as jest.Mock).mockImplementation((officer) => officer);

      const result = await getAllOfficers();

      expect(result).toHaveLength(0);
    });
  });

  describe("getAllOfficersByOfficeType", () => {
    it("dovrebbe restituire officers filtrati per officeType", async () => {
      const mockOfficers = [
        { id: 1, office: OfficeType.ARCHITECTURAL_BARRIERS },
        { id: 2, office: OfficeType.ARCHITECTURAL_BARRIERS }
      ];
      mockOfficerRepo.getOfficersByOffice = jest.fn().mockResolvedValue(mockOfficers);
      (mapOfficerDAOToDTO as jest.Mock).mockImplementation((officer) => officer);

      const result = await getAllOfficersByOfficeType("INFRASTRUCTURE");
      
      expect(mockOfficerRepo.getOfficersByOffice).toHaveBeenCalledWith("INFRASTRUCTURE");
      expect(result).toHaveLength(2);
    });

    it("dovrebbe gestire diverse categorie di officeType", async () => {
      const categories = [OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS, OfficeType.ROADS_AND_URBAN_FURNISHINGS, OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS];
      
      for (const category of categories) {
        const mockOfficers = [{ id: 1, office: category }];
        mockOfficerRepo.getOfficersByOffice = jest.fn().mockResolvedValue(mockOfficers);
        (mapOfficerDAOToDTO as jest.Mock).mockImplementation((officer) => officer);

        const result = await getAllOfficersByOfficeType(category);
        
        expect(mockOfficerRepo.getOfficersByOffice).toHaveBeenCalledWith(category);
      }
    });
  });

  describe("getOfficer", () => {
    it("dovrebbe restituire officer per email", async () => {
      const mockOfficer = { id: 1, email: "officer@office.com" };
      mockOfficerRepo.getOfficerByEmail = jest.fn().mockResolvedValue(mockOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockOfficer);

      const result = await getOfficer("officer@office.com");
      
      expect(mockOfficerRepo.getOfficerByEmail).toHaveBeenCalledWith("officer@office.com");
      expect(result).toEqual(mockOfficer);
    });
  });

  describe("updateOfficer", () => {
    it("dovrebbe aggiornare officer con ruoli", async () => {
      const officerDto = {
        id: 1,
        username: "officer1",
        name: "Luigi",
        surname: "Bianchi",
        email: "luigi@office.com",
        roles: [
          { role: OfficerRole.TECHNICAL_OFFICE_STAFF, office: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };
      
      const mockUpdatedOfficer = { ...officerDto };
      mockOfficerRepo.updateOfficer = jest.fn().mockResolvedValue(mockUpdatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockUpdatedOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedOfficer);

      const result = await updateOfficer(officerDto as any);
      
      expect(mockOfficerRepo.updateOfficer).toHaveBeenCalled();
      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedOfficer);
    });

    it("dovrebbe usare default role se nessun ruolo fornito", async () => {
      const officerDto = {
        id: 1,
        username: "officer1",
        name: "Luigi",
        surname: "Bianchi",
        email: "luigi@office.com",
        roles: []
      };
      
      const mockUpdatedOfficer = { ...officerDto };
      mockOfficerRepo.updateOfficer = jest.fn().mockResolvedValue(mockUpdatedOfficer);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockUpdatedOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedOfficer);

      const result = await updateOfficer(officerDto as any);
      
      expect(mockOfficerRepo.updateOfficer).toHaveBeenCalledWith(
        1,
        "officer1",
        "Luigi",
        "Bianchi",
        "luigi@office.com",
        OfficerRole.TECHNICAL_OFFICE_STAFF,
        null
      );
    });
  });

  describe("addRoleToOfficer", () => {
    it("dovrebbe aggiungere un nuovo ruolo all'officer", async () => {
      const mockCurrentOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };
      const mockUpdatedOfficer = {
        ...mockCurrentOfficer,
        roles: [
          ...mockCurrentOfficer.roles,
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null }
        ]
      };

      mockOfficerRepo.getOfficerById = jest.fn()
        .mockResolvedValueOnce(mockCurrentOfficer)
        .mockResolvedValueOnce(mockUpdatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedOfficer);

      const result = await addRoleToOfficer(1, OfficerRole.MUNICIPAL_ADMINISTRATOR);

      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedOfficer);
    });

    it("non dovrebbe aggiungere un ruolo duplicato", async () => {
      const mockCurrentOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };

      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockCurrentOfficer);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockCurrentOfficer);

      const result = await addRoleToOfficer(1, OfficerRole.TECHNICAL_OFFICE_STAFF, OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockOfficerRepo.updateOfficerRoles).not.toHaveBeenCalled();
      expect(result).toEqual(mockCurrentOfficer);
    });

    it("dovrebbe gestire ruoli senza office", async () => {
      const mockCurrentOfficer = {
        id: 1,
        roles: []
      };
      const mockUpdatedOfficer = {
        ...mockCurrentOfficer,
        roles: [{ officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, officeType: null }]
      };

      mockOfficerRepo.getOfficerById = jest.fn()
        .mockResolvedValueOnce(mockCurrentOfficer)
        .mockResolvedValueOnce(mockUpdatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedOfficer);

      const result = await addRoleToOfficer(1, OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER);

      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalled();
    });
  });

  describe("removeRoleFromOfficer", () => {
    it("dovrebbe rimuovere un ruolo dall'officer", async () => {
      const mockCurrentOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.ARCHITECTURAL_BARRIERS },
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null }
        ]
      };
      const mockUpdatedOfficer = {
        ...mockCurrentOfficer,
        roles: [{ officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null }]
      };

      mockOfficerRepo.getOfficerById = jest.fn()
        .mockResolvedValueOnce(mockCurrentOfficer)
        .mockResolvedValueOnce(mockUpdatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      mockReportRepo.resetPartialReportsAssignmentByOfficer = jest.fn().mockResolvedValue(undefined);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedOfficer);

      const result = await removeRoleFromOfficer(1, OfficerRole.TECHNICAL_OFFICE_STAFF, OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockReportRepo.resetPartialReportsAssignmentByOfficer).toHaveBeenCalledWith(1, OfficeType.ARCHITECTURAL_BARRIERS);
      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedOfficer);
    });

    it("non dovrebbe resettare report se il ruolo non è TECHNICAL_OFFICE_STAFF", async () => {
      const mockCurrentOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null },
          { officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, officeType: null }
        ]
      };
      const mockUpdatedOfficer = {
        ...mockCurrentOfficer,
        roles: [{ officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER, officeType: null }]
      };

      mockOfficerRepo.getOfficerById = jest.fn()
        .mockResolvedValueOnce(mockCurrentOfficer)
        .mockResolvedValueOnce(mockUpdatedOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedOfficer);

      const result = await removeRoleFromOfficer(1, OfficerRole.MUNICIPAL_ADMINISTRATOR, OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockReportRepo.resetPartialReportsAssignmentByOfficer).not.toHaveBeenCalled();
      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalled();
    });

    it("dovrebbe gestire officer con ruoli null", async () => {
      const mockCurrentOfficer = {
        id: 1,
        roles: null
      };

      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockCurrentOfficer);
      mockOfficerRepo.updateOfficerRoles = jest.fn().mockResolvedValue(undefined);
      (mapOfficerDAOToDTO as jest.Mock).mockReturnValue(mockCurrentOfficer);

      await removeRoleFromOfficer(1, OfficerRole.TECHNICAL_OFFICE_STAFF, OfficeType.ARCHITECTURAL_BARRIERS);

      expect(mockOfficerRepo.updateOfficerRoles).toHaveBeenCalledWith(1, []);
    });
  });

  describe("assignReportToOfficer", () => {
    it("dovrebbe assegnare un report PENDING a un officer", async () => {
      const mockReport = {
        id: 1,
        state: ReportState.PENDING,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };
      const mockOfficer = {
        id: 1,
        email: "officer@office.com"
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockOfficer);
      mockReportRepo.assignReportToOfficer = jest.fn().mockResolvedValue(undefined);

      await assignReportToOfficer(1, 1);

      expect(mockReportRepo.getReportById).toHaveBeenCalledWith(1);
      expect(mockOfficerRepo.getOfficerById).toHaveBeenCalledWith(1);
      expect(mockReportRepo.assignReportToOfficer).toHaveBeenCalledWith(1, 1);
    });

    it("dovrebbe lanciare errore se il report non è PENDING", async () => {
      const mockReport = {
        id: 1,
        state: ReportState.IN_PROGRESS
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);

      await expect(assignReportToOfficer(1, 1))
        .rejects
        .toThrow("Only PENDING reports can be assigned");
    });

    it("dovrebbe lanciare errore se l'officer non esiste", async () => {
      const mockReport = {
        id: 1,
        state: ReportState.PENDING
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(null);

      await expect(assignReportToOfficer(1, 1))
        .rejects
        .toThrow("Officer not found");
    });
  });

  describe("retrieveDocs", () => {
    it("dovrebbe restituire solo report PENDING non assegnati o assegnati all'officer", async () => {
      const mockPendingReports = [
        { id: 1, assignedOfficerId: null, state: ReportState.PENDING },
        { id: 2, assignedOfficerId: 1, state: ReportState.PENDING },
        { id: 3, assignedOfficerId: 2, state: ReportState.PENDING }
      ];
      (mapReportDAOToDTO as jest.Mock).mockImplementation((report) => report);
      mockReportRepo.getReportsByState = jest.fn().mockResolvedValue(mockPendingReports);

      const result = await retrieveDocs(1);
      
      expect(mockReportRepo.getReportsByState).toHaveBeenCalledWith(ReportState.PENDING);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 1, assignedOfficerId: null, state: ReportState.PENDING },
        { id: 2, assignedOfficerId: 1, state: ReportState.PENDING }
      ]);
    });

    it("dovrebbe restituire array vuoto se non ci sono report pending", async () => {
      mockReportRepo.getReportsByState = jest.fn().mockResolvedValue([]);
      (mapReportDAOToDTO as jest.Mock).mockImplementation((report) => report);

      const result = await retrieveDocs(1);

      expect(result).toHaveLength(0);
    });
  });

  describe("getAssignedReports", () => {
    it("dovrebbe restituire i report assegnati all'officer", async () => {
      const mockReports = [
        { id: 1, assignedOfficerId: 1 },
        { id: 2, assignedOfficerId: 1 }
      ];
      mockReportRepo.getReportsByAssignedOfficer = jest.fn().mockResolvedValue(mockReports);
      (mapReportDAOToDTO as jest.Mock).mockImplementation((report) => report);

      const result = await getAssignedReports(1);
      
      expect(mockReportRepo.getReportsByAssignedOfficer).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });
  });

  describe("reviewDoc", () => {
    it("dovrebbe approvare un report e assegnarlo a un officer", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        state: ReportState.PENDING,
        category: OfficeType.ARCHITECTURAL_BARRIERS
      };
      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.ASSIGNED
      };
      const mockOfficers = [
        { id: 2, roles: [{ officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF }] },
        { id: 3, roles: [{ officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER }] }
      ];

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockOfficerRepo.getOfficersByOffice = jest.fn().mockResolvedValue(mockOfficers);
      mockReportRepo.assignReportToOfficer = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockNotificationRepo.createStatusChangeNotification = jest.fn().mockResolvedValue(undefined);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(1, 1, ReportState.ASSIGNED);

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(1, ReportState.ASSIGNED, undefined);
      expect(mockOfficerRepo.getOfficersByOffice).toHaveBeenCalledWith(OfficeType.ARCHITECTURAL_BARRIERS);
      expect(mockReportRepo.assignReportToOfficer).toHaveBeenCalledWith(1, 2);
      expect(mockNotificationRepo.createStatusChangeNotification).toHaveBeenCalled();
    });

    it("dovrebbe assegnare al primo officer se nessuno ha ruolo TECHNICAL_OFFICE_STAFF", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: null,
        state: ReportState.PENDING,
        category: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS
      };
      const mockUpdatedReport = { ...mockReport, state: ReportState.ASSIGNED };
      const mockOfficers = [
        { id: 3, roles: [{ officerRole: OfficerRole.MUNICIPAL_PUBLIC_RELATIONS_OFFICER }] }
      ];

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockOfficerRepo.getOfficersByOffice = jest.fn().mockResolvedValue(mockOfficers);
      mockReportRepo.assignReportToOfficer = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockNotificationRepo.createStatusChangeNotification = jest.fn().mockResolvedValue(undefined);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      await reviewDoc(1, 1, ReportState.ASSIGNED);

      expect(mockReportRepo.assignReportToOfficer).toHaveBeenCalledWith(1, 3);
    });

    it("non dovrebbe assegnare se non ci sono officers disponibili", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: null,
        state: ReportState.PENDING,
        category: OfficeType.ROADS_AND_URBAN_FURNISHINGS
      };
      const mockUpdatedReport = { ...mockReport, state: ReportState.ASSIGNED };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockOfficerRepo.getOfficersByOffice = jest.fn().mockResolvedValue([]);
      mockNotificationRepo.createStatusChangeNotification = jest.fn().mockResolvedValue(undefined);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      await reviewDoc(1, 1, ReportState.ASSIGNED);

      expect(mockReportRepo.assignReportToOfficer).not.toHaveBeenCalled();
    });

    it("dovrebbe rifiutare un report con motivazione", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        state: ReportState.PENDING
      };
      const mockUpdatedReport = {
        ...mockReport,
        state: ReportState.DECLINED,
        reason: "Motivo del rifiuto"
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockNotificationRepo.createStatusChangeNotification = jest.fn().mockResolvedValue(undefined);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(1, 1, ReportState.DECLINED, "Motivo del rifiuto");

      expect(mockReportRepo.updateReportState).toHaveBeenCalledWith(
        1, 
        ReportState.DECLINED, 
        "Motivo del rifiuto"
      );
      expect(mockNotificationRepo.createStatusChangeNotification).toHaveBeenCalled();
    });

    it("dovrebbe lanciare errore se il report è assegnato a un altro officer", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 2
      };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);

      await expect(reviewDoc(1, 1, ReportState.ASSIGNED))
        .rejects
        .toThrow("You can only review reports assigned to you");
    });

    it("dovrebbe lanciare errore se il report è già risolto", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        state: ReportState.RESOLVED
      };
      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);

      await expect(reviewDoc(1, 1, ReportState.ASSIGNED))
        .rejects
        .toThrow(/already in state 'RESOLVED'/);
    });

    it("dovrebbe lanciare errore se il report è già declined", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: 1,
        state: ReportState.DECLINED
      };
      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);

      await expect(reviewDoc(1, 1, ReportState.ASSIGNED))
        .rejects
        .toThrow(/already in state 'DECLINED'/);
    });

    it("dovrebbe permettere review di report non assegnati", async () => {
      const mockReport = {
        id: 1,
        assignedOfficerId: null,
        state: ReportState.PENDING
      };
      const mockUpdatedReport = { ...mockReport, state: ReportState.DECLINED };

      mockReportRepo.getReportById = jest.fn().mockResolvedValue(mockReport);
      mockReportRepo.updateReportState = jest.fn().mockResolvedValue(mockUpdatedReport);
      mockNotificationRepo.createStatusChangeNotification = jest.fn().mockResolvedValue(undefined);
      (mapReportDAOToDTO as jest.Mock).mockReturnValue(mockUpdatedReport);

      const result = await reviewDoc(1, 1, ReportState.DECLINED, "Reason");

      expect(result).toEqual(mockUpdatedReport);
    });
  });

  describe("deleteOfficer", () => {
    it("dovrebbe eliminare un officer e resettare i suoi report assegnati", async () => {
      const mockOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.ARCHITECTURAL_BARRIERS }
        ]
      };

      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockOfficer);
      mockReportRepo.resetReportsAssignmentByOfficer = jest.fn().mockResolvedValue(undefined);
      mockOfficerRepo.deleteOfficer = jest.fn().mockResolvedValue(undefined);

      await deleteOfficer(1);

      expect(mockOfficerRepo.getOfficerById).toHaveBeenCalledWith(1);
      expect(mockReportRepo.resetReportsAssignmentByOfficer).toHaveBeenCalledWith(1);
      expect(mockOfficerRepo.deleteOfficer).toHaveBeenCalledWith(1);
    });

    it("non dovrebbe resettare report se l'officer non ha ruolo TECHNICAL_OFFICE_STAFF", async () => {
      const mockOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null }
        ]
      };

      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockOfficer);
      mockOfficerRepo.deleteOfficer = jest.fn().mockResolvedValue(undefined);

      await deleteOfficer(1);

      expect(mockReportRepo.resetReportsAssignmentByOfficer).not.toHaveBeenCalled();
      expect(mockOfficerRepo.deleteOfficer).toHaveBeenCalledWith(1);
    });

    it("dovrebbe lanciare errore se l'officer non esiste", async () => {
      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(null);

      await expect(deleteOfficer(1))
        .rejects
        .toThrow("Officer with id '1' does not exist.");
    });

    it("dovrebbe gestire officer con multipli ruoli TECHNICAL_OFFICE_STAFF", async () => {
      const mockOfficer = {
        id: 1,
        roles: [
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.ARCHITECTURAL_BARRIERS },
          { officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF, officeType: OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS },
          { officerRole: OfficerRole.MUNICIPAL_ADMINISTRATOR, officeType: null }
        ]
      };

      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockOfficer);
      mockReportRepo.resetReportsAssignmentByOfficer = jest.fn().mockResolvedValue(undefined);
      mockOfficerRepo.deleteOfficer = jest.fn().mockResolvedValue(undefined);

      await deleteOfficer(1);

      expect(mockReportRepo.resetReportsAssignmentByOfficer).toHaveBeenCalledTimes(2);
    });

    it("dovrebbe gestire officer senza ruoli", async () => {
      const mockOfficer = {
        id: 1,
        roles: null
      };

      mockOfficerRepo.getOfficerById = jest.fn().mockResolvedValue(mockOfficer);
      mockOfficerRepo.deleteOfficer = jest.fn().mockResolvedValue(undefined);

      await deleteOfficer(1);

      expect(mockReportRepo.resetReportsAssignmentByOfficer).not.toHaveBeenCalled();
      expect(mockOfficerRepo.deleteOfficer).toHaveBeenCalledWith(1);
    });
  });
});
