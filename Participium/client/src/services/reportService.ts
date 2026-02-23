import api from './api';

export type ReportState = 'PENDING' | 'APPROVED' | 'ASSIGNED' | 'DECLINED' | 'IN_PROGRESS' | 'SUSPENDED' | 'RESOLVED';

export interface OfficerReport {
  id: number;
  title: string;
  description?: string;
  category?: string;
  anonymity?: boolean;
  author?: {
    id?: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  date?: string;
  location?: { Coordinates: { latitude: number; longitude: number } };
  document?: {
    description?: string;
    photos?: string[];
  };
  state?: ReportState;
  assignedOfficerId?: number;
  assignedMaintainerId?: number;
}

export async function getAssignedReports(): Promise<OfficerReport[]> {
  try {
    const res = await api.get<OfficerReport[]>('/publics/retrievedocs');
    return res.data;
  } catch (e) {
    console.error('Error fetching assigned reports:', e);
    return [];
  }
}

export async function getMyAssignedReports(): Promise<OfficerReport[]> {
  try {
    const res = await api.get<OfficerReport[]>('/officers/assigned');
    return res.data;
  } catch (e) {
    console.error('Error fetching my assigned reports:', e);
    return [];
  }
}

export async function reviewReport(
  id: number,
  approved: ReportState,
  reason?: string,
  reportDetails?: { title: string; authorId?: number; authorUsername?: string },
  officerMessage?: string
): Promise<boolean> {
  try {
    const payload = { state: approved, reason: reason ?? undefined };
    await api.patch(`/officers/reviewdocs/${id}`, payload);

    if (!reportDetails?.authorId) return true;

    const createNotification = () => {
      const base = {
        id: `${Date.now()}_${id}`,
        userId: reportDetails.authorId!,
        reportId: id,
        reportTitle: reportDetails.title,
        timestamp: Date.now(),
        read: false
      };

      if (approved === "APPROVED") {
        return {
          ...base,
          message: `Your report "${reportDetails.title}" has been approved by an officer.`,
          type: "success" as const
        };
      }

      if (approved === "DECLINED") {
        return {
          ...base,
          message: `Your report "${reportDetails.title}" has been rejected. Reason: ${
            reason || "No reason provided"
          }`,
          type: "error" as const
        };
      }

      return null;
    };

    const pushToLocalStorage = (key: string, item: unknown) => {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      parsed.push(item);
      localStorage.setItem(key, JSON.stringify(parsed));
    };

    const notification = createNotification();
    if (notification) {
      pushToLocalStorage("participium_pending_notifications", notification);
    }

    if (approved === "APPROVED" && officerMessage) {
      const messageData = {
        id: `msg_${Date.now()}_${id}`,
        userId: reportDetails.authorId,
        reportId: id,
        reportTitle: reportDetails.title,
        from: "officer",
        message: officerMessage,
        timestamp: Date.now(),
        read: false
      };

      pushToLocalStorage("participium_messages", messageData);
    }

    return true;
  } catch (e) {
    console.error("Error reviewing report:", e);
    return false;
  }
}

export async function updateReportStatus(reportId: number, status: ReportState): Promise<boolean> {
  try {
    await api.patch(`/officers/reviewdocs/${reportId}`, { state: status });
    return true;
  } catch (e) {
    console.error('Error updating report status:', e);
    return false;
  }
}

export function getOfficeForCategory(category?: string) {
  if (!category) return 'Office 3';
  const c = category.toLowerCase();
  if (c.includes('light') || c.includes('public lighting')) return 'Office 2';
  if (c.includes('road') || c.includes('roads')) return 'Office 1';
  if (c.includes('green') || c.includes('park')) return 'Office 3';
  return 'Office 3';
}

export interface Maintainer {
  id: number;
  name: string;
  email: string;
  categories: string[];
  active: boolean;
}

export async function getMaintainersByCategory(category: string): Promise<Maintainer[]> {
  try {
    // Normalize category to lowercase to match OfficeType enum values
    const normalizedCategory = category.toLowerCase();
    const res = await api.get<Maintainer[]>(`/maintainers/by-category/${normalizedCategory}`);
    return res.data;
  } catch (e) {
    console.error('Error fetching maintainers by category:', e);
    return [];
  }
}

export async function assignReportToMaintainer(reportId: number, maintainerId: number): Promise<boolean> {
  try {
    await api.post('/officers/assign-report', { reportId, maintainerId });
    return true;
  } catch (e) {
    console.error('Error assigning report to maintainer:', e);
    return false;
  }
}

export async function getMaintainerAssignedReports(): Promise<OfficerReport[]> {
  try {
    const res = await api.get<OfficerReport[]>('/maintainers/assigned');
    return res.data;
  } catch (e) {
    console.error('Error fetching maintainer assigned reports:', e);
    return [];
  }
}

export async function getMyCitizenReports(): Promise<OfficerReport[]> {
  try {
    const res = await api.get<OfficerReport[]>('/users/my-reports');
    return res.data;
  } catch (e) {
    console.error('Error fetching my citizen reports:', e);
    return [];
  }
}

export async function updateReportStatusByMaintainer(reportId: number, status: ReportState, reason?: string): Promise<boolean> {
  try {
    await api.patch(`/maintainers/reports/${reportId}/status`, { state: status, reason });
    return true;
  } catch (e) {
    console.error('Error updating report status by maintainer:', e);
    return false;
  }
}
