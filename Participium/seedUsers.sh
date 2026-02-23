#!/bin/bash

# Seed Users Script - Populates the database with test users
# Creates various user types with simple credentials for testing

SCRIPT_DIR="$(dirname "$0")"
DB_PATH="$SCRIPT_DIR/server/participium.db"

echo "════════════════════════════════════════════════════════════"
echo "  👤 Participium User Seeder"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if database exists
if [[ ! -f "$DB_PATH" ]]; then
    echo "❌ Database not found at $DB_PATH"
    echo "Please run the server first to create the database."
    exit 1
fi

# Hash passwords using bcrypt (10 rounds)
# Note: These hashes are for testing only - password is the same as username
HASH_USER='$2b$10$rZ7N3qN5qN5qN5qN5qN5qOeKKKKKKKKKKKKKKKKKKKKKKKKKKK' # Placeholder - will use real hash
HASH_TECHNICAL='$2b$10$rZ7N3qN5qN5qN5qN5qN5qOeKKKKKKKKKKKKKKKKKKKKKKKKKKK'
HASH_ADMIN='$2b$10$rZ7N3qN5qN5qN5qN5qN5qOeKKKKKKKKKKKKKKKKKKKKKKKKKKK'
HASH_PR='$2b$10$rZ7N3qN5qN5qN5qN5qN5qOeKKKKKKKKKKKKKKKKKKKKKKKKKKK'
HASH_MAINTAINER='$2b$10$rZ7N3qN5qN5qN5qN5qN5qOeKKKKKKKKKKKKKKKKKKKKKKKKKKK'

# Generate bcrypt hashes using Node.js
echo "🔐 Generating password hashes..."
HASH_USER=$(cd server && node -e "console.log(require('bcrypt').hashSync('user', 10))")
HASH_TECHNICAL=$(cd server && node -e "console.log(require('bcrypt').hashSync('technical', 10))")
HASH_ADMIN=$(cd server && node -e "console.log(require('bcrypt').hashSync('admin', 10))")
HASH_PR=$(cd server && node -e "console.log(require('bcrypt').hashSync('pr', 10))")
HASH_MAINTAINER=$(cd server && node -e "console.log(require('bcrypt').hashSync('maintainer', 10))")

echo "✅ Hashes generated"
echo ""

# Clear existing users and related data
echo "🗑️  Clearing existing users, officers, and maintainers..."
sqlite3 "$DB_PATH" "DELETE FROM role;"
sqlite3 "$DB_PATH" "DELETE FROM officers;"
sqlite3 "$DB_PATH" "DELETE FROM maintainers;"
sqlite3 "$DB_PATH" "DELETE FROM users;"
echo "✅ Users cleared"
echo ""

echo "👥 Creating test users..."
echo ""

# ========================================
# 1. CITIZEN USERS
# ========================================
echo "📝 Creating citizen users..."

sqlite3 "$DB_PATH" <<EOF
INSERT INTO users (username, firstName, lastName, password, email, isActive, emailNotifications)
VALUES 
    ('user', 'Mario', 'Rossi', '$HASH_USER', 'user@example.com', 1, 1),
    ('citizen1', 'Giulia', 'Bianchi', '$HASH_USER', 'citizen1@example.com', 1, 1),
    ('citizen2', 'Luca', 'Verdi', '$HASH_USER', 'citizen2@example.com', 1, 1);
EOF

echo "  ✓ user / user (Mario Rossi)"
echo "  ✓ citizen1 / user (Giulia Bianchi)"
echo "  ✓ citizen2 / user (Luca Verdi)"
echo ""

# ========================================
# 2. TECHNICAL OFFICE STAFF
# ========================================
echo "🔧 Creating technical office staff..."

sqlite3 "$DB_PATH" <<EOF
-- Infrastructure Technical Officer
INSERT INTO officers (username, name, surname, email, password)
VALUES ('technical', 'Anna', 'Ferrari', 'technical@participium.com', '$HASH_TECHNICAL');

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'technical_office_staff', 'infrastructure'
FROM officers WHERE email = 'technical@participium.com';

-- Environment Technical Officer
INSERT INTO officers (username, name, surname, email, password)
VALUES ('tech_env', 'Marco', 'Conti', 'tech_env@participium.com', '$HASH_TECHNICAL');

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'technical_office_staff', 'environment'
FROM officers WHERE email = 'tech_env@participium.com';

-- Safety Technical Officer
INSERT INTO officers (username, name, surname, email, password)
VALUES ('tech_safety', 'Laura', 'Bruno', 'tech_safety@participium.com', '$HASH_TECHNICAL');

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'technical_office_staff', 'safety'
FROM officers WHERE email = 'tech_safety@participium.com';
EOF

echo "  ✓ technical / technical (Anna Ferrari - Infrastructure)"
echo "  ✓ tech_env / technical (Marco Conti - Environment)"
echo "  ✓ tech_safety / technical (Laura Bruno - Safety)"
echo ""

# ========================================
# 3. MUNICIPAL ADMINISTRATORS
# ========================================
echo "⚙️  Creating municipal administrators..."

sqlite3 "$DB_PATH" <<EOF
-- Admin user
INSERT INTO officers (username, name, surname, email, password)
VALUES ('admin', 'Carla', 'Esposito', 'admin@participium.com', '$HASH_ADMIN');

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'municipal_administrator', NULL
FROM officers WHERE email = 'admin@participium.com';
EOF

echo "  ✓ admin / admin (Carla Esposito)"
echo ""

# ========================================
# 4. PUBLIC RELATIONS OFFICERS
# ========================================
echo "📢 Creating public relations officers..."

sqlite3 "$DB_PATH" <<EOF
-- PR Officer
INSERT INTO officers (username, name, surname, email, password)
VALUES ('pr', 'Simone', 'Martini', 'pr@participium.com', '$HASH_PR');

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'municipal_public_relations_officer', NULL
FROM officers WHERE email = 'pr@participium.com';
EOF

echo "  ✓ pr / pr (Simone Martini)"
echo ""

# ========================================
# 5. EXTERNAL MAINTAINERS
# ========================================
echo "🔨 Creating external maintainers..."

sqlite3 "$DB_PATH" <<EOF
-- Infrastructure & Environment Maintainer
INSERT INTO maintainers (name, email, password, categories, active)
VALUES ('Giovanni Russo', 'maintainer@example.com', '$HASH_MAINTAINER', '["infrastructure","environment"]', 1);

-- Safety & Sanitation Maintainer
INSERT INTO maintainers (name, email, password, categories, active)
VALUES ('Elena Fontana', 'maintainer2@example.com', '$HASH_MAINTAINER', '["safety","sanitation"]', 1);

-- Transport Specialist
INSERT INTO maintainers (name, email, password, categories, active)
VALUES ('Roberto Greco', 'maintainer3@example.com', '$HASH_MAINTAINER', '["transport"]', 1);
EOF

echo "  ✓ maintainer@example.com / maintainer (Giovanni Russo - Infrastructure, Environment)"
echo "  ✓ maintainer2@example.com / maintainer (Elena Fontana - Safety, Sanitation)"
echo "  ✓ maintainer3@example.com / maintainer (Roberto Greco - Transport)"
echo ""

# ========================================
# 6. MULTI-ROLE OFFICER (for testing)
# ========================================
echo "👔 Creating multi-role officer..."

sqlite3 "$DB_PATH" <<EOF
-- Multi-role: Technical + PR
INSERT INTO officers (username, name, surname, email, password)
VALUES ('multirole', 'Sofia', 'Romano', 'multirole@participium.com', '$HASH_TECHNICAL');

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'technical_office_staff', 'infrastructure'
FROM officers WHERE email = 'multirole@participium.com';

INSERT INTO role (officerID, officerRole, officeType)
SELECT id, 'municipal_public_relations_officer', NULL
FROM officers WHERE email = 'multirole@participium.com';
EOF

echo "  ✓ multirole / technical (Sofia Romano - Technical + PR)"
echo ""

# ========================================
# Verification
# ========================================
echo "════════════════════════════════════════════════════════════"
echo "📊 Database Summary:"
echo "════════════════════════════════════════════════════════════"

USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;")
OFFICER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM officers;")
MAINTAINER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM maintainers;")
ROLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM role;")

echo "  👤 Citizens: $USER_COUNT"
echo "  👔 Officers: $OFFICER_COUNT"
echo "  🔨 Maintainers: $MAINTAINER_COUNT"
echo "  🎭 Total Roles: $ROLE_COUNT"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "✅ USER SEEDING COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Quick Reference - Test Credentials:"
echo ""
echo "CITIZENS:"
echo "  • user@example.com / user"
echo "  • citizen1@example.com / user"
echo "  • citizen2@example.com / user"
echo ""
echo "TECHNICAL OFFICERS:"
echo "  • technical@participium.com / technical (Infrastructure)"
echo "  • tech_env@participium.com / technical (Environment)"
echo "  • tech_safety@participium.com / technical (Safety)"
echo ""
echo "ADMINISTRATOR:"
echo "  • admin@participium.com / admin"
echo ""
echo "PUBLIC RELATIONS:"
echo "  • pr@participium.com / pr"
echo ""
echo "MAINTAINERS:"
echo "  • maintainer@example.com / maintainer"
echo "  • maintainer2@example.com / maintainer"
echo "  • maintainer3@example.com / maintainer"
echo ""
echo "MULTI-ROLE:"
echo "  • multirole@participium.com / technical"
echo ""
echo "════════════════════════════════════════════════════════════"
