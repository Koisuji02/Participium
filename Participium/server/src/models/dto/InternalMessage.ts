import { OfficerRole } from "@models/enums/OfficerRole";

export interface InternalMessage {
  id: number;
  reportId: number;
  senderType: OfficerRole.TECHNICAL_OFFICE_STAFF | OfficerRole.MAINTAINER;
  senderId: number;
  receiverType: OfficerRole.TECHNICAL_OFFICE_STAFF | OfficerRole.MAINTAINER;
  receiverId: number;
  message: string;
  createdAt: string;
}