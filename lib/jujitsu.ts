export type Gender = "MALE" | "FEMALE";
export type ChampionshipType = "REGIONAL" | "NATIONAL";
export type DisciplineKey = "fighting" | "duel" | "nawazaNog" | "nawazaGi";
export type PricingProfile = "AUTO" | "YOUTH" | "ADULT";

export const disciplineLabels: Record<DisciplineKey, string> = {
  fighting: "Fighting System",
  duel: "Duo System",
  nawazaNog: "Nawaza No-Gi",
  nawazaGi: "Nawaza Gi",
};

export const defaultPricing: Record<DisciplineKey, number> = {
  fighting: 50,
  duel: 50,
  nawazaNog: 50,
  nawazaGi: 50,
};

export const defaultPairPricing = {
  profile: "AUTO" as PricingProfile,
  youthSinglePrice: 50,
  youthPairPrice: 75,
  adultSinglePrice: 100,
  adultPairPrice: 150,
};

type PricingConfig = {
  profile?: PricingProfile;
  youthSinglePrice?: number;
  youthPairPrice?: number;
  adultSinglePrice?: number;
  adultPairPrice?: number;
} & Partial<Record<DisciplineKey, number>>;

const ageGroupRanges = [
  { key: "U8", min: 6, max: 7, label: "U8 (6-7 ans)" },
  { key: "U10", min: 8, max: 9, label: "U10 (8-9 ans)" },
  { key: "U12", min: 10, max: 11, label: "U12 (10-11 ans)" },
  { key: "U14", min: 12, max: 13, label: "U14 (12-13 ans)" },
  { key: "U16", min: 14, max: 15, label: "U16 (14-15 ans)" },
  { key: "U18", min: 16, max: 17, label: "U18 (16-17 ans)" },
  { key: "U21", min: 18, max: 20, label: "U21 (18-20 ans)" },
  { key: "Adults", min: 21, max: 34, label: "Adults (21-34 ans)" },
  { key: "Master 1", min: 35, max: 39, label: "Master 1 (35-39 ans)" },
  { key: "Master 2", min: 40, max: 44, label: "Master 2 (40-44 ans)" },
  { key: "Master 3", min: 45, max: 49, label: "Master 3 (45-49 ans)" },
  { key: "Master 4", min: 50, max: 150, label: "Master 4 (50+ ans)" },
] as const;

const adultWeightCategories = {
  MALE: ["-56 kg", "-62 kg", "-69 kg", "-77 kg", "-85 kg", "-94 kg", "+94 kg"],
  FEMALE: ["-45 kg", "-48 kg", "-52 kg", "-57 kg", "-63 kg", "-70 kg", "+70 kg"],
} as const;

const juvenileWeightCategories = {
  U18: {
    MALE: ["-48 kg", "-52 kg", "-56 kg", "-62 kg", "-69 kg", "-77 kg", "-85 kg", "+85 kg"],
    FEMALE: ["-40 kg", "-44 kg", "-48 kg", "-52 kg", "-57 kg", "-63 kg", "-70 kg", "+70 kg"],
  },
  U16: {
    MALE: ["-40 kg", "-44 kg", "-48 kg", "-52 kg", "-56 kg", "-62 kg", "-69 kg", "-77 kg", "+77 kg"],
    FEMALE: ["-36 kg", "-40 kg", "-44 kg", "-48 kg", "-52 kg", "-57 kg", "-63 kg", "-68 kg", "+68 kg"],
  },
  U14: {
    MALE: ["-32 kg", "-36 kg", "-40 kg", "-44 kg", "-48 kg", "-52 kg", "-56 kg", "-62 kg", "-69 kg", "+69 kg"],
    FEMALE: ["-32 kg", "-36 kg", "-40 kg", "-44 kg", "-48 kg", "-52 kg", "-57 kg", "-63 kg", "+63 kg"],
  },
  U12: {
    MALE: ["-25 kg", "-28 kg", "-32 kg", "-36 kg", "-40 kg", "-44 kg", "-48 kg", "-52 kg", "+52 kg"],
    FEMALE: ["-25 kg", "-28 kg", "-32 kg", "-36 kg", "-40 kg", "-44 kg", "-48 kg", "-52 kg", "+52 kg"],
  },
  U10: {
    MALE: ["-22 kg", "-25 kg", "-28 kg", "-32 kg", "-36 kg", "-40 kg", "-44 kg", "+44 kg"],
    FEMALE: ["-22 kg", "-25 kg", "-28 kg", "-32 kg", "-36 kg", "-40 kg", "-44 kg", "+44 kg"],
  },
  U8: {
    MALE: ["-20 kg", "-22 kg", "-25 kg", "-28 kg", "-32 kg", "+32 kg"],
    FEMALE: ["-20 kg", "-22 kg", "-25 kg", "-28 kg", "-32 kg", "+32 kg"],
  },
} as const;

const adultThresholds: Record<Gender, number[]> = {
  MALE: [56, 62, 69, 77, 85, 94],
  FEMALE: [45, 48, 52, 57, 63, 70],
};

const juvenileThresholds: Record<Exclude<keyof typeof juvenileWeightCategories, never>, Record<Gender, number[]>> = {
  U18: {
    MALE: [48, 52, 56, 62, 69, 77, 85],
    FEMALE: [40, 44, 48, 52, 57, 63, 70],
  },
  U16: {
    MALE: [40, 44, 48, 52, 56, 62, 69, 77],
    FEMALE: [36, 40, 44, 48, 52, 57, 63, 68],
  },
  U14: {
    MALE: [32, 36, 40, 44, 48, 52, 56, 62, 69],
    FEMALE: [32, 36, 40, 44, 48, 52, 57, 63],
  },
  U12: {
    MALE: [25, 28, 32, 36, 40, 44, 48, 52],
    FEMALE: [25, 28, 32, 36, 40, 44, 48, 52],
  },
  U10: {
    MALE: [22, 25, 28, 32, 36, 40, 44],
    FEMALE: [22, 25, 28, 32, 36, 40, 44],
  },
  U8: {
    MALE: [20, 22, 25, 28, 32],
    FEMALE: [20, 22, 25, 28, 32],
  },
};

export function calculateAge(referenceDate: Date, dateOfBirth: Date) {
  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = referenceDate.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && referenceDate.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

export function getAgeGroup(dateOfBirth: Date, championshipDate: Date) {
  const age = calculateAge(championshipDate, dateOfBirth);

  if (age >= 6 && age <= 7) return ageGroupRanges[0];
  if (age >= 8 && age <= 9) return ageGroupRanges[1];
  if (age >= 10 && age <= 11) return ageGroupRanges[2];
  if (age >= 12 && age <= 13) return ageGroupRanges[3];
  if (age >= 14 && age <= 15) return ageGroupRanges[4];
  if (age >= 16 && age <= 17) return ageGroupRanges[5];
  if (age >= 18 && age <= 20) return ageGroupRanges[6];
  if (age >= 21 && age <= 34) return ageGroupRanges[7];
  if (age >= 35 && age <= 39) return ageGroupRanges[8];
  if (age >= 40 && age <= 44) return ageGroupRanges[9];
  if (age >= 45 && age <= 49) return ageGroupRanges[10];
  if (age >= 50) return ageGroupRanges[11];

  return { key: "Not eligible", min: 0, max: 0, label: "Non éligible" } as const;
}

export function getWeightCategory(ageGroupKey: string, gender: Gender, currentWeight: number) {
  const thresholds = ageGroupKey === "U8" || ageGroupKey === "U10" || ageGroupKey === "U12" || ageGroupKey === "U14" || ageGroupKey === "U16" || ageGroupKey === "U18"
    ? juvenileThresholds[ageGroupKey as keyof typeof juvenileThresholds][gender]
    : adultThresholds[gender];

  const labels = ageGroupKey === "U8" || ageGroupKey === "U10" || ageGroupKey === "U12" || ageGroupKey === "U14" || ageGroupKey === "U16" || ageGroupKey === "U18"
    ? juvenileWeightCategories[ageGroupKey as keyof typeof juvenileWeightCategories][gender]
    : adultWeightCategories[gender];

  for (let index = 0; index < thresholds.length; index += 1) {
    if (currentWeight <= thresholds[index]) {
      return labels[index];
    }
  }

  return labels[labels.length - 1];
}

function isYouthAgeGroup(ageGroupKey: string) {
  return ["U8", "U10", "U12", "U14", "U16", "U18", "U21"].includes(ageGroupKey);
}

function resolvePricingProfile(ageGroupKey: string | undefined, profile: PricingProfile | undefined) {
  if (profile && profile !== "AUTO") return profile;
  if (!ageGroupKey) return "YOUTH";
  return isYouthAgeGroup(ageGroupKey) ? "YOUTH" : "ADULT";
}

function pairAmount(count: number, singlePrice: number, pairPrice: number) {
  if (count <= 0) return 0;
  if (count === 1) return singlePrice;
  return pairPrice;
}

export function calculateTuition(
  selectedDisciplines: DisciplineKey[],
  pricing: PricingConfig = defaultPricing,
  ageGroupKey?: string,
) {
  const profile = resolvePricingProfile(ageGroupKey, pricing.profile);
  const youthSinglePrice = pricing.youthSinglePrice ?? defaultPairPricing.youthSinglePrice;
  const youthPairPrice = pricing.youthPairPrice ?? defaultPairPricing.youthPairPrice;
  const adultSinglePrice = pricing.adultSinglePrice ?? defaultPairPricing.adultSinglePrice;
  const adultPairPrice = pricing.adultPairPrice ?? defaultPairPricing.adultPairPrice;

  const hasPairPricing =
    pricing.profile != null ||
    pricing.youthSinglePrice != null ||
    pricing.youthPairPrice != null ||
    pricing.adultSinglePrice != null ||
    pricing.adultPairPrice != null;

  if (!hasPairPricing) {
    return selectedDisciplines.reduce((sum, discipline) => sum + (pricing[discipline] ?? defaultPricing[discipline]), 0);
  }

  const singlePrice = profile === "YOUTH" ? youthSinglePrice : adultSinglePrice;
  const pairPrice = profile === "YOUTH" ? youthPairPrice : adultPairPrice;

  const duoFightingCount = Number(selectedDisciplines.includes("fighting")) + Number(selectedDisciplines.includes("duel"));
  const nawazaCount = Number(selectedDisciplines.includes("nawazaGi")) + Number(selectedDisciplines.includes("nawazaNog"));

  return pairAmount(duoFightingCount, singlePrice, pairPrice) + pairAmount(nawazaCount, singlePrice, pairPrice);
}

export function formatAgeGroupLabel(key: string) {
  const found = ageGroupRanges.find((entry) => entry.key === key);
  return found?.label ?? key;
}

export function isJujitsuChampionshipDiscipline(discipline: string) {
  return ["fighting", "duel", "duo", "nawazaNog", "nawazaGi"].includes(discipline);
}

export const championshipDisciplineOptions: Array<{ key: DisciplineKey; label: string; description: string }> = [
  { key: "fighting", label: "Fighting System", description: "Combats debout et au sol selon le règlement du championnat." },
  { key: "duel", label: "Duo System", description: "Forme technique à deux pour les démonstrations et l'évaluation." },
  { key: "nawazaNog", label: "Nawaza No-Gi", description: "Combat au sol sans kimono." },
  { key: "nawazaGi", label: "Nawaza Gi", description: "Combat au sol avec kimono." },
];
