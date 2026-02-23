export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  photos: File[];
  latitude: number;
  longitude: number;
  createdAt: Date;
  status: 'pending' | 'in-progress' | 'resolved';
  anonymity?: boolean;
  author?: {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface ReportData {
  title: string;
  description: string;
  category: string;
  photos: File[];
  latitude: number | null;
  longitude: number | null;
  anonymity?: boolean;
}

export type ReportCategory = 
  | 'water_supply' 
  | 'architectural_barriers' 
  | 'public_lighting' 
  | 'waste' 
  | 'road_signs_and_traffic_lights' 
  | 'roads_and_urban_furnishings' 
  | 'public_green_areas_and_playgrounds'
  | 'other';

export const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'water_supply', label: 'Water Supply - Drinking Water' },
  { value: 'architectural_barriers', label: 'Architectural Barriers' },
  { value: 'public_lighting', label: 'Public Lighting' },
  { value: 'waste', label: 'Waste Management' },
  { value: 'road_signs_and_traffic_lights', label: 'Road Signs and Traffic Lights' },
  { value: 'roads_and_urban_furnishings', label: 'Roads and Urban Furnishings' },
  { value: 'public_green_areas_and_playgrounds', label: 'Public Green Areas and Playgrounds' },
  { value: 'other', label: 'Other' },
];

export const STATUS_COLORS = {
  'pending': '#f59e0b', // Amber
  'in-progress': '#3b82f6', // Blue
  'resolved': '#10b981', // Green
};
