import { PublicMessageRepository } from "@repositories/PublicMessageRepository";
import { UserRepository } from "@repositories/UserRepository";
import { OfficerRepository } from "@repositories/OfficerRepository";
import { PublicMessage } from "@models/dto/PublicMessage";
import { getIO } from "@services/ioService";

export async function listConversation(reportId: number): Promise<PublicMessage[]> {
  const repo = new PublicMessageRepository();
  const officerRepo = new OfficerRepository();
  const messages = await repo.listByReport(reportId);
  
  // Map messages and fetch officer names where needed
  const dtos = await Promise.all(messages.map(async (dao) => {
    let senderName = "Unknown";
    
    if (dao.senderType === "citizen" && dao.sender) {
      senderName = `${dao.sender.firstName || ''} ${dao.sender.lastName || ''}`.trim() 
        || dao.sender.username 
        || dao.sender.email 
        || "Unknown";
    } else if (dao.senderType === "officer") {
      try {
        const officer = await officerRepo.getOfficerById(dao.senderId);
        senderName = `${officer.name || ''} ${officer.surname || ''}`.trim() 
          || officer.username 
          || officer.email 
          || "Unknown";
      } catch {
        senderName = "Unknown";
      }
    }
    
    return {
      id: dao.id,
      reportId: dao.reportId,
      message: dao.message,
      senderType: dao.senderType,
      senderId: dao.senderId,
      senderName,
      createdAt: dao.createdAt,
      read: dao.read
    };
  }));
  
  return dtos;
}

export async function sendPublicMessage(
  reportId: number,
  senderType: 'citizen' | 'officer',
  senderId: number,
  message: string
): Promise<PublicMessage> {
  const repo = new PublicMessageRepository();
  const officerRepo = new OfficerRepository();
  
  // Load sender for citizens to set the relation
  let sender = undefined;
  if (senderType === 'citizen') {
    const userRepo = new UserRepository();
    sender = await userRepo.getUserById(senderId);
  }
  
  const saved = await repo.save({
    reportId,
    message,
    senderType,
    senderId,
    sender,
    read: false
  });

  // Fetch the saved message with relations
  const messages = await repo.listByReport(reportId);
  const fullMessage = messages.find(m => m.id === saved.id);
  
  if (!fullMessage) {
    throw new Error("Failed to retrieve saved message");
  }

  // Build senderName based on senderType
  let senderName = "Unknown";
  if (fullMessage.senderType === "citizen" && fullMessage.sender) {
    senderName = `${fullMessage.sender.firstName || ''} ${fullMessage.sender.lastName || ''}`.trim() 
      || fullMessage.sender.username 
      || fullMessage.sender.email 
      || "Unknown";
  } else if (fullMessage.senderType === "officer") {
    try {
      const officer = await officerRepo.getOfficerById(fullMessage.senderId);
      senderName = `${officer.name || ''} ${officer.surname || ''}`.trim() 
        || officer.username 
        || officer.email 
        || "Unknown";
    } catch {
      senderName = "Unknown";
    }
  }

  const dto: PublicMessage = {
    id: fullMessage.id,
    reportId: fullMessage.reportId,
    message: fullMessage.message,
    senderType: fullMessage.senderType,
    senderId: fullMessage.senderId,
    senderName,
    createdAt: fullMessage.createdAt,
    read: fullMessage.read
  };

  // Emit socket event
  const io = getIO();
  if (io) {
    console.log(`Emitting public-message:new to report:${reportId}`, dto);
    io.to(`report:${reportId}`).emit("public-message:new", {
      id: dto.id,
      reportId: dto.reportId,
      message: dto.message,
      senderType: dto.senderType,
      senderId: dto.senderId,
      senderName: dto.senderName,
      createdAt: dto.createdAt
    });
  } else {
    console.error("Socket.io instance not available");
  }

  return dto;
}
