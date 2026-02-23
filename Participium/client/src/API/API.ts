import { getToken } from "../services/auth";

const URI = 'http://localhost:5000/api/v1'

const static_ip_address = "http://localhost:5000";

type Credentials = {
    username: string;
    email: string;
    password: string;
};


type UserCredentials = {
    username: string;
    password: string;
};

async function userLogin(credentials: UserCredentials) {

    const bodyObject = {
        username: credentials.username,
        password: credentials.password
    }
    
    try {
        const response = await fetch(URI + `/auth/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyObject)
        })
        
        if (response.ok) {
            const token = await response.json();
            return token;
        } else {
            const err = await response.text()

            const match = /<pre>(.*?)<\/pre>/i.exec(err);

            const errorType = match ? match[1] : response.statusText;

            throw new Error(`${response.status} ${errorType}`);
        }
    } catch (error) {
        console.error('userLogin - Network or parse error:', error);
        throw error;
    }
}

async function officerLogin(credentials: Credentials) {

    const bodyObject = {
        email: credentials.username, // Backend expects 'email' field for officers
        password: credentials.password
    }

    try {
        const response = await fetch(URI + `/auth/officers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyObject)
        })

        if (response.ok) {
            const token = await response.json();
            return token;
        } else {
            const err = await response.text()
            console.error('officerLogin - Error response:', err);
            throw new Error(err || 'Officer login failed');
        }
    } catch (error) {
        console.error('officerLogin - Network or parse error:', error);
        throw error;
    }
}

async function maintainerLogin(credentials: Credentials) {

    const bodyObject = {
        email: credentials.username, // Backend expects 'email' field for maintainers
        password: credentials.password
    }

    try {
        const response = await fetch(URI + `/auth/maintainers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyObject)
        })

        if (response.ok) {
            const token = await response.json();
            return token;
        } else {
            const err = await response.text()
            console.error('maintainerLogin - Error response:', err);
            throw new Error(err || 'Maintainer login failed');
        }
    } catch (error) {
        console.error('maintainerLogin - Network or parse error:', error);
        throw error;
    }
}

type User = {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

type Officer = {
    email: string;
    name: string;
    surname: string;
    password: string;
    roles:
    {
        office: string;
        role: string;
    }[];
}


async function userRegister(user: User) {

    const response = await fetch(URI + `/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(user)
    });
    if (response.ok) {
        return true;
    }
    else {
        const err = await response.text()

        const match = /<pre>(.*?)<\/pre>/i.exec(err);

        const errorType = match ? match[1] : response.statusText;

        throw new Error(`${response.status} ${errorType}`);
    }
}

async function generateOtp(email: string) {
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new Error('If your account has not been activated yet, please provide a valid email address to receive the OTP code.');
    }
    
    const response = await fetch(URI + `/users/generateotp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
    });
    if (response.ok) {
        return true;
    }
    else {
        const err = await response.text()

        const match = /<pre>(.*?)<\/pre>/i.exec(err);

        const errorType = match ? match[1] : response.statusText;

        throw new Error(`${response.status} ${errorType}`);
    }
}


async function verifyOtp(code: string, email: string) {

    const response = await fetch(URI + `/users/verifyotp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, email })
    });
    if (response.ok) {
        return true;
    }
    else {
        const err = await response.text()

        const match = /<pre>(.*?)<\/pre>/i.exec(err);

        const errorType = match ? match[1] : response.statusText;

        throw new Error(`${response.status} ${errorType}`);
    }
}

async function officerRegister(officer: Officer) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/officers`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(officer)
    });
    if (response.ok) {
        return true;
    }
    else {
        const err = await response.text()

        const match = /<pre>(.*?)<\/pre>/i.exec(err);

        const errorType = match ? match[1] : response.statusText;

        throw new Error(`${response.status} ${errorType}`);
    }
}

type Maintainer = {
    name: string;
    email: string;
    password: string;
    categories:
    string[];
    active: boolean
}

async function maintainerRegister(maintainer: Maintainer) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/maintainers`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(maintainer)
    });
    if (response.ok) {
        return true;
    }
    else {
        const err = await response.text()

        const match = /<pre>(.*?)<\/pre>/i.exec(err);


        const errorType = match ? match[1] : response.statusText;

        throw new Error(`${response.status} ${errorType}`);
    }
}

async function getAssignedReports() {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/publics/retrievedocs`, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        const reports = await response.json();
        return reports;
    }
    else {
        const err = await response.text()
        throw err;
    }
}

async function getAvailableOfficerTypes() {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/info-types`, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        const types = await response.json();
        return types;
    }
    else {
        const err = await response.text()
        throw err;
    }
}

async function getUserProfile() {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/users/me`, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        const profile = await response.json();
        return profile;
    }
    else {
        const err = await response.text()
        throw err;
    }
}

interface UpdatedData {
    telegram?: string;
    emailNotifications?: boolean;
    avatar?: File;
}

async function updateUserProfile(updatedData: UpdatedData) {
    const token = getToken();

    const formData = new FormData();

    if (updatedData.telegram !== undefined) {
        formData.append("telegramUsername", updatedData.telegram);
    }

    if (updatedData.emailNotifications !== undefined) {
        formData.append("emailNotifications", updatedData.emailNotifications ? "true" : "false");
    }

    if (updatedData.avatar instanceof File) {
        formData.append("avatar", updatedData.avatar);
    }

    const response = await fetch(URI + `/users/me`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData
    });

    if (!response.ok) {
        throw await response.text();
    }

    return await response.json();
}

async function getOfficersByOffice(office: string) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/officers/OfficerByOfficeType/${office}`, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        const officers = await response.json();
        return officers;
    }
    else {
        const err = await response.text()
        throw err;
    }
}

async function assignOfficer(reportId: number, officerId: number) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/publics/assign-report`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ reportId, officerId }),
    });

    if (response.ok) {
        return true;
    }
    else {
        const err = await response.text()
        throw err;
    }
}

interface Notification {
    id: number;
    userId: number;
    reportId?: number;
    type: 'STATUS_CHANGE' | 'OFFICER_MESSAGE';
    message: string;
    createdAt: string;
    read: boolean;
}

async function getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const url = unreadOnly ? URI + `/notifications?unreadOnly=true` : URI + `/notifications`;
    const response = await fetch(url, {
        method: 'GET',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch notifications');
    }
}

async function markNotificationAsRead(notificationId: number): Promise<{ id: number; read: boolean }> {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to mark notification as read');
    }
}


async function getAllOfficers() {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/officers`, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        const profile = await response.json();
        return profile;
    }
    else {
        const err = await response.text()
        throw err;
    }
}


async function getAllMaintainers() {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/maintainers`, {
        method: 'GET',
        headers: headers,
    });
    if (response.ok) {
        const profile = await response.json();
        return profile;
    }
    else {
        const err = await response.text()
        throw err;
    }
}

async function updateMaintainers(maintainer: Maintainer, id: number) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/maintainers/${id}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(maintainer),
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to update maintainer');
    }
}


async function updateOfficer(officer: Officer) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const officerId = Number((officer as any)?.id);
    if (!officerId) {
        throw new Error('Officer id is required to update officer');
    }

    const response = await fetch(URI + `/officers/${officerId}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(officer),
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to update officer');
    }
}



async function deleteOfficer(id: number) {
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/officers/${id}`, {
        method: 'DELETE',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to delete officer');
    }
}


async function deleteMaintainer(id: number) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/maintainers/${id}`, {
        method: 'DELETE',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to delete maintainer');
    }
}

async function getReportById(reportId: string) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/reports/${reportId}`, {
        method: 'GET',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch report');
    }
}

// Statistics API
type PublicStatistics = {
    totalReports: number;
    byCategory: Array<{ category: string; count: number }>;
    byState: Array<{ state: string; count: number }>;
    dailyTrend: Array<{ date: string; count: number }>;
    weeklyTrend: Array<{ week: string; count: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
};

async function getPublicStatistics() {
    try {
        // Fetch all three periods in parallel
        const [dailyResponse, weeklyResponse, monthlyResponse] = await Promise.all([
            fetch(URI + `/reports/macrostats?period=daily`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            fetch(URI + `/reports/macrostats?period=weekly`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            }),
            fetch(URI + `/reports/macrostats?period=monthly`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })
        ]);

        if (dailyResponse.ok && weeklyResponse.ok && monthlyResponse.ok) {
            const [dailyData, weeklyData, monthlyData] = await Promise.all([
                dailyResponse.json(),
                weeklyResponse.json(),
                monthlyResponse.json()
            ]);

            // Transform the response from backend to match frontend expectations
            return {
                totalReports: dailyData.byState.reduce((sum: number, cat: any) => sum + cat.count, 0),
                byCategory: dailyData.byCategory,
                byState: dailyData.byState || [],
                dailyTrend: dailyData.trends?.data.map((d: any) => ({ date: d.period, count: d.count })) || [],
                weeklyTrend: weeklyData.trends?.data.map((d: any) => ({ week: d.period, count: d.count })) || [],
                monthlyTrend: monthlyData.trends?.data.map((d: any) => ({ month: d.period, count: d.count })) || [],
            } as PublicStatistics;
        } else {
            const err = await dailyResponse.text();
            throw new Error(err || 'Failed to fetch statistics');
        }
    } catch (error) {
        console.error('getPublicStatistics - Error:', error);
        throw error;
    }
}

async function followReport(reportId: string) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/reports/${reportId}/follow`, {
        method: 'POST',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch report');
    }
}

async function unfollowReport(reportId: string) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/reports/${reportId}/follow`, {
        method: 'DELETE',
        headers: headers,
    });

    if (response.ok) {
        return response;
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch report');
    }
}

async function getFollowedReports() {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/users/me/followed-reports`, {
        method: 'GET',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch report');
    }
}

// FAQ API functions
async function getAllFaqs() {
    const response = await fetch(URI + `/faqs`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to fetch FAQs');
    }
}

async function createFaq(question: string, answer: string) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/faqs`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ question, answer }),
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to create FAQ');
    }
}

async function updateFaq(faqId: number, question: string, answer: string) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/faqs/${faqId}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify({ question, answer }),
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to update FAQ');
    }
}

async function deleteFaq(faqId: number) {
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(URI + `/faqs/${faqId}`, {
        method: 'DELETE',
        headers: headers,
    });

    if (response.ok) {
        return await response.json();
    } else {
        const err = await response.text();
        throw new Error(err || 'Failed to delete FAQ');
    }
}

export { static_ip_address, userLogin, userRegister, officerLogin, maintainerLogin, officerRegister, getAssignedReports, getAvailableOfficerTypes, getUserProfile, updateUserProfile, getOfficersByOffice, assignOfficer, getNotifications, markNotificationAsRead, generateOtp, verifyOtp, maintainerRegister, getAllOfficers, getAllMaintainers, updateMaintainers, updateOfficer, deleteOfficer, deleteMaintainer, getReportById, followReport, unfollowReport, getFollowedReports, getPublicStatistics, getAllFaqs, createFaq, updateFaq, deleteFaq };
export type { Notification, PublicStatistics };