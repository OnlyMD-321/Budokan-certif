import { NextResponse } from "next/server";
import { getAgeGroup, getWeightCategory } from "@/lib/jujitsu";
import { prisma } from "@/lib/prisma";

type DisciplineCode = "FS" | "DS" | "NAWAZA_GI" | "NAWAZA_NOGI";

type SeedAthlete = {
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  currentWeight: number | null;
  selectedDisciplines: DisciplineCode[];
};

const youthAgeGroups = new Set(["U8", "U10", "U12", "U14", "U16", "U18", "U21"]);

function getTuitionAmount(
  selectedDisciplines: DisciplineCode[],
  ageGroupKey: string,
  pricing: {
    youthSinglePrice: number;
    youthPairPrice: number;
    adultSinglePrice: number;
    adultPairPrice: number;
  }
) {
  if (selectedDisciplines.length === 0) return 0;

  const isYouth = youthAgeGroups.has(ageGroupKey);
  const singlePrice = isYouth ? pricing.youthSinglePrice : pricing.adultSinglePrice;
  const pairPrice = isYouth ? pricing.youthPairPrice : pricing.adultPairPrice;

  const hasFS = selectedDisciplines.includes("FS");
  const hasDS = selectedDisciplines.includes("DS");
  const hasNawazaGi = selectedDisciplines.includes("NAWAZA_GI");
  const hasNawazaNogi = selectedDisciplines.includes("NAWAZA_NOGI");

  const firstPackCount = Number(hasFS) + Number(hasDS);
  const secondPackCount = Number(hasNawazaGi) + Number(hasNawazaNogi);

  const firstPackAmount = firstPackCount === 0 ? 0 : firstPackCount === 1 ? singlePrice : pairPrice;
  const secondPackAmount = secondPackCount === 0 ? 0 : secondPackCount === 1 ? singlePrice : pairPrice;

  return firstPackAmount + secondPackAmount;
}

const athletesSeedData = [
  {
    fullName: "ZAINAB BELAARAJ",
    dateOfBirth: "2015-04-29",
    gender: "FEMALE",
    currentWeight: null,
    selectedDisciplines: ["DS"],
  },
  {
    fullName: "INASS OUHMID",
    dateOfBirth: "2016-01-12",
    gender: "FEMALE",
    currentWeight: 43.95,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "IMAD KENZEDDINE",
    dateOfBirth: "2013-12-11",
    gender: "MALE",
    currentWeight: 30.15,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "MED ACHRAF TACHAKOURT",
    dateOfBirth: "2016-01-11",
    gender: "MALE",
    currentWeight: 32.45,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "SAAD SADKI",
    dateOfBirth: "2011-10-23",
    gender: "MALE",
    currentWeight: 53.15,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "MOUAD ELABDELLAOUI",
    dateOfBirth: "2013-05-23",
    gender: "MALE",
    currentWeight: 46.3,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "SAAD GHALMI",
    dateOfBirth: "2012-05-20",
    gender: "MALE",
    currentWeight: 56.45,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "AMINE GHALMI",
    dateOfBirth: "2011-01-14",
    gender: "MALE",
    currentWeight: 42.25,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "MALAK ANTAR",
    dateOfBirth: "2015-08-21",
    gender: "FEMALE",
    currentWeight: 31.0,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "MOUAD SADKI",
    dateOfBirth: "2015-06-01",
    gender: "MALE",
    currentWeight: 33.6,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "SAAEDDINE LEBSABESS",
    dateOfBirth: "2016-02-10",
    gender: "MALE",
    currentWeight: 37.3,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "ANAS GHALMI",
    dateOfBirth: "2015-04-21",
    gender: "MALE",
    currentWeight: 30.15,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "MOHAMED LEBSABESS",
    dateOfBirth: "2011-04-02",
    gender: "MALE",
    currentWeight: 54.1,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "MED YAHYA ZAROUAL",
    dateOfBirth: "2013-03-11",
    gender: "MALE",
    currentWeight: 41.6,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "YAHYA LEKSSAYS",
    dateOfBirth: "2013-06-26",
    gender: "MALE",
    currentWeight: 45.9,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "SALMA ZIAT",
    dateOfBirth: "2011-05-16",
    gender: "FEMALE",
    currentWeight: 35.0,
    selectedDisciplines: ["FS", "DS"],
  },
  {
    fullName: "HIDAYA ZIAT",
    dateOfBirth: "2015-08-26",
    gender: "FEMALE",
    currentWeight: 32.9,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "HIND QAJJA",
    dateOfBirth: "2012-08-20",
    gender: "FEMALE",
    currentWeight: 52.0,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "NIAMA CHRIGUI",
    dateOfBirth: "2011-11-17",
    gender: "FEMALE",
    currentWeight: 57.0,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "YOUSSEF QAJJA",
    dateOfBirth: "2010-06-17",
    gender: "MALE",
    currentWeight: 53.35,
    selectedDisciplines: ["FS"],
  },
  {
    fullName: "DOHA MABCHOUR",
    dateOfBirth: "2010-11-13",
    gender: "FEMALE",
    currentWeight: null,
    selectedDisciplines: ["DS"],
  },
  {
    fullName: "MARWA CHAKIRI",
    dateOfBirth: "2010-12-20",
    gender: "FEMALE",
    currentWeight: null,
    selectedDisciplines: ["DS"],
  },
] satisfies SeedAthlete[];

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "reset") {
      // Clear all data
      await prisma.payment.deleteMany();
      await prisma.registration.deleteMany();
      await prisma.medal.deleteMany();
      await prisma.certificate.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.activityLog.deleteMany();
      await prisma.athlete.deleteMany();
      await prisma.championship.deleteMany();

      return NextResponse.json({ success: true, message: "Database cleared" });
    }

    if (action === "seed") {
      // Clear and reseed
      await prisma.payment.deleteMany();
      await prisma.registration.deleteMany();
      await prisma.medal.deleteMany();
      await prisma.certificate.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.activityLog.deleteMany();
      await prisma.athlete.deleteMany();
      await prisma.championship.deleteMany();

      // Create championship
      const championship = await prisma.championship.create({
        data: {
          name: "Championnat Regional de Ju-jitsu Fighting/Duo Cadets 2026",
          league: "Casablanca-Settat",
          type: "REGIONAL",
          status: "OPEN",
          eventDate: new Date("2026-04-05"),
          location: "Salle couverte Chams Almadina Tit Mllil",
          enabledDisciplines: ["fighting", "duel"],
          pricing: {
            youthSinglePrice: 50,
            youthPairPrice: 75,
            adultSinglePrice: 100,
            adultPairPrice: 150,
          },
        },
      });

      // Create athletes
      const athletes = await Promise.all(
        athletesSeedData.map((athlete) =>
          prisma.athlete.create({
            data: {
              fullName: athlete.fullName,
              dateOfBirth: new Date(athlete.dateOfBirth),
              gender: athlete.gender as "MALE" | "FEMALE",
              currentWeight: athlete.currentWeight,
              clubName: "Budokan du Maroc",
            },
          })
        )
      );

      const pricing = {
        youthSinglePrice: 50,
        youthPairPrice: 75,
        adultSinglePrice: 100,
        adultPairPrice: 150,
      };

      // Create registrations
      const registrations = await Promise.all(
        athletes.map((athlete, index) => {
          const seedAthlete = athletesSeedData[index];
          const ageGroup = getAgeGroup(athlete.dateOfBirth, championship.eventDate).key;
          const hasFighting = seedAthlete.selectedDisciplines.some((discipline) => discipline === "FS");
          const weightCategory = hasFighting && athlete.currentWeight != null
            ? getWeightCategory(ageGroup, athlete.gender, athlete.currentWeight)
            : "N/A";
          const tuitionAmount = getTuitionAmount(seedAthlete.selectedDisciplines, ageGroup, pricing);

          return prisma.registration.create({
            data: {
              athleteId: athlete.id,
              championshipId: championship.id,
              selectedDisciplines: seedAthlete.selectedDisciplines,
              ageGroup,
              weightCategory,
              tuitionAmount,
              status: "PENDING",
            },
          });
        })
      );

      // Create payments
      await Promise.all(
        registrations.map((reg) =>
          prisma.payment.create({
            data: {
              registrationId: reg.id,
              amountDue: reg.tuitionAmount,
              amountPaid: 0,
              status: "UNPAID",
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        message: "Database seeded",
        createdAthletes: athletes.length,
        createdRegistrations: registrations.length,
        championshipId: championship.id,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Seeding failed",
    }, { status: 500 });
  }
}
