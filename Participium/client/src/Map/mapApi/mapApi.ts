import type { Report, ReportData } from '../types/report';

const URI = 'http://localhost:5000/api/v1';

// CREATE NEW REPORT
async function createReport(reportData: ReportData): Promise<Report> {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', reportData.title);
    formData.append('description', reportData.description);
    formData.append('category', reportData.category);
    formData.append('anonymity', reportData.anonymity ? 'true' : 'false');
    
    if (reportData.latitude !== null) {
        formData.append('latitude', reportData.latitude.toString());
    }
    if (reportData.longitude !== null) {
        formData.append('longitude', reportData.longitude.toString());
    }

    // Add photos (1-3 files)
    reportData.photos.forEach((photo) => {
        formData.append('photos', photo);
    });

    const response = await fetch(URI + `/reports`, {
        method: 'POST',
        credentials: 'include',
        // Include Authorization header from localStorage token for authenticated requests
        headers: (() => {
            const token = localStorage.getItem('token');
            return token ? { Authorization: `Bearer ${token}` } : undefined;
        })(),
        body: formData
    });

    if (response.ok) {
        const report = await response.json();
        return report;
    } else {
        const err = await response.text();
        throw err;
    }
}

// GET ALL REPORTS
async function getAllReports(): Promise<Report[]> {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(URI + `/reports`, {
        method: 'GET',
        headers,
        credentials: 'include',
    });

    if (response.ok) {
        const backendReports = await response.json();
        
        // Map backend format to frontend format
        return backendReports.map((br: any) => ({
            id: br.id?.toString() || '',
            title: br.title || 'Untitled Report',
            description: br.document?.description || br.document?.Description || '',
            category: br.category || 'other',
            photos: [], // Photos are URLs in backend, convert if needed
            latitude: br.location?.Coordinates?.latitude || 0,
            longitude: br.location?.Coordinates?.longitude || 0,
            createdAt: br.date ? new Date(br.date) : new Date(),
            status: (br.state?.toLowerCase() || 'approved') as 'pending' | 'approved' | 'in_progress' | 'resolved',
            anonymity: br.anonymity,
            author: br.author ? {
                id: br.author.id?.toString(),
                username: br.author.username,
                firstName: br.author.firstName,
                lastName: br.author.lastName,
                email: br.author.email
            } : undefined
        }));
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch reports');
    }
}

export { createReport, getAllReports };