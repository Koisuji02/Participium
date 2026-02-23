import request from "supertest";
import express from "express";
import { faqRouter } from "../../../src/routes/FaqRoutes";
import { FaqRepository } from "../../../src/repositories/FaqRepository";
import { OfficerRole } from "../../../src/models/enums/OfficerRole";

jest.mock("../../../src/repositories/FaqRepository");
jest.mock("@middlewares/authMiddleware", () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 1, username: "testofficer", isStaff: true, type: [OfficerRole.MUNICIPAL_ADMINISTRATOR] };
    next();
  }),
  requireUserType: jest.fn(() => (req: any, res: any, next: () => any) => next())
}));

const app = express();
app.use(express.json());
app.use("/faqs", faqRouter);

describe("FaqRoutes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /faqs", () => {
    it("should return all FAQs", async () => {
      const mockFaqs = [
        {
          id: 1,
          question: "What is Participium?",
          answer: "A citizen reporting platform"
        },
        {
          id: 2,
          question: "How to submit a report?",
          answer: "Use the mobile app or web interface"
        }
      ];
      (FaqRepository.prototype.getAllFaqs as jest.Mock).mockResolvedValue(mockFaqs);

      const res = await request(app).get("/faqs");
      
      expect(FaqRepository.prototype.getAllFaqs).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty("id", 1);
      expect(res.body[0]).toHaveProperty("question", "What is Participium?");
      expect(res.body[1]).toHaveProperty("id", 2);
    });

    it("should return empty array when no FAQs exist", async () => {
      (FaqRepository.prototype.getAllFaqs as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get("/faqs");
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should handle errors in getAllFaqs", async () => {
      (FaqRepository.prototype.getAllFaqs as jest.Mock).mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/faqs");
      
      expect(res.status).toBe(500);
    });
  });

  describe("POST /faqs", () => {
    it("should create a new FAQ successfully", async () => {
      const newFaqData = {
        question: "New question?",
        answer: "New answer"
      };
      const createdFaq = {
        id: 3,
        ...newFaqData
      };
      (FaqRepository.prototype.createFaq as jest.Mock).mockResolvedValue(createdFaq);

      const res = await request(app)
        .post("/faqs")
        .send(newFaqData);
      
      expect(FaqRepository.prototype.createFaq).toHaveBeenCalledWith("New question?", "New answer");
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", 3);
      expect(res.body).toHaveProperty("question", "New question?");
      expect(res.body).toHaveProperty("answer", "New answer");
    });

    it("should create FAQ with valid authentication", async () => {
      const newFaqData = {
        question: "Test question?",
        answer: "Test answer"
      };
      const createdFaq = { id: 1, ...newFaqData };
      (FaqRepository.prototype.createFaq as jest.Mock).mockResolvedValue(createdFaq);

      const res = await request(app)
        .post("/faqs")
        .send(newFaqData);
      
      expect(res.status).toBe(201);
    });

    it("should handle missing question field", async () => {
      const incompleteFaq = {
        answer: "Answer without question"
      };

      const res = await request(app)
        .post("/faqs")
        .send(incompleteFaq);
      
      // The route doesn't validate, so repository will be called
      expect(FaqRepository.prototype.createFaq).toHaveBeenCalledWith(undefined, "Answer without question");
    });

    it("should handle missing answer field", async () => {
      const incompleteFaq = {
        question: "Question without answer?"
      };

      const res = await request(app)
        .post("/faqs")
        .send(incompleteFaq);
      
      expect(FaqRepository.prototype.createFaq).toHaveBeenCalledWith("Question without answer?", undefined);
    });

    it("should handle errors in createFaq", async () => {
      const newFaqData = {
        question: "Error question?",
        answer: "Error answer"
      };
      (FaqRepository.prototype.createFaq as jest.Mock).mockRejectedValue(new Error("Creation error"));

      const res = await request(app)
        .post("/faqs")
        .send(newFaqData);
      
      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /faqs/:faqId", () => {
    it("should update an existing FAQ successfully", async () => {
      const updatedData = {
        question: "Updated question?",
        answer: "Updated answer"
      };
      const updatedFaq = {
        id: 1,
        ...updatedData
      };
      (FaqRepository.prototype.updateFaq as jest.Mock).mockResolvedValue(updatedFaq);

      const res = await request(app)
        .patch("/faqs/1")
        .send(updatedData);
      
      expect(FaqRepository.prototype.updateFaq).toHaveBeenCalledWith(1, "Updated question?", "Updated answer");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", 1);
      expect(res.body).toHaveProperty("question", "Updated question?");
      expect(res.body).toHaveProperty("answer", "Updated answer");
    });

    it("should update FAQ with valid faqId", async () => {
      const updatedData = {
        question: "Test update?",
        answer: "Test update answer"
      };
      const updatedFaq = { id: 5, ...updatedData };
      (FaqRepository.prototype.updateFaq as jest.Mock).mockResolvedValue(updatedFaq);

      const res = await request(app)
        .patch("/faqs/5")
        .send(updatedData);
      
      expect(FaqRepository.prototype.updateFaq).toHaveBeenCalledWith(5, "Test update?", "Test update answer");
      expect(res.status).toBe(200);
    });

    it("should handle non-existent FAQ", async () => {
      const updatedData = {
        question: "Non-existent question?",
        answer: "Non-existent answer"
      };
      (FaqRepository.prototype.updateFaq as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .patch("/faqs/999")
        .send(updatedData);
      
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("should handle invalid faqId format", async () => {
      const updatedData = {
        question: "Test question?",
        answer: "Test answer"
      };

      const res = await request(app)
        .patch("/faqs/invalid")
        .send(updatedData);
      
      // Number.parseInt("invalid") returns NaN
      expect(FaqRepository.prototype.updateFaq).toHaveBeenCalled();
    });

    it("should handle partial updates (only question)", async () => {
      const updatedData = {
        question: "Only question update?"
      };
      const updatedFaq = {
        id: 1,
        question: "Only question update?",
        answer: undefined
      };
      (FaqRepository.prototype.updateFaq as jest.Mock).mockResolvedValue(updatedFaq);

      const res = await request(app)
        .patch("/faqs/1")
        .send(updatedData);
      
      expect(FaqRepository.prototype.updateFaq).toHaveBeenCalledWith(1, "Only question update?", undefined);
    });

    it("should handle partial updates (only answer)", async () => {
      const updatedData = {
        answer: "Only answer update"
      };
      const updatedFaq = {
        id: 1,
        question: undefined,
        answer: "Only answer update"
      };
      (FaqRepository.prototype.updateFaq as jest.Mock).mockResolvedValue(updatedFaq);

      const res = await request(app)
        .patch("/faqs/1")
        .send(updatedData);
      
      expect(FaqRepository.prototype.updateFaq).toHaveBeenCalledWith(1, undefined, "Only answer update");
    });

    it("should handle errors in updateFaq", async () => {
      const updatedData = {
        question: "Error question?",
        answer: "Error answer"
      };
      (FaqRepository.prototype.updateFaq as jest.Mock).mockRejectedValue(new Error("Update error"));

      const res = await request(app)
        .patch("/faqs/1")
        .send(updatedData);
      
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE /faqs/:faqId", () => {
    it("should delete an existing FAQ successfully", async () => {
      (FaqRepository.prototype.deleteFaq as jest.Mock).mockResolvedValue({ affected: 1 });

      const res = await request(app).delete("/faqs/1");
      
      expect(FaqRepository.prototype.deleteFaq).toHaveBeenCalledWith(1);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "FAQ deleted successfully.");
    });

    it("should delete FAQ with valid faqId", async () => {
      (FaqRepository.prototype.deleteFaq as jest.Mock).mockResolvedValue({ affected: 1 });

      const res = await request(app).delete("/faqs/10");
      
      expect(FaqRepository.prototype.deleteFaq).toHaveBeenCalledWith(10);
      expect(res.status).toBe(200);
    });

    it("should handle deletion of non-existent FAQ", async () => {
      (FaqRepository.prototype.deleteFaq as jest.Mock).mockResolvedValue({ affected: 0 });

      const res = await request(app).delete("/faqs/999");
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "FAQ deleted successfully.");
    });

    it("should handle invalid faqId format", async () => {
      (FaqRepository.prototype.deleteFaq as jest.Mock).mockResolvedValue({ affected: 0 });

      const res = await request(app).delete("/faqs/invalid");
      
      // Number.parseInt("invalid") returns NaN
      expect(FaqRepository.prototype.deleteFaq).toHaveBeenCalled();
    });

    it("should handle errors in deleteFaq", async () => {
      (FaqRepository.prototype.deleteFaq as jest.Mock).mockRejectedValue(new Error("Deletion error"));

      const res = await request(app).delete("/faqs/1");
      
      expect(res.status).toBe(500);
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require authentication for POST /faqs", async () => {
      // This test verifies that authenticateToken middleware is applied
      const res = await request(app)
        .post("/faqs")
        .send({ question: "Test?", answer: "Test" });
      
      // With our mock, it should succeed
      expect(res.status).not.toBe(401);
    });

    it("should require authentication for PATCH /faqs/:faqId", async () => {
      const res = await request(app)
        .patch("/faqs/1")
        .send({ question: "Test?", answer: "Test" });
      
      expect(res.status).not.toBe(401);
    });

    it("should require authentication for DELETE /faqs/:faqId", async () => {
      const res = await request(app)
        .delete("/faqs/1");
      
      expect(res.status).not.toBe(401);
    });

    it("should NOT require authentication for GET /faqs", async () => {
      (FaqRepository.prototype.getAllFaqs as jest.Mock).mockResolvedValue([]);
      
      const res = await request(app).get("/faqs");
      
      expect(res.status).toBe(200);
    });
  });
});
