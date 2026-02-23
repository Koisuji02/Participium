import { AppDataSource } from "@database";
import { OfficerDAO } from "@models/dao/OfficerDAO";
import { RoleDAO } from "@models/dao/RoleDAO";
import { OfficerRole } from "@models/enums/OfficerRole";
import { OfficeType } from "@models/enums/OfficeType";
import { hashPassword } from "@services/authService";

async function createOfficer() {
  try {
    console.log("🔧 Creating new officer...");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const officerRepo = AppDataSource.getRepository(OfficerDAO);

    // Officer credentials
    const officerData = {
      name: "Marco",
      surname: "Rossi",
      email: "marco.rossi@comune.torino.it",
      password: "officer123", // Plain password - will be hashed
      roles: [
        {
          officerRole: OfficerRole.TECHNICAL_OFFICE_STAFF,
          officeType: OfficeType.ARCHITECTURAL_BARRIERS, // Architectural barriers issues
        } as Partial<RoleDAO>,
      ],
    };

    // Check if officer already exists
    const existing = await officerRepo.findOne({
      where: { email: officerData.email },
      relations: { roles: true },
    });
    if (existing) {
      console.log(`⚠️  Officer with email ${officerData.email} already exists!`);
      console.log("\n📋 Existing officer details:");
      console.log(`   Name: ${existing.name} ${existing.surname}`);
      console.log(`   Email: ${existing.email}`);
      console.log(
        `   Roles: ${
          (existing.roles || [])
            .map((r) => `${r.officerRole}${r.officeType ? ` (${r.officeType})` : ""}`)
            .join(", ") || "none"
        }`
      );
      return existing;
    }

    // Hash the password
    const hashedPassword = await hashPassword(officerData.password);

    // Create new officer with roles
    const newOfficer = officerRepo.create({
      name: officerData.name,
      surname: officerData.surname,
      email: officerData.email,
      password: hashedPassword,
      roles: officerData.roles,
    });

    await officerRepo.save(newOfficer);

    console.log("\n✅ Officer created successfully!");
    console.log("\n📋 Officer credentials:");
    console.log(`   Name: ${officerData.name} ${officerData.surname}`);
    console.log(`   Email: ${officerData.email}`);
    console.log(`   Password: ${officerData.password}`);
    console.log(
      `   Roles: ${officerData.roles
        .map((r) => `${r.officerRole}${r.officeType ? ` (${r.officeType})` : ""}`)
        .join(", ")}`
    );
    console.log("\n🔑 Use these credentials to login as an officer!");

    return newOfficer;
  } catch (error) {
    console.error("❌ Error creating officer:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  createOfficer()
    .then(() => {
      console.log("\n✨ Officer creation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Officer creation failed:", error);
      process.exit(1);
    });
}

export { createOfficer };
