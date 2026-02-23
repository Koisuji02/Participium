import { Repository } from "typeorm";
import { AppDataSource } from "@database";
import { FaqDAO } from "@dao/FaqDAO";

export class FaqRepository {
  private readonly repo: Repository<FaqDAO>;

  constructor() {
    this.repo = AppDataSource.getRepository(FaqDAO);
  }

  async getAllFaqs(): Promise<FaqDAO[]> {
    return this.repo.find();
  }
  async getFaqById(id: number): Promise<FaqDAO | null> {
    return this.repo.findOneBy({ id: id });
  }

  async createFaq(question:string, answer:string) : Promise<FaqDAO>{
    return this.repo.save({
      question,
      answer
    })
  }

  async updateFaq(id: number, question: string, answer: string): Promise<FaqDAO | null> {
    const faq = await this.getFaqById(id);
    if (!faq) {
      return null;
    }
    faq.question = question;
    faq.answer = answer;
    return this.repo.save(faq);
  }

  async deleteFaq(id: number){
    return this.repo.delete({id:id});
  }
}