import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import {
  COUNTRIES,
  DEPARTMENTS,
  LEVELS,
  FX_TO_USD,
  currencyForCountry,
} from "../src/config/orgData.js";

const prisma = new PrismaClient();

faker.seed(42);

const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;
const MANUAL_REASONS = ["MERIT_INCREASE", "PROMOTION", "MARKET_ADJUSTMENT"] as const;

const LEVEL_BASE_USD: Record<string, number> = {
  L1: 45000,
  L2: 65000,
  L3: 90000,
  L4: 120000,
  L5: 160000,
  L6: 210000,
};

const TOTAL_EMPLOYEES = 10000;
const EMPLOYEE_CHUNK_SIZE = 500;
const SALARY_CHUNK_SIZE = 1000;
const NOW = new Date();
const EIGHT_YEARS_AGO = new Date(NOW.getTime() - 8 * 365 * 24 * 60 * 60 * 1000);

interface SeedEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  currency: string;
  employmentStatus: string;
  hireDate: Date;
  terminationDate: Date | null;
  managerId: string | null;
  startingSalaryLocal: number;
}

interface SeedSalaryRecord {
  id: string;
  employeeId: string;
  amount: number;
  currency: string;
  effectiveDate: Date;
  reason: string;
  createdAt: Date;
}

function jobTitleFor(department: string, level: string): string {
  const seniority: Record<string, string> = {
    L1: "Associate",
    L2: "",
    L3: "Senior",
    L4: "Lead",
    L5: "Principal",
    L6: "Director",
  };
  const prefix = seniority[level];
  const base = department === "Engineering" ? "Engineer" : department.replace(/s$/, "");
  return prefix ? `${prefix} ${base}` : base;
}

function localSalaryForLevel(level: string, currency: string): number {
  const base = LEVEL_BASE_USD[level];
  const noiseFactor = 1 + (faker.number.float({ min: -0.15, max: 0.15 }));
  const usd = base * noiseFactor;
  const rate = FX_TO_USD[currency];
  return Math.round((usd / rate) * 100) / 100;
}

async function main() {
  console.log("Clearing existing SalaryRecord and Employee rows...");
  await prisma.salaryRecord.deleteMany();
  await prisma.employee.deleteMany();

  console.log(`Generating ${TOTAL_EMPLOYEES} employees...`);
  const employees: SeedEmployee[] = [];

  for (let i = 0; i < TOTAL_EMPLOYEES; i++) {
    const gender = faker.helpers.arrayElement(GENDERS);
    const sex = gender === "FEMALE" ? "female" : gender === "MALE" ? "male" : undefined;
    const firstName = faker.person.firstName(sex);
    const lastName = faker.person.lastName();
    const country = faker.helpers.arrayElement(COUNTRIES).code;
    const department = faker.helpers.arrayElement(DEPARTMENTS);
    const level = faker.helpers.arrayElement(LEVELS);
    const currency = currencyForCountry(country);
    const hireDate = faker.date.between({ from: EIGHT_YEARS_AGO, to: NOW });

    const isTerminated = faker.number.float({ min: 0, max: 1 }) < 0.04;
    let terminationDate: Date | null = null;
    if (isTerminated) {
      const maxTermination = NOW;
      terminationDate = faker.date.between({ from: hireDate, to: maxTermination });
      // Ensure termination is strictly after hire.
      if (terminationDate.getTime() <= hireDate.getTime()) {
        terminationDate = new Date(hireDate.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    const emailLocal = `${firstName}.${lastName}.${i}`
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");

    employees.push({
      id: randomUUID(),
      employeeCode: `EMP-${String(i + 1).padStart(6, "0")}`,
      firstName,
      lastName,
      email: `${emailLocal}@acme-demo.test`,
      gender,
      country,
      department,
      jobTitle: jobTitleFor(department, level),
      level,
      currency,
      employmentStatus: isTerminated ? "TERMINATED" : "ACTIVE",
      hireDate,
      terminationDate,
      managerId: null,
      startingSalaryLocal: localSalaryForLevel(level, currency),
    });

    if ((i + 1) % 2000 === 0) {
      console.log(`  generated ${i + 1}/${TOTAL_EMPLOYEES}`);
    }
  }

  console.log("Assigning managers (~70% of employees, same department, earlier hireDate)...");
  const byDepartment = new Map<string, SeedEmployee[]>();
  for (const emp of employees) {
    const arr = byDepartment.get(emp.department) ?? [];
    arr.push(emp);
    byDepartment.set(emp.department, arr);
  }

  for (const group of byDepartment.values()) {
    group.sort((a, b) => a.hireDate.getTime() - b.hireDate.getTime());
    for (let i = 1; i < group.length; i++) {
      if (faker.number.float({ min: 0, max: 1 }) < 0.7) {
        const managerIdx = faker.number.int({ min: 0, max: i - 1 });
        group[i].managerId = group[managerIdx].id;
      }
    }
  }

  console.log("Inserting employees (pass 1: managerId=null)...");
  for (let i = 0; i < employees.length; i += EMPLOYEE_CHUNK_SIZE) {
    const chunk = employees.slice(i, i + EMPLOYEE_CHUNK_SIZE);
    await prisma.employee.createMany({
      data: chunk.map((emp) => ({
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        gender: emp.gender,
        country: emp.country,
        department: emp.department,
        jobTitle: emp.jobTitle,
        level: emp.level,
        currency: emp.currency,
        employmentStatus: emp.employmentStatus,
        hireDate: emp.hireDate,
        terminationDate: emp.terminationDate,
        managerId: null,
      })),
    });
  }
  console.log(`Inserted ${employees.length} employees.`);

  console.log("Inserting employees (pass 2: assigning managerId)...");
  const withManager = employees.filter((e) => e.managerId !== null);
  for (let i = 0; i < withManager.length; i += EMPLOYEE_CHUNK_SIZE) {
    const chunk = withManager.slice(i, i + EMPLOYEE_CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((emp) =>
        prisma.employee.update({
          where: { id: emp.id },
          data: { managerId: emp.managerId },
        })
      )
    );
    if ((i + EMPLOYEE_CHUNK_SIZE) % 2000 < EMPLOYEE_CHUNK_SIZE) {
      console.log(`  manager-assigned ${Math.min(i + EMPLOYEE_CHUNK_SIZE, withManager.length)}/${withManager.length}`);
    }
  }
  console.log(`Assigned managers to ${withManager.length} employees.`);

  console.log("Generating salary history...");
  const salaryRecords: SeedSalaryRecord[] = [];

  for (const emp of employees) {
    const hireCreatedAt = emp.hireDate;
    salaryRecords.push({
      id: randomUUID(),
      employeeId: emp.id,
      amount: emp.startingSalaryLocal,
      currency: emp.currency,
      effectiveDate: emp.hireDate,
      reason: "HIRE",
      createdAt: hireCreatedAt,
    });

    if (emp.employmentStatus !== "ACTIVE") continue;
    if (faker.number.float({ min: 0, max: 1 }) >= 0.4) continue;

    const numExtra = faker.number.int({ min: 1, max: 3 });
    let lastAmount = emp.startingSalaryLocal;
    let lastDate = emp.hireDate;

    for (let j = 0; j < numExtra; j++) {
      const remainingMs = NOW.getTime() - lastDate.getTime();
      if (remainingMs <= 24 * 60 * 60 * 1000) break;
      const nextDate = faker.date.between({
        from: new Date(lastDate.getTime() + 24 * 60 * 60 * 1000),
        to: NOW,
      });
      const bump = 1 + faker.number.float({ min: 0.03, max: 0.15 });
      const nextAmount = Math.round(lastAmount * bump * 100) / 100;
      const reason = faker.helpers.arrayElement(MANUAL_REASONS);

      salaryRecords.push({
        id: randomUUID(),
        employeeId: emp.id,
        amount: nextAmount,
        currency: emp.currency,
        effectiveDate: nextDate,
        reason,
        createdAt: nextDate,
      });

      lastAmount = nextAmount;
      lastDate = nextDate;
    }
  }

  console.log(`Inserting ${salaryRecords.length} salary records...`);
  for (let i = 0; i < salaryRecords.length; i += SALARY_CHUNK_SIZE) {
    const chunk = salaryRecords.slice(i, i + SALARY_CHUNK_SIZE);
    await prisma.salaryRecord.createMany({
      data: chunk,
    });
  }
  console.log(`Inserted ${salaryRecords.length} salary records.`);

  console.log("Seeding HR admin user...");
  const adminEmail = process.env.HR_ADMIN_EMAIL || "hr.manager@acme.test";
  const adminPassword = process.env.HR_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: "HR Manager" },
    create: { email: adminEmail, passwordHash, name: "HR Manager" },
  });

  console.log("Building summary...");
  const byDept = new Map<string, number>();
  const byCountry = new Map<string, number>();
  for (const emp of employees) {
    byDept.set(emp.department, (byDept.get(emp.department) ?? 0) + 1);
    byCountry.set(emp.country, (byCountry.get(emp.country) ?? 0) + 1);
  }

  console.log("\n=== Seed summary ===");
  console.log(`Total employees: ${employees.length}`);
  console.log(`Total salary records: ${salaryRecords.length}`);
  console.log(`Active: ${employees.filter((e) => e.employmentStatus === "ACTIVE").length}`);
  console.log(`Terminated: ${employees.filter((e) => e.employmentStatus === "TERMINATED").length}`);
  console.log("\nBy department:");
  for (const [dept, count] of byDept.entries()) {
    console.log(`  ${dept}: ${count}`);
  }
  console.log("\nBy country:");
  for (const [country, count] of byCountry.entries()) {
    console.log(`  ${country}: ${count}`);
  }
  console.log(`\nHR admin user: ${adminEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
