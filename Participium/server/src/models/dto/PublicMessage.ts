export interface PublicMessage {
  id: number;
  reportId: number;
  message: string;
  senderType: 'citizen' | 'officer';
  senderId: number;
  senderName: string;
  createdAt: Date;
  read: boolean;
}
