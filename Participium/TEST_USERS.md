# 👤 Test Users Documentation

This document lists all test users created by the `seedUsers.sh` script for development and testing purposes.

## 📋 Quick Reference

| Role | Email | Password | Name | Categories |
|------|-------|----------|------|------------|
| **Citizen** | user@example.com | user | Mario Rossi | - |
| **Citizen** | citizen1@example.com | user | Giulia Bianchi | - |
| **Citizen** | citizen2@example.com | user | Luca Verdi | - |
| **Technical Officer** | technical@participium.com | technical | Anna Ferrari | Infrastructure |
| **Technical Officer** | tech_env@participium.com | technical | Marco Conti | Environment |
| **Technical Officer** | tech_safety@participium.com | technical | Laura Bruno | Safety |
| **Administrator** | admin@participium.com | admin | Carla Esposito | All |
| **Public Relations** | pr@participium.com | pr | Simone Martini | All |
| **Maintainer** | maintainer@example.com | maintainer | Giovanni Russo | Infrastructure, Environment |
| **Maintainer** | maintainer2@example.com | maintainer | Elena Fontana | Safety, Sanitation |
| **Maintainer** | maintainer3@example.com | maintainer | Roberto Greco | Transport |
| **Multi-role** | multirole@participium.com | technical | Sofia Romano | Technical + PR |

---

## 👥 Citizens (3)

### 1. Mario Rossi
- **Email:** user@example.com
- **Password:** user
- **Username:** user
- **Role:** Citizen
- **Status:** Active
- **Purpose:** Primary test user for citizen functionality

### 2. Giulia Bianchi
- **Email:** citizen1@example.com
- **Password:** user
- **Username:** citizen1
- **Role:** Citizen
- **Status:** Active
- **Purpose:** Secondary test user for multi-user scenarios

### 3. Luca Verdi
- **Email:** citizen2@example.com
- **Password:** user
- **Username:** citizen2
- **Role:** Citizen
- **Status:** Active
- **Purpose:** Tertiary test user for multi-user scenarios

---

## 🔧 Technical Office Staff (3)

### 1. Anna Ferrari - Infrastructure
- **Email:** technical@participium.com
- **Password:** technical
- **Username:** technical
- **Role:** Technical Office Staff
- **Office Type:** Infrastructure
- **Purpose:** Test user for infrastructure-related reports

### 2. Marco Conti - Environment
- **Email:** tech_env@participium.com
- **Password:** technical
- **Username:** tech_env
- **Role:** Technical Office Staff
- **Office Type:** Environment
- **Purpose:** Test user for environment-related reports

### 3. Laura Bruno - Safety
- **Email:** tech_safety@participium.com
- **Password:** technical
- **Username:** tech_safety
- **Role:** Technical Office Staff
- **Office Type:** Safety
- **Purpose:** Test user for safety-related reports

---

## ⚙️ Municipal Administrator (1)

### Carla Esposito
- **Email:** admin@participium.com
- **Password:** admin
- **Username:** admin
- **Role:** Municipal Administrator
- **Permissions:** Full system access, user management, officer management
- **Purpose:** Test admin functionality and officer/maintainer CRUD operations

---

## 📢 Public Relations Officer (1)

### Simone Martini
- **Email:** pr@participium.com
- **Password:** pr
- **Username:** pr
- **Role:** Municipal Public Relations Officer
- **Permissions:** View all reports, manage public communications
- **Purpose:** Test public relations functionality and report visibility

---

## 🔨 External Maintainers (3)

### 1. Giovanni Russo
- **Email:** maintainer@example.com
- **Password:** maintainer
- **Role:** External Maintainer
- **Categories:** Infrastructure, Environment
- **Status:** Active
- **Purpose:** Test maintainer functionality for infrastructure and environment reports

### 2. Elena Fontana
- **Email:** maintainer2@example.com
- **Password:** maintainer
- **Role:** External Maintainer
- **Categories:** Safety, Sanitation
- **Status:** Active
- **Purpose:** Test maintainer functionality for safety and sanitation reports

### 3. Roberto Greco
- **Email:** maintainer3@example.com
- **Password:** maintainer
- **Role:** External Maintainer
- **Categories:** Transport
- **Status:** Active
- **Purpose:** Test maintainer functionality for transport reports

---

## 👔 Multi-Role Officer (1)

### Sofia Romano
- **Email:** multirole@participium.com
- **Password:** technical
- **Username:** multirole
- **Roles:** 
  - Technical Office Staff (Infrastructure)
  - Municipal Public Relations Officer
- **Purpose:** Test multi-role functionality and permission combinations

---

## 🚀 Usage Instructions

### Running the Seed Script

```bash
# From the project root directory
./seedUsers.sh
```

**⚠️ Warning:** This script will **DELETE ALL EXISTING USERS** before creating test users.

### Expected Output

```
════════════════════════════════════════════════════════════
  👤 Participium User Seeder
════════════════════════════════════════════════════════════

🔐 Generating password hashes...
✅ Hashes generated

🗑️  Clearing existing users, officers, and maintainers...
✅ Users cleared

👥 Creating test users...
📝 Creating citizen users...
  ✓ user / user (Mario Rossi)
  ✓ citizen1 / user (Giulia Bianchi)
  ✓ citizen2 / user (Luca Verdi)

🔧 Creating technical office staff...
  ✓ technical / technical (Anna Ferrari - Infrastructure)
  ...

✅ USER SEEDING COMPLETE!
```

---

## 🧪 Testing Scenarios

### User Login Testing
```bash
# Test citizen login
Email: user@example.com
Password: user

# Test technical officer login
Email: technical@participium.com
Password: technical

# Test admin login
Email: admin@participium.com
Password: admin
```

### Role-Based Access Testing

#### As Citizen (user@example.com)
- ✅ Submit reports
- ✅ View own reports
- ✅ Send messages to officers
- ✅ Follow reports
- ❌ Cannot review reports
- ❌ Cannot manage users

#### As Technical Officer (technical@participium.com)
- ✅ Review reports (Infrastructure category)
- ✅ Assign reports to maintainers
- ✅ Update report status
- ✅ Send messages to citizens
- ❌ Cannot manage users
- ❌ Cannot access other categories

#### As Administrator (admin@participium.com)
- ✅ Full system access
- ✅ Create/update/delete officers
- ✅ Create/update/delete maintainers
- ✅ View all reports
- ✅ System configuration

#### As Public Relations (pr@participium.com)
- ✅ View all reports
- ✅ Public communications
- ✅ Statistics access
- ❌ Cannot modify reports
- ❌ Cannot manage users

#### As Maintainer (maintainer@example.com)
- ✅ View assigned reports (Infrastructure, Environment)
- ✅ Update work status
- ✅ Mark reports as resolved
- ❌ Cannot access other categories
- ❌ Cannot review reports

---

## 🔒 Security Notes

- All passwords are hashed using **bcrypt** with 10 rounds
- Test credentials are for **development/testing only**
- **Never use these credentials in production**
- All users have `isActive = true` by default (except where noted)
- Email notifications enabled by default for citizens

---

## 📊 Database Schema Reference

### Users Table
- `id` (PK)
- `username` (unique)
- `firstName`
- `lastName`
- `password` (bcrypt hashed)
- `email` (unique)
- `isActive` (boolean)
- `avatar` (nullable)
- `telegramUsername` (nullable)
- `emailNotifications` (boolean)

### Officers Table
- `id` (PK)
- `username` (unique, nullable)
- `name`
- `surname`
- `email` (unique)
- `password` (bcrypt hashed)

### Role Table (Officers' roles)
- `id` (PK)
- `officerID` (FK)
- `officerRole` (enum: technical_office_staff, municipal_administrator, municipal_public_relations_officer)
- `officeType` (enum: infrastructure, environment, safety, sanitation, transport, organization, other)

### Maintainers Table
- `id` (PK)
- `name`
- `email` (unique)
- `password` (bcrypt hashed)
- `categories` (JSON array)
- `active` (boolean)

---

## 🔄 Resetting Test Data

To reset all test users and start fresh:

```bash
# Re-run the seed script
./seedUsers.sh

# Then optionally seed reports
./seedDatabase.sh
```

---

## 📝 Notes

- All citizens have `isActive = true` for immediate testing
- Officers can have multiple roles (see multi-role example)
- Maintainers can handle multiple categories
- Passwords are intentionally simple for testing (username = password in most cases)
- Email format follows convention: `{role}@participium.com` for officers, `{role}@example.com` for citizens/maintainers

---

## 🐛 Troubleshooting

### Issue: "Database not found"
**Solution:** Run the server first to initialize the database:
```bash
cd server && npm run dev
```

### Issue: "bcrypt error" or "node command not found"
**Solution:** Ensure Node.js is installed and bcrypt package is available:
```bash
cd server && npm install
```

### Issue: Login fails with "Invalid credentials"
**Solution:** Re-run the seed script to regenerate password hashes:
```bash
./seedUsers.sh
```

### Issue: "User account is not active"
**Solution:** Check if `isActive` flag is set to 1 in database, or re-seed users.

---

**Last Updated:** January 2, 2026  
**Script Version:** 1.0  
**Compatible with:** Participium v1.0+
