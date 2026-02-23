import { Repository } from "typeorm";
import { AppDataSource } from "../../../src/database/connection";
import { FaqDAO } from "../../../src/models/dao/FaqDAO";
import { FaqRepository } from "../../../src/repositories/FaqRepository";

jest.mock("../../../src/database/connection", () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

describe("FaqRepository", () => {
  let faqRepository: FaqRepository;
  let mockRepo: jest.Mocked<Repository<FaqDAO>>;

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);
    faqRepository = new FaqRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllFaqs", () => {
    it("should return all FAQs", async () => {
      const mockFaqs: FaqDAO[] = [
        { id: 1, question: "What is Participium?", answer: "A citizen reporting platform" },
        { id: 2, question: "How to submit a report?", answer: "Use the mobile app" }
      ];
      mockRepo.find.mockResolvedValue(mockFaqs);

      const result = await faqRepository.getAllFaqs();

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFaqs);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no FAQs exist", async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await faqRepository.getAllFaqs();

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should throw error when database fails", async () => {
      const dbError = new Error("Database connection error");
      mockRepo.find.mockRejectedValue(dbError);

      await expect(faqRepository.getAllFaqs()).rejects.toThrow("Database connection error");
      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe("getFaqById", () => {
    it("should return FAQ when it exists", async () => {
      const mockFaq: FaqDAO = { 
        id: 1, 
        question: "Test question?", 
        answer: "Test answer" 
      };
      mockRepo.findOneBy.mockResolvedValue(mockFaq);

      const result = await faqRepository.getFaqById(1);

      expect(mockRepo.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockFaq);
    });

    it("should return null when FAQ does not exist", async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      const result = await faqRepository.getFaqById(999);

      expect(mockRepo.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(result).toBeNull();
    });

    it("should handle different FAQ IDs correctly", async () => {
      const mockFaq1: FaqDAO = { id: 5, question: "Q1?", answer: "A1" };
      const mockFaq2: FaqDAO = { id: 10, question: "Q2?", answer: "A2" };

      mockRepo.findOneBy.mockResolvedValueOnce(mockFaq1);
      const result1 = await faqRepository.getFaqById(5);
      
      mockRepo.findOneBy.mockResolvedValueOnce(mockFaq2);
      const result2 = await faqRepository.getFaqById(10);

      expect(result1).toEqual(mockFaq1);
      expect(result2).toEqual(mockFaq2);
      expect(mockRepo.findOneBy).toHaveBeenCalledTimes(2);
    });

    it("should throw error when database fails", async () => {
      const dbError = new Error("Database query error");
      mockRepo.findOneBy.mockRejectedValue(dbError);

      await expect(faqRepository.getFaqById(1)).rejects.toThrow("Database query error");
      expect(mockRepo.findOneBy).toHaveBeenCalledTimes(1);
    });
  });

  describe("createFaq", () => {
    it("should create and return a new FAQ", async () => {
      const question = "New question?";
      const answer = "New answer";
      const mockCreatedFaq: FaqDAO = { id: 1, question, answer };

      mockRepo.save.mockResolvedValue(mockCreatedFaq);

      const result = await faqRepository.createFaq(question, answer);

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledWith({ question, answer });
      expect(result).toEqual(mockCreatedFaq);
    });

    it("should create FAQ with different data", async () => {
      const question = "Another question?";
      const answer = "Another answer";
      const mockCreatedFaq: FaqDAO = { id: 2, question, answer };

      mockRepo.save.mockResolvedValue(mockCreatedFaq);

      const result = await faqRepository.createFaq(question, answer);

      expect(mockRepo.save).toHaveBeenCalledWith({ question, answer });
      expect(result).toEqual(mockCreatedFaq);
    });

    it("should handle long text for question and answer", async () => {
      const question = "This is a very long question? ".repeat(10);
      const answer = "This is a very long answer. ".repeat(10);
      const mockCreatedFaq: FaqDAO = { id: 3, question, answer };

      mockRepo.save.mockResolvedValue(mockCreatedFaq);

      const result = await faqRepository.createFaq(question, answer);

      expect(mockRepo.save).toHaveBeenCalledWith({ question, answer });
      expect(result.question).toEqual(question);
      expect(result.answer).toEqual(answer);
    });

    it("should handle special characters in question and answer", async () => {
      const question = "What about <script>alert('XSS')</script>?";
      const answer = "Special chars: @#$%^&*()";
      const mockCreatedFaq: FaqDAO = { id: 4, question, answer };

      mockRepo.save.mockResolvedValue(mockCreatedFaq);

      const result = await faqRepository.createFaq(question, answer);

      expect(result.question).toEqual(question);
      expect(result.answer).toEqual(answer);
    });

    it("should throw error when save fails", async () => {
      const dbError = new Error("Failed to save FAQ");
      mockRepo.save.mockRejectedValue(dbError);

      await expect(faqRepository.createFaq("Q?", "A")).rejects.toThrow("Failed to save FAQ");
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateFaq", () => {
    it("should update and return FAQ when it exists", async () => {
      const existingFaq: FaqDAO = { 
        id: 1, 
        question: "Old question?", 
        answer: "Old answer" 
      };
      const updatedFaq: FaqDAO = { 
        id: 1, 
        question: "New question?", 
        answer: "New answer" 
      };

      mockRepo.findOneBy.mockResolvedValue(existingFaq);
      mockRepo.save.mockResolvedValue(updatedFaq);

      const result = await faqRepository.updateFaq(1, "New question?", "New answer");

      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepo.save).toHaveBeenCalledWith(updatedFaq);
      expect(result).toEqual(updatedFaq);
    });

    it("should return null when FAQ does not exist", async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      const result = await faqRepository.updateFaq(999, "Question?", "Answer");

      expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should update FAQ with new question only", async () => {
      const existingFaq: FaqDAO = { 
        id: 1, 
        question: "Old question?", 
        answer: "Old answer" 
      };
      const updatedFaq: FaqDAO = { 
        id: 1, 
        question: "New question?", 
        answer: "New answer text" 
      };

      mockRepo.findOneBy.mockResolvedValue(existingFaq);
      mockRepo.save.mockResolvedValue(updatedFaq);

      const result = await faqRepository.updateFaq(1, "New question?", "New answer text");

      expect(result?.question).toEqual("New question?");
    });

    it("should update FAQ with new answer only", async () => {
      const existingFaq: FaqDAO = { 
        id: 1, 
        question: "Same question?", 
        answer: "Old answer" 
      };
      const updatedFaq: FaqDAO = { 
        id: 1, 
        question: "Same question?", 
        answer: "New answer" 
      };

      mockRepo.findOneBy.mockResolvedValue(existingFaq);
      mockRepo.save.mockResolvedValue(updatedFaq);

      const result = await faqRepository.updateFaq(1, "Same question?", "New answer");

      expect(result?.answer).toEqual("New answer");
    });

    it("should handle multiple updates on same FAQ", async () => {
      const faq: FaqDAO = { id: 1, question: "Q?", answer: "A" };
      
      mockRepo.findOneBy.mockResolvedValue(faq);
      mockRepo.save.mockResolvedValue({ ...faq, question: "Q1?", answer: "A1" });
      await faqRepository.updateFaq(1, "Q1?", "A1");

      mockRepo.findOneBy.mockResolvedValue({ ...faq, question: "Q1?", answer: "A1" });
      mockRepo.save.mockResolvedValue({ ...faq, question: "Q2?", answer: "A2" });
      await faqRepository.updateFaq(1, "Q2?", "A2");

      expect(mockRepo.findOneBy).toHaveBeenCalledTimes(2);
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });

    it("should throw error when findOneBy fails", async () => {
      const dbError = new Error("Database query error");
      mockRepo.findOneBy.mockRejectedValue(dbError);

      await expect(faqRepository.updateFaq(1, "Q?", "A")).rejects.toThrow("Database query error");
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it("should throw error when save fails", async () => {
      const existingFaq: FaqDAO = { id: 1, question: "Q?", answer: "A" };
      mockRepo.findOneBy.mockResolvedValue(existingFaq);
      
      const saveError = new Error("Failed to save update");
      mockRepo.save.mockRejectedValue(saveError);

      await expect(faqRepository.updateFaq(1, "New Q?", "New A")).rejects.toThrow("Failed to save update");
    });
  });

  describe("deleteFaq", () => {
    it("should delete FAQ successfully", async () => {
      const deleteResult = { affected: 1, raw: [] };
      mockRepo.delete.mockResolvedValue(deleteResult);

      const result = await faqRepository.deleteFaq(1);

      expect(mockRepo.delete).toHaveBeenCalledTimes(1);
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(deleteResult);
      expect(result.affected).toBe(1);
    });

    it("should return affected 0 when FAQ does not exist", async () => {
      const deleteResult = { affected: 0, raw: [] };
      mockRepo.delete.mockResolvedValue(deleteResult);

      const result = await faqRepository.deleteFaq(999);

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: 999 });
      expect(result.affected).toBe(0);
    });

    it("should delete FAQs with different IDs", async () => {
      const deleteResult1 = { affected: 1, raw: [] };
      const deleteResult2 = { affected: 1, raw: [] };

      mockRepo.delete.mockResolvedValueOnce(deleteResult1);
      await faqRepository.deleteFaq(5);

      mockRepo.delete.mockResolvedValueOnce(deleteResult2);
      await faqRepository.deleteFaq(10);

      expect(mockRepo.delete).toHaveBeenNthCalledWith(1, { id: 5 });
      expect(mockRepo.delete).toHaveBeenNthCalledWith(2, { id: 10 });
      expect(mockRepo.delete).toHaveBeenCalledTimes(2);
    });

    it("should throw error when delete fails", async () => {
      const dbError = new Error("Failed to delete FAQ");
      mockRepo.delete.mockRejectedValue(dbError);

      await expect(faqRepository.deleteFaq(1)).rejects.toThrow("Failed to delete FAQ");
      expect(mockRepo.delete).toHaveBeenCalledTimes(1);
    });

    it("should handle constraint violations", async () => {
      const constraintError = new Error("Foreign key constraint violation");
      mockRepo.delete.mockRejectedValue(constraintError);

      await expect(faqRepository.deleteFaq(1)).rejects.toThrow("Foreign key constraint violation");
    });
  });

  describe("Repository initialization", () => {
    it("should initialize repository correctly", () => {
      expect(AppDataSource.getRepository).toHaveBeenCalledWith(FaqDAO);
    });

    it("should create multiple instances correctly", () => {
      const repo1 = new FaqRepository();
      const repo2 = new FaqRepository();

      expect(AppDataSource.getRepository).toHaveBeenCalledTimes(3); // 1 from beforeEach + 2 new
      expect(repo1).toBeInstanceOf(FaqRepository);
      expect(repo2).toBeInstanceOf(FaqRepository);
    });
  });
});
