//! INTERNAL MESSAGE CONTROLLER

import { InternalMessageRepository } from "@repositories/InternalMessageRepository";
import { ReportRepository } from "@repositories/ReportRepository";
import { BadRequestError, ForbiddenError } from "@utils/utils";
import { OfficerRole } from "@models/enums/OfficerRole";
import { getIO } from "@services/ioService";
import { OfficerRepository } from "@repositories/OfficerRepository";
import { MaintainerRepository } from "@repositories/MaintainerRepository";

export type Participant = {
    type: OfficerRole.TECHNICAL_OFFICE_STAFF | OfficerRole.MAINTAINER;
    id: number
};

export async function listConversation(reportId: number) {
  const repo = new InternalMessageRepository();
  const list = await repo.listByReport(reportId);
  
  // Get report to retrieve officer and maintainer info
  const reportRepo = new ReportRepository();
  const report = await reportRepo.getReportById(reportId);
  
  const officerRepo = new OfficerRepository();
  const maintainerRepo = new MaintainerRepository();
  
  let officerName = 'Technical Officer';
  let maintainerName = 'Maintainer';
  
  if (report?.assignedOfficerId) {
    const officer = await officerRepo.getOfficerById(report.assignedOfficerId);
    if (officer) officerName = officer.name;
  }
  
  if (report?.assignedMaintainerId) {
    const maintainer = await maintainerRepo.getMaintainerById(report.assignedMaintainerId);
    if (maintainer) maintainerName = maintainer.name;
  }
  
  return list.map(m => ({
    id: m.id,
    reportId: m.reportId,
    senderType: m.senderType,
    senderId: m.senderId,
    senderName: m.senderType === OfficerRole.TECHNICAL_OFFICE_STAFF ? officerName : maintainerName,
    receiverType: m.receiverType,
    receiverId: m.receiverId,
    receiverName: m.receiverType === OfficerRole.TECHNICAL_OFFICE_STAFF ? officerName : maintainerName,
    message: m.message,
    createdAt: m.createdAt
  }));
}

function ensureAuthorized(report: any, sender: Participant, receiver: Participant) {
  const assignedOfficerId = report.assignedOfficerId;
  const assignedMaintainerId = report.assignedMaintainerId;

  if (sender.type === OfficerRole.TECHNICAL_OFFICE_STAFF) {
    if (assignedOfficerId !== sender.id) throw new ForbiddenError("Not assigned to this report");
    if (receiver.type !== OfficerRole.MAINTAINER || assignedMaintainerId !== receiver.id) {
      throw new ForbiddenError("Invalid receiver for this report");
    }
  } else {
    if (assignedMaintainerId !== sender.id) {
      throw new ForbiddenError(`Not assigned to this report. Sender ID: ${sender.id}, Assigned Maintainer ID: ${assignedMaintainerId}`);
    }
    if (receiver.type !== OfficerRole.TECHNICAL_OFFICE_STAFF || assignedOfficerId !== receiver.id) {
      throw new ForbiddenError("Invalid receiver for this report");
    }
  }
}

export async function sendInternalMessage(reportId: number, sender: Participant, receiver: Participant, message: string) {
  if (!message?.trim()) throw new BadRequestError("Message cannot be empty");
  const reportRepo = new ReportRepository();
  const report = await reportRepo.getReportById(reportId);
  
  ensureAuthorized(report, sender, receiver);

  const msgRepo = new InternalMessageRepository();
  const saved = await msgRepo.create({
    reportId,
    senderType: sender.type,
    senderId: sender.id,
    receiverType: receiver.type,
    receiverId: receiver.id,
    message,
  });

  // Emit real-time event to room after saving
  const io = getIO();
  if (io) {
    io.to(`report:${reportId}`).emit("internal-message:new", {
      id: saved.id,
      reportId: saved.reportId,
      senderType: saved.senderType,
      senderId: saved.senderId,
      receiverType: saved.receiverType,
      receiverId: saved.receiverId,
      message: saved.message,
      createdAt: saved.createdAt,
    });
  }

  return {
    id: saved.id,
    reportId: saved.reportId,
    senderType: saved.senderType,
    senderId: saved.senderId,
    receiverType: saved.receiverType,
    receiverId: saved.receiverId,
    message: saved.message,
    createdAt: saved.createdAt
  };
}
