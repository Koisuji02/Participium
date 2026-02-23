# Participium

Civic reporting platform for the city of Turin, enabling citizens to report urban issues and allowing municipal officers to review and manage them.

The application also supports report submissions via a Telegram bot: https://t.me/participium_g16_bot

## Project Structure
- `api/`: OpenAPI specification (swagger)
- `client/`: Frontend - React + TypeScript + Vite
- `server/`: Backend - Node.js + TypeScript + Express + SQLite

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn

## Setup Instructions

### Installation via Docker

Ensure that Docker is running in background, then open the project folder and run:

```powershell
docker compose pull
```

### Running the Application

To start the application, run:
```powershell
docker compose up -d
```

Client, server, redis and the Telegram Bot will start automatically:

- Server will run on `http://localhost:5000`
- Client will run on `http://localhost:5173`

To stop the application, run:

```powershell
docker compose down
```

### Admin setup
The database is preloaded with an admin account, with credentials:
- Username: admin
- Password: admin

## User Roles

- **Citizen**: Can submit reports, view all approved reports on the map
- **Municipal Public Relations Officer**: Can review pending reports, assign them to Technical Officers or reject them with reasons
- **Technical Officer**: Can view assigned reports, change their status and assign them to External Maintainers
- **Municipal Administrator**: Can create officers and assign them to offices
- **External Maintainer**: Can view assigned reports, change their status and communicate with Technical Officers

## Features

### For Citizens
- **Report Visualization**
  - Interactive map showing all approved civic reports
  - Reports grouped in clusters, showing more details when zooming
  - Search reports by address
- **Report Submission**
  - Select location directly on the map
  - Submit new reports with photos (up to 3 images)
  - Categorize reports (infrastructure, environment, safety, sanitation, transport, other)
  - Submissions available also via Telegram bot: https://t.me/participium_g16_bot
- **Report Notifications**
  - Follow other users' reports
  - Receive optional notifications for report status updates on Telegram
  - Receive optional emails for report status updates

### For Public Relations Officers
- **Report Review**
  - Dashboard to review pending reports
  - View report details including photos, location, and description
  - Reject reports with mandatory rejection reasons, or assign them to technical officer
  - View reports on map from review interface

### For Technical Officers
- **Report Update**
  - Dashboard to view assigned reports
  - Update report status
  - View report details including photos, location, and description
  - View reports on map from review interface
- **Report Assignment**
  - Assign reports to external maintainers
- **Information exchange with Maintainers**
  - Can exchange messages about a report with the assigned external maintainer

### For Admin
- **Officer Creation**
  - Dashboard to create officer accounts
- **Officer Modification**
  - Dashboard to edit officer accounts

### For External Maintainers
- **Report Update**
  - Dashboard to view assigned reports
  - Update report status
  - View report details including photos, location, and description
  - View reports on map from review interface
- **Information exchange with Officers**
  - Can exchange messages about a report with the assigned technical officer

## Implemented Office Types
The offices included in the application are the following:

- Water Supply - Drinking Water
- Architectural Barriers
- Public Lighting
- Waste Management
- Road Signs and Traffic Lights
- Roads and Urban Furnishings
- Public Green Areas and Playgrounds
- Other

## Implemented User Stories
- PT01: Citizen registration
- PT02: Setup municipality users
- PT03: Roles Assignment
- PT04: Location selection on Map
- PT05: Report details
- PT06: Approve/Deny reports
- PT07: Report visualization on Map
- PT08: Report list for municipality users
- PT09: Account Configuration
- PT10: Modify municipality users role
- PT11: Update Report Status
- PT12: Create Report via Telegram- PT13
- PT14: Telegram assistance
- PT15: Anonymous reports
- PT16: Follow reports by other citizens
- PT17: Telegram Notifications
- PT18: Reply to operators
- PT19: Email alerts
- PT20: Report statistics
- PT24: Assign report to external maintainers
- PT25: Update report status (external maintainer)
- PT26: Exchange information between staff members and external maintainers
- PT27: Confirmation code for registration
- PT28: Report visualization (unregistered user)
- PT30: Search report by address

## Technologies

### Frontend
- React 18 with TypeScript
- Material-UI for components
- Leaflet for interactive maps
- Supercluster for map marker clustering
- Vite for build tooling

### Backend
- Node.js with Express
- TypeScript
- SQLite database
- Multer for file uploads
- JWT for authentication
- Redis for session token handling
- Socket.io for live chat

## License
See LICENSE file for details
