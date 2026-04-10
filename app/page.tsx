"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  calculateAge,
  calculateTuition,
  championshipDisciplineOptions,
  defaultPairPricing,
  defaultPricing,
  disciplineLabels,
  formatAgeGroupLabel,
  getAgeGroup,
  getWeightCategory,
  type DisciplineKey,
  type PricingProfile,
} from "@/lib/jujitsu";
import { aikidoLogo, jujitsuLogo } from "@/lib/logos";

type Athlete = {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  currentWeight: number;
  heightCm: number | null;
  clubName: string;
  phone: string | null;
  emergencyContact: string | null;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
};

type Championship = {
  id: string;
  name: string;
  league: string;
  type: "REGIONAL" | "NATIONAL";
  status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
  eventDate: string;
  location: string;
  enabledDisciplines: DisciplineKey[];
  pricing: ChampionshipPricing;
  notes: string | null;
  createdAt: string;
};

type ChampionshipPricing = Partial<Record<DisciplineKey, number>> & {
  profile?: PricingProfile;
  youthSinglePrice?: number;
  youthPairPrice?: number;
  adultSinglePrice?: number;
  adultPairPrice?: number;
};

type Registration = {
  id: string;
  athleteId: string;
  championshipId: string;
  selectedDisciplines: Array<DisciplineKey | "FS" | "DS" | "NAWAZA_GI" | "NAWAZA_NOGI">;
  ageGroup: string;
  weightCategory: string;
  tuitionAmount: number;
  status: "PENDING" | "CONFIRMED" | "APPROVED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
  athlete: Athlete;
  championship: Championship;
  payment: Payment | null;
};

type Payment = {
  id: string;
  registrationId: string;
  amountDue: number;
  amountPaid: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  paidAt: string | null;
  note: string | null;
  createdAt: string;
  registration?: Registration;
};

type Medal = {
  id: string;
  athleteId: string;
  championshipId: string;
  categoryLabel: string;
  placement: number;
  medalType: "GOLD" | "SILVER" | "BRONZE";
  createdAt: string;
  athlete: Athlete;
  championship: Championship;
};

type CertificateRecord = {
  id: string;
  athleteId: string | null;
  championshipId: string | null;
  studentName: string;
  rank: string;
  date: string;
  location: string;
  discipline: "JUJITSU" | "AIKIDO";
  createdAt: string;
  athlete: Athlete | null;
  championship: Championship | null;
};

type DashboardData = {
  athletes: Athlete[];
  championships: Championship[];
  registrations: Registration[];
  payments: Payment[];
  medals: Medal[];
  certificates: CertificateRecord[];
  notifications: Array<{
    id: string;
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    title: string;
    message: string;
    entityType: string | null;
    entityId: string | null;
    isRead: boolean;
    createdAt: string;
    readAt: string | null;
  }>;
  activityLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    summary: string;
    details: unknown;
    createdAt: string;
  }>;
  stats: {
    totalAthletes: number;
    totalChampionships: number;
    totalRegistrations: number;
    totalMedals: number;
    totalCertificates: number;
    totalNotifications: number;
    unreadNotifications: number;
    totalExpected: number;
    totalReceived: number;
    outstandingBalance: number;
    unpaidCount: number;
    partialCount: number;
    paidCount: number;
  };
};

type Toast = {
  type: "success" | "error" | "info";
  text: string;
} | null;

type ListLimitKey = "athletes" | "championships" | "registrations" | "payments" | "certificates";

type PaginationParams = {
  page: number;
  itemsPerPage: number | "all";
};

type PaginationState = Record<ListLimitKey, PaginationParams>;

const defaultPaginationState: PaginationState = {
  athletes: { page: 1, itemsPerPage: 10 },
  championships: { page: 1, itemsPerPage: 10 },
  registrations: { page: 1, itemsPerPage: 10 },
  payments: { page: 1, itemsPerPage: 10 },
  certificates: { page: 1, itemsPerPage: 10 },
};

const tabs = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "athletes", label: "Athlètes" },
  { id: "championships", label: "Championnats" },
  { id: "registrations", label: "Inscriptions & paiements" },
  { id: "certificates", label: "Certificats" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type AthleteForm = {
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  currentWeight: string;
  heightCm: string;
  clubName: string;
  phone: string;
  emergencyContact: string;
  photoUrl: string;
  notes: string;
};

type ChampionshipForm = {
  name: string;
  league: string;
  type: "REGIONAL" | "NATIONAL";
  status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED";
  eventDate: string;
  location: string;
  pricingProfile: PricingProfile;
  youthSinglePrice: string;
  youthPairPrice: string;
  adultSinglePrice: string;
  adultPairPrice: string;
  notes: string;
  enabledDisciplines: DisciplineKey[];
};

type RegistrationForm = {
  athleteId: string;
  championshipId: string;
  selectedDisciplines: DisciplineKey[];
  notes: string;
};

type PaymentForm = {
  registrationId: string;
  amountPaid: string;
  note: string;
};

type CertificateForm = {
  athleteId: string;
  studentName: string;
  rank: string;
  date: string;
  location: string;
  discipline: "Jujitsu" | "Aïkido";
};

const certificateModes = [
  {
    value: "Jujitsu",
    label: "Jujitsu",
    description: "Certificat principal du Budokan, lié à la base Jujitsu.",
    logo: jujitsuLogo,
  },
  {
    value: "Aïkido",
    label: "Aïkido",
    description: "Certificat conservé pour les anciens templates existants.",
    logo: aikidoLogo,
  },
] as const;

const defaultAthleteForm: AthleteForm = {
  fullName: "",
  dateOfBirth: "",
  gender: "MALE",
  currentWeight: "",
  heightCm: "",
  clubName: "Budokan du Maroc",
  phone: "",
  emergencyContact: "",
  photoUrl: "",
  notes: "",
};

const defaultChampionshipForm: ChampionshipForm = {
  name: "",
  league: "Casablanca-Settat",
  type: "REGIONAL",
  status: "DRAFT",
  eventDate: "",
  location: "Casablanca, Maroc",
  pricingProfile: defaultPairPricing.profile,
  youthSinglePrice: String(defaultPairPricing.youthSinglePrice),
  youthPairPrice: String(defaultPairPricing.youthPairPrice),
  adultSinglePrice: String(defaultPairPricing.adultSinglePrice),
  adultPairPrice: String(defaultPairPricing.adultPairPrice),
  notes: "",
  enabledDisciplines: ["fighting", "duel", "nawazaNog", "nawazaGi"],
};

const defaultRegistrationForm: RegistrationForm = {
  athleteId: "",
  championshipId: "",
  selectedDisciplines: ["fighting"],
  notes: "",
};

const defaultPaymentForm: PaymentForm = {
  registrationId: "",
  amountPaid: "",
  note: "",
};

const defaultCertificateForm: CertificateForm = {
  athleteId: "",
  studentName: "",
  rank: "Blanche",
  date: "",
  location: "Casablanca",
  discipline: "Jujitsu",
};

const ranks = [
  "Blanche",
  "Blanche - Jaune",
  "Jaune",
  "Jaune - Orange",
  "Orange",
  "Orange - Verte",
  "Verte",
  "Verte - Bleue",
  "Bleue",
  "Bleue - Marron",
  "Marron",
  "Noire - 1er Dan",
  "Noire - 2ème Dan",
  "Noire - 3ème Dan",
  "Noire - 4ème Dan",
  "Noire - 5ème Dan",
  "Noire - 6ème Dan",
  "Noire - 7ème Dan",
  "Noire - 8ème Dan",
];

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(amount);

const toYmd = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromYmd = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const formatDateFieldLabel = (value: string) => {
  if (!value) return "dd-mm-yyyy";
  const parsed = fromYmd(value);
  if (!parsed) return "dd-mm-yyyy";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${parsed.getFullYear()}`;
};

function mapSelectedDisciplines(disciplines: Array<DisciplineKey | "FS" | "DS" | "NAWAZA_GI" | "NAWAZA_NOGI">) {
  if (!Array.isArray(disciplines) || disciplines.length === 0) return "—";

  const aliases: Record<string, string> = {
    FS: "fighting",
    DS: "duel",
    NAWAZA_GI: "nawazaGi",
    NAWAZA_NOGI: "nawazaNog",
  };

  const labels = disciplines
    .map((discipline) => aliases[String(discipline)] ?? String(discipline))
    .map((discipline) => disciplineLabels[discipline as DisciplineKey] ?? discipline)
    .filter(Boolean);

  return labels.length ? labels.join(" • ") : "—";
}

function toFormDiscipline(value: string): DisciplineKey | null {
  const aliases: Record<string, DisciplineKey> = {
    FS: "fighting",
    DS: "duel",
    NAWAZA_GI: "nawazaGi",
    NAWAZA_NOGI: "nawazaNog",
  };
  const normalized = aliases[value] ?? value;
  return ["fighting", "duel", "nawazaGi", "nawazaNog"].includes(normalized)
    ? normalized as DisciplineKey
    : null;
}

function statusTone(status: string) {
  if (status === "PAID" || status === "SUCCESS") return "bg-emerald-100 text-emerald-900";
  if (status === "PARTIAL" || status === "WARNING") return "bg-amber-100 text-amber-900";
  if (status === "ERROR" || status === "CANCELLED") return "bg-rose-100 text-rose-900";
  return "bg-sky-100 text-sky-900";
}

interface PaginationControlsProps {
  totalItems: number;
  sectionKey: ListLimitKey;
  pagination: PaginationState;
  onChangePagination: (key: ListLimitKey, newPage?: number, newItemsPerPage?: number | "all") => void;
}

function PaginationControls({ totalItems, sectionKey, pagination, onChangePagination }: PaginationControlsProps) {
  const { page, itemsPerPage } = pagination[sectionKey];
  const limit = itemsPerPage === "all" ? totalItems : itemsPerPage;
  const totalPages = Math.ceil(totalItems / limit);
  const [customInput, setCustomInput] = useState<string>(String(itemsPerPage === "all" ? totalItems : itemsPerPage));

  const handleCustomInput = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0 && num <= totalItems) {
      setCustomInput(value);
      onChangePagination(sectionKey, undefined, num);
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-[rgba(93,63,31,0.12)] bg-gradient-to-r from-stone-50 to-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Items Per Page Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-stone-700">Afficher par page:</span>
          
          {/* Preset Dropdown */}
          <select
            value={itemsPerPage === "all" ? "all" : String(itemsPerPage)}
            onChange={(e) => {
              const val = e.target.value;
              onChangePagination(sectionKey, undefined, val === "all" ? "all" : parseInt(val, 10));
              setCustomInput(val === "all" ? String(totalItems) : val);
            }}
            title="Choisir le nombre d'éléments par page"
            className="rounded-lg border-2 border-[rgba(93,63,31,0.16)] bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-[rgba(93,63,31,0.24)] transition focus:outline-none focus:border-stone-900"
          >
            <option value="10">10 éléments</option>
            <option value="20">20 éléments</option>
            <option value="50">50 éléments</option>
            <option value="all">Tout afficher</option>
          </select>

          {/* Custom Input */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-stone-600">ou</span>
            <input
              type="number"
              min="1"
              max={totalItems}
              value={customInput}
              onChange={(e) => handleCustomInput(e.target.value)}
              placeholder="Personnalisé"
              className="w-20 rounded-lg border-2 border-[rgba(184,148,71,0.2)] bg-white px-2 py-2 text-center text-sm font-medium text-stone-700 hover:border-[rgba(184,148,71,0.4)] transition focus:outline-none focus:border-[rgba(184,148,71,0.6)]"
            />
          </div>
        </div>

        {/* Info Text */}
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span className="font-medium">
            {Math.min((page - 1) * limit + 1, totalItems)}–{Math.min(page * limit, totalItems)} sur {totalItems}
          </span>
        </div>

        {/* Pagination Buttons */}
        {totalPages > 1 ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChangePagination(sectionKey, page > 1 ? page - 1 : page)}
              disabled={page === 1}
              className="rounded-lg border border-[rgba(93,63,31,0.16)] bg-white px-2.5 py-1.5 text-sm font-semibold uppercase text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Page précédente"
            >
              ←
            </button>

            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = page - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onChangePagination(sectionKey, pageNum)}
                    className={`w-8 h-8 rounded-lg border-2 text-xs font-bold transition ${
                      pageNum === page
                        ? "border-stone-900 bg-stone-900 text-white shadow-md"
                        : "border-[rgba(93,63,31,0.16)] bg-white text-stone-700 hover:border-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onChangePagination(sectionKey, page < totalPages ? page + 1 : page)}
              disabled={page === totalPages}
              className="rounded-lg border border-[rgba(93,63,31,0.16)] bg-white px-2.5 py-1.5 text-sm font-semibold uppercase text-stone-700 transition hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Page suivante"
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );}export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [athleteForm, setAthleteForm] = useState<AthleteForm>(defaultAthleteForm);
  const [championshipForm, setChampionshipForm] = useState<ChampionshipForm>(defaultChampionshipForm);
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(defaultRegistrationForm);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(defaultPaymentForm);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [replaceDataOnImport, setReplaceDataOnImport] = useState(true);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [editingChampionshipId, setEditingChampionshipId] = useState<string | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>(defaultPaginationState);
  const [certificateForm, setCertificateForm] = useState<CertificateForm>({
    ...defaultCertificateForm,
    date: new Date().toISOString().split("T")[0],
  });

  // Dashboard preview limits for abbreviated lists
  const listLimits = {
    championships: 6,
    registrations: 8,
    payments: 8,
    certificates: 8,
  };

  // Dashboard navigation
  const showMoreItems = (section: string) => {
    const tabMap: Record<string, TabId> = {
      championships: "championships",
      registrations: "registrations",
      payments: "registrations",
      certificates: "certificates",
    };
    if (tabMap[section]) setActiveTab(tabMap[section]);
  };

  const showFewerItems = (section: string, limit: number) => {
    // Placeholder for future collapse functionality
  };

  // Pagination URL helper functions
  const getPaginationFromUrl = (): PaginationState => {
    if (typeof window === "undefined") return defaultPaginationState;
    const params = new URLSearchParams(window.location.search);
    const result: PaginationState = { ...defaultPaginationState };

    Object.keys(result).forEach((key) => {
      const pageParam = params.get(`${key}_page`);
      const limitParam = params.get(`${key}_limit`);

      if (pageParam) {
        const page = parseInt(pageParam, 10);
        if (!isNaN(page) && page >= 1) {
          result[key as ListLimitKey].page = page;
        }
      }

      if (limitParam) {
        const limit = limitParam === "all" ? "all" : parseInt(limitParam, 10);
        if (limit === "all" || (!isNaN(limit as number) && (limit as number) >= 1 && (limit as number) <= 1000)) {
          result[key as ListLimitKey].itemsPerPage = limit;
        }
      }
    });

    return result;
  };

  const updatePaginationUrl = (newPagination: PaginationState) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    Object.keys(newPagination).forEach((key) => {
      const pag = newPagination[key as ListLimitKey];
      params.set(`${key}_page`, String(pag.page));
      params.set(`${key}_limit`, String(pag.itemsPerPage));
    });

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  };

  const changePagination = (key: ListLimitKey, newPage?: number, newItemsPerPage?: number | "all") => {
    setPagination((current) => {
      const updated = { ...current };
      if (newPage !== undefined) updated[key].page = newPage;
      if (newItemsPerPage !== undefined) {
        const numValue = newItemsPerPage === "all" ? "all" : Math.max(1, Math.min(newItemsPerPage, 1000));
        updated[key].itemsPerPage = numValue;
        updated[key].page = 1; // Reset to page 1 when changing items per page
      }
      updatePaginationUrl(updated);
      return updated;
    });
  };

  const calculatePaginationBounds = (totalItems: number, key: ListLimitKey) => {
    const { page, itemsPerPage } = pagination[key];
    const limit = itemsPerPage === "all" ? totalItems : itemsPerPage;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, totalItems);

    return { startIndex, endIndex, totalPages, itemsPerPage: limit, currentPage: page };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    const isValidTab = tabs.some((tab) => tab.id === requestedTab);
    if (requestedTab && isValidTab) {
      setActiveTab(requestedTab as TabId);
    }

    // Initialize pagination from URL
    setPagination(getPaginationFromUrl());
  }, []);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    params.set("tab", tabId);
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  };

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || payload.details || "Impossible de charger le tableau de bord.");
      }
      const data = (await response.json()) as DashboardData;
      setDashboard(data);
    } catch (error) {
      console.error(error);
      setToast({
        type: "error",
        text: error instanceof Error
          ? `Chargement impossible: ${error.message}`
          : "La base de données n'a pas pu être lue. Vérifiez la configuration Prisma et la connexion PostgreSQL.",
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!dashboard) return;

    setRegistrationForm((current) => ({
      ...current,
      athleteId: current.athleteId || dashboard.athletes[0]?.id || "",
      championshipId: current.championshipId || dashboard.championships[0]?.id || "",
    }));

    setPaymentForm((current) => ({
      ...current,
      registrationId: current.registrationId || dashboard.registrations[0]?.id || "",
    }));

    setCertificateForm((current) => ({
      ...current,
      athleteId: current.athleteId || dashboard.athletes[0]?.id || "",
      studentName: current.studentName || dashboard.athletes[0]?.fullName || "",
    }));
  }, [dashboard]);

  useEffect(() => {
    const selectedAthlete = dashboard?.athletes.find((athlete) => athlete.id === certificateForm.athleteId);
    if (selectedAthlete && !certificateForm.studentName) {
      setCertificateForm((current) => ({ ...current, studentName: selectedAthlete.fullName }));
    }
  }, [certificateForm.athleteId, dashboard, certificateForm.studentName]);

  const handleAthleteChange = (field: keyof AthleteForm, value: string) => {
    setAthleteForm((current) => ({ ...current, [field]: value }));
  };

  const handleChampionshipChange = (field: keyof ChampionshipForm, value: string) => {
    setChampionshipForm((current) => ({ ...current, [field]: value }));
  };

  const handleRegistrationChange = (field: keyof RegistrationForm, value: string) => {
    setRegistrationForm((current) => ({ ...current, [field]: value }));
  };

  const handlePaymentChange = (field: keyof PaymentForm, value: string) => {
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const handleCertificateChange = (field: keyof CertificateForm, value: string) => {
    setCertificateForm((current) => ({ ...current, [field]: value }));
  };

  const toggleRegistrationDiscipline = (discipline: DisciplineKey) => {
    setRegistrationForm((current) => {
      const selected = current.selectedDisciplines.includes(discipline)
        ? current.selectedDisciplines.filter((item) => item !== discipline)
        : [...current.selectedDisciplines, discipline];

      return {
        ...current,
        selectedDisciplines: selected.length ? selected : [discipline],
      };
    });
  };

  const refreshDashboard = async () => {
    await loadDashboard();
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      await refreshDashboard();
      setToast({ type: "success", text: "Toutes les notifications ont été marquées comme lues." });
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: "Impossible de mettre à jour les notifications." });
    }
  };

  const handleAthleteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading("athlete");
    setToast(null);

    try {
      const response = await fetch("/api/athletes", {
        method: editingAthleteId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAthleteId ? { ...athleteForm, id: editingAthleteId } : athleteForm),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Erreur lors de la création de l'athlète.");
      }

      setAthleteForm(defaultAthleteForm);
      setEditingAthleteId(null);
      setToast({ type: "success", text: editingAthleteId ? "Athlète mis à jour avec succès." : "Athlète enregistré avec succès." });
      await refreshDashboard();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChampionshipSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading("championship");
    setToast(null);

    try {
      const response = await fetch("/api/championships", {
        method: editingChampionshipId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingChampionshipId ? { ...championshipForm, id: editingChampionshipId } : championshipForm),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Erreur lors de la création du championnat.");
      }

      setChampionshipForm(defaultChampionshipForm);
      setEditingChampionshipId(null);
      setToast({ type: "success", text: editingChampionshipId ? "Championnat mis à jour." : "Championnat créé et configuré." });
      await refreshDashboard();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegistrationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading("registration");
    setToast(null);

    try {
      const response = await fetch("/api/registrations", {
        method: editingRegistrationId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRegistrationId ? {
          id: editingRegistrationId,
          selectedDisciplines: registrationForm.selectedDisciplines,
          notes: registrationForm.notes,
          status: "PENDING",
        } : registrationForm),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Erreur lors de l'inscription.");
      }

      setRegistrationForm(defaultRegistrationForm);
      setEditingRegistrationId(null);
      setToast({ type: "success", text: editingRegistrationId ? "Inscription mise à jour." : "Inscription créée et paiement initial mis en attente." });
      await refreshDashboard();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading("payment");
    setToast(null);

    try {
      const response = await fetch("/api/payments", {
        method: editingPaymentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPaymentId
          ? { id: editingPaymentId, amountPaid: paymentForm.amountPaid, note: paymentForm.note }
          : paymentForm),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Erreur lors de l'enregistrement du paiement.");
      }

      setPaymentForm(defaultPaymentForm);
      setEditingPaymentId(null);
      setToast({ type: "success", text: editingPaymentId ? "Paiement mis à jour." : "Paiement enregistré manuellement." });
      await refreshDashboard();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCertificateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading("certificate");
    setToast(null);

    try {
      if (editingCertificateId) {
        const response = await fetch("/api/certificates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCertificateId,
            studentName: certificateForm.studentName,
            rank: certificateForm.rank,
            date: certificateForm.date,
            location: certificateForm.location,
            discipline: certificateForm.discipline === "Aïkido" ? "AIKIDO" : "JUJITSU",
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Erreur lors de la mise à jour du certificat.");
        }

        setEditingCertificateId(null);
        setToast({ type: "success", text: "Certificat mis à jour." });
      } else {
        const response = await fetch("/api/generate-certificate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(certificateForm),
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error || "Erreur lors de la génération du certificat.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        const safeStudentName = (certificateForm.studentName || "sans_nom").replace(/\s+/g, "_");
        anchor.download = `Certificat_${certificateForm.discipline}_${safeStudentName}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(anchor);

        setToast({ type: "success", text: "Certificat généré et téléchargé." });
      }

      await refreshDashboard();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlankCertificateDownload = async () => {
    setActionLoading("certificate");
    setToast(null);

    try {
      const response = await fetch("/api/generate-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: "",
          rank: "",
          date: "",
          location: "Casablanca",
          discipline: certificateForm.discipline,
          athleteId: null,
          championshipId: null,
          isBlankTemplate: true,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Erreur lors du téléchargement du modèle vide.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Certificat_${certificateForm.discipline}_modele_vide.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      setToast({ type: "success", text: "Modèle vide téléchargé." });
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePdfImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setToast(null);

    if (!importFile) {
      setToast({ type: "error", text: "Veuillez choisir un fichier PDF a importer." });
      return;
    }

    setActionLoading("pdf-import");
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("clearExisting", String(replaceDataOnImport));
      formData.append("createRegistrations", "true");

      const response = await fetch("/api/import-pdf", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || payload.details || "Import PDF echoue.");
      }

      const warnings = Array.isArray(payload?.result?.warnings) ? payload.result.warnings.length : 0;
      setToast({
        type: "success",
        text: `Import termine: ${payload.result?.createdAthletes ?? 0} athletes, ${payload.result?.createdRegistrations ?? 0} inscriptions.${warnings ? ` Avertissements: ${warnings}.` : ""}`,
      });
      setImportFile(null);
      await refreshDashboard();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur inconnue." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAthlete = async (id: string) => {
    if (!window.confirm("Supprimer cet athlète ?")) return;
    try {
      const response = await fetch(`/api/athletes?id=${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Suppression impossible.");
      if (editingAthleteId === id) {
        setEditingAthleteId(null);
        setAthleteForm(defaultAthleteForm);
      }
      await refreshDashboard();
      setToast({ type: "success", text: "Athlète supprimé." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur de suppression." });
    }
  };

  const handleDeleteChampionship = async (id: string) => {
    if (!window.confirm("Supprimer ce championnat ?")) return;
    try {
      const response = await fetch(`/api/championships?id=${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Suppression impossible.");
      if (editingChampionshipId === id) {
        setEditingChampionshipId(null);
        setChampionshipForm(defaultChampionshipForm);
      }
      await refreshDashboard();
      setToast({ type: "success", text: "Championnat supprimé." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur de suppression." });
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm("Supprimer cette inscription ?")) return;
    try {
      const response = await fetch(`/api/registrations?id=${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Suppression impossible.");
      if (editingRegistrationId === id) {
        setEditingRegistrationId(null);
        setRegistrationForm(defaultRegistrationForm);
      }
      await refreshDashboard();
      setToast({ type: "success", text: "Inscription supprimée." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur de suppression." });
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm("Supprimer ce paiement ?")) return;
    try {
      const response = await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Suppression impossible.");
      if (editingPaymentId === id) {
        setEditingPaymentId(null);
        setPaymentForm(defaultPaymentForm);
      }
      await refreshDashboard();
      setToast({ type: "success", text: "Paiement supprimé." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur de suppression." });
    }
  };

  const handleDeleteCertificate = async (id: string) => {
    if (!window.confirm("Supprimer ce certificat ?")) return;
    try {
      const response = await fetch(`/api/certificates?id=${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Suppression impossible.");
      if (editingCertificateId === id) {
        setEditingCertificateId(null);
      }
      await refreshDashboard();
      setToast({ type: "success", text: "Certificat supprimé." });
    } catch (error) {
      setToast({ type: "error", text: error instanceof Error ? error.message : "Erreur de suppression." });
    }
  };

  const selectedAthlete = dashboard?.athletes.find((athlete) => athlete.id === registrationForm.athleteId);
  const selectedChampionship = dashboard?.championships.find((championship) => championship.id === registrationForm.championshipId);
  const registrationAgeGroup = selectedAthlete && selectedChampionship ? getAgeGroup(new Date(selectedAthlete.dateOfBirth), new Date(selectedChampionship.eventDate)) : null;
  const championshipPricing = (selectedChampionship?.pricing ?? defaultPricing) as ChampionshipPricing;
  const isYouthRegistration = registrationAgeGroup ? ["U8", "U10", "U12", "U14", "U16", "U18", "U21"].includes(registrationAgeGroup.key) : true;
  const resolvedPricingProfile = championshipPricing.profile && championshipPricing.profile !== "AUTO"
    ? championshipPricing.profile
    : (isYouthRegistration ? "YOUTH" : "ADULT");
  const effectiveSinglePrice = resolvedPricingProfile === "YOUTH"
    ? (championshipPricing.youthSinglePrice ?? defaultPairPricing.youthSinglePrice)
    : (championshipPricing.adultSinglePrice ?? defaultPairPricing.adultSinglePrice);
  const effectivePairPrice = resolvedPricingProfile === "YOUTH"
    ? (championshipPricing.youthPairPrice ?? defaultPairPricing.youthPairPrice)
    : (championshipPricing.adultPairPrice ?? defaultPairPricing.adultPairPrice);
  const registrationFee = selectedChampionship
    ? calculateTuition(registrationForm.selectedDisciplines, championshipPricing, registrationAgeGroup?.key)
    : 0;
  const registrationWeightCategory = selectedAthlete && registrationAgeGroup && registrationAgeGroup.key !== "Not eligible"
    ? getWeightCategory(registrationAgeGroup.key, selectedAthlete.gender, selectedAthlete.currentWeight)
    : null;
  const athletePreviewAge = athleteForm.dateOfBirth ? calculateAge(new Date(), new Date(athleteForm.dateOfBirth)) : null;
  const athletePreviewCategory = athleteForm.dateOfBirth ? getAgeGroup(new Date(athleteForm.dateOfBirth), new Date()) : null;
  const athletePreviewWeight = athleteForm.dateOfBirth
    ? getWeightCategory(athletePreviewCategory?.key ?? "U10", athleteForm.gender, Number(athleteForm.currentWeight || 0))
    : null;

  return (
    <main className="min-h-screen px-4 py-6 text-[var(--accent-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[112rem] items-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_100px_rgba(49,29,10,0.18)] backdrop-blur-xl">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(184,148,71,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(143,31,31,0.16),_transparent_24%)] px-6 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center -space-x-3">
                    <div className="flex aspect-square h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[rgba(184,148,71,0.45)] bg-white p-1 shadow-[0_10px_24px_rgba(49,29,10,0.18)]">
                      <Image src={jujitsuLogo} alt="Jujitsu" width={64} height={64} className="h-full w-full flex-shrink-0 rounded-full object-cover" />
                    </div>
                    <div className="flex aspect-square h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[rgba(143,31,31,0.38)] bg-white p-1 shadow-[0_10px_24px_rgba(49,29,10,0.18)]">
                      <Image src={aikidoLogo} alt="Aikido" width={56} height={56} className="h-full w-full flex-shrink-0 rounded-full object-cover" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">Budokan du Maroc</p>
                    <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Centre de gestion Jujitsu</h1>
                  </div>
                </div>
                <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
                  Gestion des athlètes, championnats, inscriptions, paiements et certificats. L&apos;application est pensée pour l&apos;administration interne du club, avec le Jujitsu comme cœur métier et l&apos;Aïkido conservé uniquement pour la génération de certificats.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Athlètes" value={loadingDashboard ? "..." : String(dashboard?.stats.totalAthletes ?? 0)} />
                <StatCard label="Championnats" value={loadingDashboard ? "..." : String(dashboard?.stats.totalChampionships ?? 0)} />
                <StatCard label="Inscriptions" value={loadingDashboard ? "..." : String(dashboard?.stats.totalRegistrations ?? 0)} />
                <StatCard label="Paiements reçus" value={loadingDashboard ? "..." : String(dashboard?.stats.paidCount ?? 0)} />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.id
                      ? "border-transparent bg-stone-900 text-white shadow-[0_10px_24px_rgba(17,17,17,0.18)]"
                      : "border-[rgba(93,63,31,0.12)] bg-white/80 text-stone-700 hover:-translate-y-0.5 hover:border-[rgba(143,31,31,0.2)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {toast ? (
            <div className={`mx-6 mt-6 rounded-2xl border px-4 py-3 text-sm sm:mx-8 lg:mx-10 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : toast.type === "info" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
              {toast.text}
            </div>
          ) : null}

          <div className="px-6 py-6 sm:px-8 lg:px-10 lg:py-8 xl:px-14">
            {activeTab === "dashboard" ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard title="Total athlètes" value={String(dashboard?.stats.totalAthletes ?? 0)} subtitle="Base club active" />
                  <InfoCard title="Balance à encaisser" value={formatMoney(dashboard?.stats.outstandingBalance ?? 0)} subtitle="Paiements manuels" />
                  <InfoCard title="Certificats générés" value={String(dashboard?.stats.totalCertificates ?? 0)} subtitle="Historique conservé" />
                  <InfoCard title="Notifications" value={String(dashboard?.stats.unreadNotifications ?? 0)} subtitle="À traiter maintenant" />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <Panel title="Raccourcis métiers" subtitle="Ce que l'administration peut faire maintenant">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <MiniAction title="Créer un athlète" text="Nom, naissance, poids, club et contact d'urgence." />
                      <MiniAction title="Lancer un championnat" text="National ou régional avec tarifs configurables." />
                      <MiniAction title="Enregistrer une inscription" text="Catégorisation et montant calculés automatiquement." />
                      <MiniAction title="Marquer un paiement" text="Paiement manuel sans système digital." />
                    </div>
                  </Panel>

                  <Panel title="Situation financière" subtitle="Suivi rapide des entrées">
                    <div className="space-y-4 text-sm text-stone-700">
                      <Row label="Total attendu" value={formatMoney(dashboard?.stats.totalExpected ?? 0)} />
                      <Row label="Total reçu" value={formatMoney(dashboard?.stats.totalReceived ?? 0)} />
                      <Row label="Impayés" value={String(dashboard?.stats.unpaidCount ?? 0)} />
                      <Row label="Partiels" value={String(dashboard?.stats.partialCount ?? 0)} />
                      <Row label="Payés" value={String(dashboard?.stats.paidCount ?? 0)} />
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Panel title="Derniers championnats" subtitle="Historique de création">
                    <div className="space-y-3">
                      {(dashboard?.championships ?? []).slice(0, 4).map((championship) => (
                        <div key={championship.id} className="rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-900">{championship.name}</p>
                              <p className="text-xs text-stone-500">{championship.league} • {championship.type}</p>
                            </div>
                            <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                              {championship.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {!dashboard?.championships.length ? <EmptyHint text="Aucun championnat encore créé." /> : null}
                    </div>
                  </Panel>

                  <Panel title="Dernières inscriptions" subtitle="Associations athlète + championnat">
                    <div className="space-y-3">
                      {(dashboard?.registrations ?? []).slice(0, 4).map((registration) => (
                        <div key={registration.id} className="rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-900">{registration.athlete.fullName}</p>
                              <p className="text-xs text-stone-500">{registration.championship.name}</p>
                            </div>
                            <span className="rounded-full border border-[rgba(143,31,31,0.18)] bg-[rgba(143,31,31,0.08)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                              {formatMoney(registration.tuitionAmount)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-stone-600">{formatAgeGroupLabel(registration.ageGroup)} • {registration.weightCategory}</p>
                        </div>
                      ))}
                      {!dashboard?.registrations.length ? <EmptyHint text="Aucune inscription enregistrée." /> : null}
                    </div>
                  </Panel>

                  <Panel title="Certificats récents" subtitle="Jujitsu ou Aïkido">
                    <div className="space-y-3">
                      {(dashboard?.certificates ?? []).slice(0, 4).map((certificate) => (
                        <div key={certificate.id} className="rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4 text-sm">
                          <p className="font-semibold text-stone-900">{certificate.studentName}</p>
                          <p className="text-xs text-stone-500">{certificate.rank} • {certificate.discipline}</p>
                        </div>
                      ))}
                      {!dashboard?.certificates.length ? <EmptyHint text="Aucun certificat généré." /> : null}
                    </div>
                  </Panel>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <Panel title="Notifications" subtitle="Gestion des alertes internes">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-stone-600">{dashboard?.stats.unreadNotifications ?? 0} non lues</p>
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className="rounded-full border border-[rgba(93,63,31,0.12)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:border-[rgba(143,31,31,0.22)] hover:text-stone-900"
                      >
                        Tout marquer comme lu
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(dashboard?.notifications ?? []).slice(0, 6).map((notification) => (
                        <div key={notification.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-900">{notification.title}</p>
                              <p className="mt-1 text-sm text-stone-600">{notification.message}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(notification.type)}`}>
                              {notification.isRead ? "Lue" : "Nouvelle"}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-stone-500">{formatDate(notification.createdAt)} • {notification.entityType ?? "Système"}</p>
                        </div>
                      ))}
                      {!dashboard?.notifications.length ? <EmptyHint text="Aucune notification disponible." /> : null}
                    </div>
                  </Panel>

                  <Panel title="Journal d'activité" subtitle="Historique complet des actions">
                    <div className="space-y-3">
                      {(dashboard?.activityLogs ?? []).slice(0, 6).map((log) => (
                        <div key={log.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-stone-900">{log.summary}</p>
                              <p className="mt-1 text-sm text-stone-600">{log.action} • {log.entityType}</p>
                            </div>
                            <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                              {log.entityId ? "Lié" : "Système"}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-stone-500">{formatDate(log.createdAt)}</p>
                        </div>
                      ))}
                      {!dashboard?.activityLogs.length ? <EmptyHint text="Aucun événement enregistré." /> : null}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}

            {activeTab === "athletes" ? (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <Panel title="Ajouter un athlète" subtitle="Base club Jujitsu">
                  <form className="space-y-4" onSubmit={handleAthleteSubmit}>
                    <Field label="Nom complet">
                      <input className={inputClass} value={athleteForm.fullName} onChange={(event) => handleAthleteChange("fullName", event.target.value)} placeholder="Ex. Yassine El Idrissi" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Date de naissance">
                        <DateField title="Date de naissance" value={athleteForm.dateOfBirth} onChange={(value) => handleAthleteChange("dateOfBirth", value)} />
                      </Field>
                      <Field label="Genre">
                        <SelectField
                          title="Genre"
                          value={athleteForm.gender}
                          onChange={(value) => handleAthleteChange("gender", value)}
                          options={[
                            { value: "MALE", label: "Masculin" },
                            { value: "FEMALE", label: "Féminin" },
                          ]}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Poids actuel (kg)">
                        <input className={inputClass} type="number" step="0.1" title="Poids actuel en kilogrammes" placeholder="Ex. 42.5" value={athleteForm.currentWeight} onChange={(event) => handleAthleteChange("currentWeight", event.target.value)} />
                      </Field>
                      <Field label="Taille (cm)">
                        <input className={inputClass} type="number" step="0.1" title="Taille en centimètres" placeholder="Ex. 158" value={athleteForm.heightCm} onChange={(event) => handleAthleteChange("heightCm", event.target.value)} />
                      </Field>
                    </div>
                    <Field label="Club">
                      <input className={inputClass} title="Club" placeholder="Nom du club" value={athleteForm.clubName} onChange={(event) => handleAthleteChange("clubName", event.target.value)} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Téléphone">
                        <input className={inputClass} title="Téléphone" placeholder="Ex. 06 00 00 00 00" value={athleteForm.phone} onChange={(event) => handleAthleteChange("phone", event.target.value)} />
                      </Field>
                      <Field label="Contact urgence">
                        <input className={inputClass} title="Contact d'urgence" placeholder="Nom + téléphone" value={athleteForm.emergencyContact} onChange={(event) => handleAthleteChange("emergencyContact", event.target.value)} />
                      </Field>
                    </div>
                    <Field label="Photo URL">
                      <input className={inputClass} title="URL de la photo" placeholder="https://..." value={athleteForm.photoUrl} onChange={(event) => handleAthleteChange("photoUrl", event.target.value)} />
                    </Field>
                    <Field label="Notes">
                      <textarea className={textareaClass} title="Notes" placeholder="Observations utiles" value={athleteForm.notes} onChange={(event) => handleAthleteChange("notes", event.target.value)} />
                    </Field>

                    <div className="rounded-2xl border border-[rgba(184,148,71,0.2)] bg-[rgba(184,148,71,0.08)] p-4 text-sm text-stone-700">
                      {athletePreviewAge !== null ? (
                        <p><span className="font-semibold text-stone-900">Âge actuel:</span> {athletePreviewAge} ans</p>
                      ) : null}
                      {athletePreviewCategory ? (
                        <p><span className="font-semibold text-stone-900">Catégorie indicative:</span> {formatAgeGroupLabel(athletePreviewCategory.key)}</p>
                      ) : null}
                      {athletePreviewWeight ? (
                        <p><span className="font-semibold text-stone-900">Poids indicatif:</span> {athletePreviewWeight}</p>
                      ) : null}
                    </div>

                    <button className={primaryButtonClass} disabled={actionLoading === "athlete"} type="submit">
                      {actionLoading === "athlete" ? "Enregistrement..." : editingAthleteId ? "Mettre à jour l'athlète" : "Enregistrer l'athlète"}
                    </button>
                    {editingAthleteId ? (
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
                        onClick={() => {
                          setEditingAthleteId(null);
                          setAthleteForm(defaultAthleteForm);
                        }}
                      >
                        Annuler la modification
                      </button>
                    ) : null}
                  </form>
                </Panel>

                <Panel title="Répertoire des athlètes" subtitle="Base actuelle du club">
                  <div className="space-y-3">
                    {(() => {
                      const bounds = calculatePaginationBounds(dashboard?.athletes?.length ?? 0, "athletes");
                      const visibleAthletes = (dashboard?.athletes ?? []).slice(bounds.startIndex, bounds.endIndex);
                      return (
                        <>
                          {visibleAthletes.map((athlete) => {
                            const currentAge = calculateAge(new Date(), new Date(athlete.dateOfBirth));
                            const currentAgeGroup = getAgeGroup(new Date(athlete.dateOfBirth), new Date());
                            const currentWeightCategory = getWeightCategory(currentAgeGroup.key, athlete.gender, athlete.currentWeight);
                            return (
                              <div key={athlete.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="text-lg font-semibold text-stone-900">{athlete.fullName}</p>
                                    <p className="text-sm text-stone-500">{athlete.clubName}</p>
                                  </div>
                                  <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">{athlete.gender === "MALE" ? "M" : "F"}</span>
                                </div>
                                <div className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                                  <p><span className="font-semibold text-stone-900">Âge:</span> {currentAge} ans</p>
                                  <p><span className="font-semibold text-stone-900">Naissance:</span> {formatDate(athlete.dateOfBirth)}</p>
                                  <p><span className="font-semibold text-stone-900">Poids:</span> {athlete.currentWeight} kg</p>
                                  <p><span className="font-semibold text-stone-900">Taille:</span> {athlete.heightCm ?? "—"} cm</p>
                                  <p><span className="font-semibold text-stone-900">Catégorie âge:</span> {formatAgeGroupLabel(currentAgeGroup.key)}</p>
                                  <p><span className="font-semibold text-stone-900">Catégorie poids:</span> {currentWeightCategory}</p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
                                  {athlete.phone ? <Chip label={athlete.phone} /> : null}
                                  {athlete.emergencyContact ? <Chip label={athlete.emergencyContact} /> : null}
                                  {athlete.notes ? <Chip label={athlete.notes} /> : null}
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAthleteId(athlete.id);
                                      setAthleteForm({
                                        fullName: athlete.fullName,
                                        dateOfBirth: athlete.dateOfBirth.split("T")[0],
                                        gender: athlete.gender,
                                        currentWeight: String(athlete.currentWeight ?? ""),
                                        heightCm: athlete.heightCm == null ? "" : String(athlete.heightCm),
                                        clubName: athlete.clubName,
                                        phone: athlete.phone ?? "",
                                        emergencyContact: athlete.emergencyContact ?? "",
                                        photoUrl: athlete.photoUrl ?? "",
                                        notes: athlete.notes ?? "",
                                      });
                                    }}
                                    className="rounded-full border border-[rgba(93,63,31,0.16)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAthlete(athlete.id)}
                                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <PaginationControls totalItems={dashboard?.athletes?.length ?? 0} sectionKey="athletes" pagination={pagination} onChangePagination={changePagination} />
                          {!dashboard?.athletes.length ? <EmptyHint text="Aucun athlète enregistré pour le moment." /> : null}
                        </>
                      );
                    })()}
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeTab === "championships" ? (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
                <Panel title="Importer un PDF" subtitle="Source officielle des participants">
                  <form className="space-y-4" onSubmit={handlePdfImport}>
                    <Field label="Fichier PDF des participants">
                      <input
                        className={inputClass}
                        type="file"
                        title="Fichier PDF des participants"
                        accept="application/pdf"
                        onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                      />
                    </Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/80 px-4 py-3 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={replaceDataOnImport}
                        onChange={(event) => setReplaceDataOnImport(event.target.checked)}
                      />
                      Nettoyer la base avant import (athletes, championnats, inscriptions, paiements)
                    </label>
                    <button className={primaryButtonClass} disabled={actionLoading === "pdf-import"} type="submit">
                      {actionLoading === "pdf-import" ? "Import en cours..." : "Importer le PDF"}
                    </button>
                  </form>
                </Panel>

                <Panel title="Créer un championnat" subtitle="National ou régional, tarification jeune/adulte">
                  <form className="space-y-4" onSubmit={handleChampionshipSubmit}>
                    <Field label="Nom du championnat">
                      <input className={inputClass} value={championshipForm.name} onChange={(event) => handleChampionshipChange("name", event.target.value)} placeholder="Ex. Coupe Région Casablanca" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Ligue">
                        <input className={inputClass} title="Ligue" placeholder="Nom de la ligue" value={championshipForm.league} onChange={(event) => handleChampionshipChange("league", event.target.value)} />
                      </Field>
                      <Field label="Type">
                        <SelectField
                          title="Type de championnat"
                          value={championshipForm.type}
                          onChange={(value) => handleChampionshipChange("type", value)}
                          options={[
                            { value: "REGIONAL", label: "Régional" },
                            { value: "NATIONAL", label: "National" },
                          ]}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Statut">
                        <SelectField
                          title="Statut du championnat"
                          value={championshipForm.status}
                          onChange={(value) => handleChampionshipChange("status", value)}
                          options={[
                            { value: "DRAFT", label: "Brouillon" },
                            { value: "OPEN", label: "Ouvert" },
                            { value: "CLOSED", label: "Fermé" },
                            { value: "ARCHIVED", label: "Archivé" },
                          ]}
                        />
                      </Field>
                      <Field label="Date">
                        <DateField title="Date du championnat" value={championshipForm.eventDate} onChange={(value) => handleChampionshipChange("eventDate", value)} />
                      </Field>
                    </div>
                    <Field label="Lieu">
                      <input className={inputClass} title="Lieu" placeholder="Ville, salle ou complexe" value={championshipForm.location} onChange={(event) => handleChampionshipChange("location", event.target.value)} />
                    </Field>
                    <Field label="Notes">
                      <textarea className={textareaClass} title="Notes du championnat" placeholder="Informations complémentaires" value={championshipForm.notes} onChange={(event) => handleChampionshipChange("notes", event.target.value)} />
                    </Field>

                    <div className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/70 p-4">
                      <p className="mb-3 text-sm font-semibold text-stone-700">Disciplines activées</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {championshipDisciplineOptions.map((discipline) => {
                          const active = championshipForm.enabledDisciplines.includes(discipline.key);
                          return (
                            <button
                              type="button"
                              key={discipline.key}
                              onClick={() =>
                                setChampionshipForm((current) => ({
                                  ...current,
                                  enabledDisciplines: current.enabledDisciplines.includes(discipline.key)
                                    ? current.enabledDisciplines.filter((item) => item !== discipline.key)
                                    : [...current.enabledDisciplines, discipline.key],
                                }))
                              }
                              className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                                active
                                  ? "border-transparent bg-stone-900 text-white"
                                  : "border-[rgba(93,63,31,0.12)] bg-white text-stone-700"
                              }`}
                            >
                              <span className="block font-semibold">{discipline.label}</span>
                              <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-stone-500"}`}>{discipline.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/70 p-4">
                      <p className="mb-3 text-sm font-semibold text-stone-700">Tarification compétiteur</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Profil de tarification">
                          <SelectField
                            title="Profil de tarification"
                            value={championshipForm.pricingProfile}
                            onChange={(value) => handleChampionshipChange("pricingProfile", value)}
                            options={[
                              { value: "AUTO", label: "Auto (selon l'âge)" },
                              { value: "YOUTH", label: "Jeunes uniquement" },
                              { value: "ADULT", label: "Adultes uniquement" },
                            ]}
                          />
                        </Field>
                        <div className="rounded-2xl border border-[rgba(93,63,31,0.08)] bg-white/80 px-4 py-3 text-xs leading-5 text-stone-600">
                          Fighting + Duo partagent une grille. Nawaza Gi + No-Gi partagent une grille.
                        </div>
                        <Field label="Jeunes: discipline simple (MAD)">
                          <input className={inputClass} type="number" title="Tarif jeunes simple" placeholder="0" value={championshipForm.youthSinglePrice} onChange={(event) => handleChampionshipChange("youthSinglePrice", event.target.value)} />
                        </Field>
                        <Field label="Jeunes: paire disciplines (MAD)">
                          <input className={inputClass} type="number" title="Tarif jeunes paire" placeholder="0" value={championshipForm.youthPairPrice} onChange={(event) => handleChampionshipChange("youthPairPrice", event.target.value)} />
                        </Field>
                        <Field label="Adultes: discipline simple (MAD)">
                          <input className={inputClass} type="number" title="Tarif adultes simple" placeholder="0" value={championshipForm.adultSinglePrice} onChange={(event) => handleChampionshipChange("adultSinglePrice", event.target.value)} />
                        </Field>
                        <Field label="Adultes: paire disciplines (MAD)">
                          <input className={inputClass} type="number" title="Tarif adultes paire" placeholder="0" value={championshipForm.adultPairPrice} onChange={(event) => handleChampionshipChange("adultPairPrice", event.target.value)} />
                        </Field>
                      </div>
                    </div>

                    <button className={primaryButtonClass} disabled={actionLoading === "championship"} type="submit">
                      {actionLoading === "championship" ? "Création..." : editingChampionshipId ? "Mettre à jour le championnat" : "Créer le championnat"}
                    </button>
                    {editingChampionshipId ? (
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
                        onClick={() => {
                          setEditingChampionshipId(null);
                          setChampionshipForm(defaultChampionshipForm);
                        }}
                      >
                        Annuler la modification
                      </button>
                    ) : null}
                  </form>
                </Panel>
                </div>

                <Panel title="Championnats enregistrés" subtitle="Casablanca-Settat et variantes">
                  <div className="space-y-3">
                    {(dashboard?.championships ?? []).slice(0, listLimits.championships).map((championship) => (
                      <div key={championship.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-stone-900">{championship.name}</p>
                            <p className="text-sm text-stone-500">{championship.league} • {championship.type} • {championship.status}</p>
                          </div>
                          <div className="text-right text-sm text-stone-700">
                            <p>{formatDate(championship.eventDate)}</p>
                            <p>{championship.location}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          {(championship.enabledDisciplines ?? []).map((discipline) => (
                            <Chip key={discipline} label={disciplineLabels[discipline]} />
                          ))}
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                          <p><span className="font-semibold text-stone-900">Profil:</span> {championship.pricing?.profile ?? "AUTO"}</p>
                          <p><span className="font-semibold text-stone-900">Jeunes simple / paire:</span> {formatMoney(championship.pricing?.youthSinglePrice ?? 50)} / {formatMoney(championship.pricing?.youthPairPrice ?? 75)}</p>
                          <p><span className="font-semibold text-stone-900">Adultes simple / paire:</span> {formatMoney(championship.pricing?.adultSinglePrice ?? 100)} / {formatMoney(championship.pricing?.adultPairPrice ?? 150)}</p>
                          <p><span className="font-semibold text-stone-900">Pack 1:</span> Fighting + Duo</p>
                          <p><span className="font-semibold text-stone-900">Pack 2:</span> Nawaza Gi + No-Gi</p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChampionshipId(championship.id);
                              setChampionshipForm({
                                name: championship.name,
                                league: championship.league,
                                type: championship.type,
                                status: championship.status,
                                eventDate: championship.eventDate.split("T")[0],
                                location: championship.location,
                                pricingProfile: (championship.pricing?.profile as PricingProfile) ?? "AUTO",
                                youthSinglePrice: String(championship.pricing?.youthSinglePrice ?? 50),
                                youthPairPrice: String(championship.pricing?.youthPairPrice ?? 75),
                                adultSinglePrice: String(championship.pricing?.adultSinglePrice ?? 100),
                                adultPairPrice: String(championship.pricing?.adultPairPrice ?? 150),
                                notes: championship.notes ?? "",
                                enabledDisciplines: championship.enabledDisciplines,
                              });
                              setActiveTab("championships");
                            }}
                            className="rounded-full border border-[rgba(93,63,31,0.16)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChampionship(championship.id)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"
                          >
                            Supprimer
                          </button>
                        </div>
                        {championship.notes ? <p className="mt-3 text-sm text-stone-600">{championship.notes}</p> : null}
                      </div>
                    ))}
                    {(dashboard?.championships?.length ?? 0) > listLimits.championships ? (
                      <button
                        type="button"
                        onClick={() => showMoreItems("championships")}
                        className="w-full rounded-2xl border border-[rgba(93,63,31,0.14)] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[rgba(143,31,31,0.24)]"
                      >
                        Voir plus de championnats
                      </button>
                    ) : null}
                    {(dashboard?.championships?.length ?? 0) > 6 && listLimits.championships > 6 ? (
                      <button
                        type="button"
                        onClick={() => showFewerItems("championships", 6)}
                        className="w-full rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
                      >
                        Réduire la liste
                      </button>
                    ) : null}
                    {!dashboard?.championships.length ? <EmptyHint text="Aucun championnat créé pour le moment." /> : null}
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeTab === "registrations" ? (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6">
                  <Panel title="Nouvelle inscription" subtitle="Catégorisation et paiement automatique">
                    <form className="space-y-4" onSubmit={handleRegistrationSubmit}>
                      <Field label="Athlète">
                        <SelectField
                          title="Athlète"
                          value={registrationForm.athleteId}
                          onChange={(value) => handleRegistrationChange("athleteId", value)}
                          placeholder="Sélectionner un athlète"
                          options={(dashboard?.athletes ?? []).map((athlete) => ({ value: athlete.id, label: athlete.fullName }))}
                        />
                      </Field>
                      <Field label="Championnat">
                        <SelectField
                          title="Championnat"
                          value={registrationForm.championshipId}
                          onChange={(value) => handleRegistrationChange("championshipId", value)}
                          placeholder="Sélectionner un championnat"
                          options={(dashboard?.championships ?? []).map((championship) => ({ value: championship.id, label: championship.name }))}
                        />
                      </Field>

                      <div className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/70 p-4">
                        <p className="mb-3 text-sm font-semibold text-stone-700">Disciplines à inscrire</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {championshipDisciplineOptions.map((discipline) => {
                            const active = registrationForm.selectedDisciplines.includes(discipline.key);
                            return (
                              <button
                                type="button"
                                key={discipline.key}
                                onClick={() => toggleRegistrationDiscipline(discipline.key)}
                                className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                                  active
                                    ? "border-transparent bg-stone-900 text-white"
                                    : "border-[rgba(93,63,31,0.12)] bg-white text-stone-700"
                                }`}
                              >
                                <span className="block font-semibold">{discipline.label}</span>
                                <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-stone-500"}`}>
                                  {discipline.key === "fighting" || discipline.key === "duel"
                                    ? `Simple ${formatMoney(effectiveSinglePrice)} • Pack Fighting + Duo ${formatMoney(effectivePairPrice)}`
                                    : `Simple ${formatMoney(effectiveSinglePrice)} • Pack Nawaza Gi + No-Gi ${formatMoney(effectivePairPrice)}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <Field label="Notes">
                        <textarea className={textareaClass} title="Notes d'inscription" placeholder="Informations complémentaires" value={registrationForm.notes} onChange={(event) => handleRegistrationChange("notes", event.target.value)} />
                      </Field>

                      <div className="rounded-3xl border border-[rgba(184,148,71,0.18)] bg-[rgba(184,148,71,0.08)] p-4 text-sm text-stone-700">
                        {selectedAthlete && selectedChampionship ? (
                          <>
                            <p><span className="font-semibold text-stone-900">Catégorie âge:</span> {registrationAgeGroup ? formatAgeGroupLabel(registrationAgeGroup.key) : "—"}</p>
                            <p><span className="font-semibold text-stone-900">Catégorie poids:</span> {registrationWeightCategory ?? "—"}</p>
                            <p><span className="font-semibold text-stone-900">Montant calculé:</span> {formatMoney(registrationFee)}</p>
                          </>
                        ) : (
                          <p>Sélectionnez un athlète et un championnat pour obtenir la catégorie et le tarif.</p>
                        )}
                      </div>

                      <button className={primaryButtonClass} disabled={actionLoading === "registration"} type="submit">
                        {actionLoading === "registration" ? "Création..." : editingRegistrationId ? "Mettre à jour l'inscription" : "Créer l'inscription"}
                      </button>
                      {editingRegistrationId ? (
                        <button
                          type="button"
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
                          onClick={() => {
                            setEditingRegistrationId(null);
                            setRegistrationForm(defaultRegistrationForm);
                          }}
                        >
                          Annuler la modification
                        </button>
                      ) : null}
                    </form>
                  </Panel>

                  <Panel title="Paiement manuel" subtitle="Encaissement au guichet du club">
                    <form className="space-y-4" onSubmit={handlePaymentSubmit}>
                      <Field label="Inscription liée">
                        <SelectField
                          title="Inscription"
                          value={paymentForm.registrationId}
                          onChange={(value) => handlePaymentChange("registrationId", value)}
                          placeholder="Sélectionner une inscription"
                          options={(dashboard?.registrations ?? []).map((registration) => ({
                            value: registration.id,
                            label: `${registration.athlete.fullName} • ${registration.championship.name}`,
                          }))}
                        />
                      </Field>
                      <Field label="Montant payé (MAD)">
                        <input className={inputClass} type="number" title="Montant payé" placeholder="0" value={paymentForm.amountPaid} onChange={(event) => handlePaymentChange("amountPaid", event.target.value)} />
                      </Field>
                      <Field label="Note">
                        <textarea className={textareaClass} title="Note de paiement" placeholder="Reçu, acompte, observation" value={paymentForm.note} onChange={(event) => handlePaymentChange("note", event.target.value)} />
                      </Field>

                      <button className={primaryButtonClass} disabled={actionLoading === "payment"} type="submit">
                        {actionLoading === "payment" ? "Enregistrement..." : editingPaymentId ? "Mettre à jour le paiement" : "Enregistrer le paiement"}
                      </button>
                      {editingPaymentId ? (
                        <button
                          type="button"
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
                          onClick={() => {
                            setEditingPaymentId(null);
                            setPaymentForm(defaultPaymentForm);
                          }}
                        >
                          Annuler la modification
                        </button>
                      ) : null}
                    </form>
                  </Panel>
                </div>

                <div className="space-y-6">
                  <Panel title="Inscriptions en cours" subtitle="Statuts et catégories">
                    <div className="space-y-3">
                      {(dashboard?.registrations ?? []).slice(0, listLimits.registrations).map((registration) => (
                        <div key={registration.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-stone-900">{registration.athlete.fullName}</p>
                              <p className="text-sm text-stone-500">{registration.championship.name}</p>
                            </div>
                            <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                              {registration.status}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                            <p><span className="font-semibold text-stone-900">Âge:</span> {formatAgeGroupLabel(registration.ageGroup)}</p>
                            <p><span className="font-semibold text-stone-900">Poids:</span> {registration.weightCategory}</p>
                            <p><span className="font-semibold text-stone-900">Discipline:</span> {mapSelectedDisciplines(registration.selectedDisciplines)}</p>
                            <p><span className="font-semibold text-stone-900">Montant:</span> {formatMoney(registration.tuitionAmount)}</p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const normalized = registration.selectedDisciplines
                                  .map((value) => toFormDiscipline(String(value)))
                                  .filter((value): value is DisciplineKey => value !== null);
                                setEditingRegistrationId(registration.id);
                                setRegistrationForm({
                                  athleteId: registration.athleteId,
                                  championshipId: registration.championshipId,
                                  selectedDisciplines: normalized.length ? normalized : ["fighting"],
                                  notes: registration.notes ?? "",
                                });
                              }}
                              className="rounded-full border border-[rgba(93,63,31,0.16)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRegistration(registration.id)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"
                            >
                              Supprimer
                            </button>
                          </div>
                          <p className="mt-3 text-xs text-stone-500">Créée le {formatDate(registration.createdAt)}</p>
                        </div>
                      ))}
                      {(dashboard?.registrations?.length ?? 0) > listLimits.registrations ? (
                        <button
                          type="button"
                          onClick={() => showMoreItems("registrations")}
                          className="w-full rounded-2xl border border-[rgba(93,63,31,0.14)] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[rgba(143,31,31,0.24)]"
                        >
                          Voir plus d'inscriptions
                        </button>
                      ) : null}
                      {(dashboard?.registrations?.length ?? 0) > 8 && listLimits.registrations > 8 ? (
                        <button
                          type="button"
                          onClick={() => showFewerItems("registrations", 8)}
                          className="w-full rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
                        >
                          Réduire la liste
                        </button>
                      ) : null}
                      {!dashboard?.registrations.length ? <EmptyHint text="Aucune inscription n'a encore été créée." /> : null}
                    </div>
                  </Panel>

                  <Panel title="Paiements manuels" subtitle="Statut financier par inscription">
                    <div className="space-y-3">
                      {(dashboard?.payments ?? []).slice(0, listLimits.payments).map((payment) => (
                        <div key={payment.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-stone-900">{payment.registration?.athlete.fullName ?? "Paiement"}</p>
                              <p className="text-sm text-stone-500">{payment.registration?.championship.name ?? "—"}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${payment.status === "PAID" ? "bg-emerald-100 text-emerald-900" : payment.status === "PARTIAL" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900"}`}>
                              {payment.status}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                            <p><span className="font-semibold text-stone-900">Du:</span> {formatMoney(payment.amountDue)}</p>
                            <p><span className="font-semibold text-stone-900">Reçu:</span> {formatMoney(payment.amountPaid)}</p>
                            <p><span className="font-semibold text-stone-900">Payé le:</span> {formatDate(payment.paidAt)}</p>
                            <p><span className="font-semibold text-stone-900">Créé le:</span> {formatDate(payment.createdAt)}</p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPaymentId(payment.id);
                                setPaymentForm({
                                  registrationId: payment.registrationId,
                                  amountPaid: String(payment.amountPaid),
                                  note: payment.note ?? "",
                                });
                              }}
                              className="rounded-full border border-[rgba(93,63,31,0.16)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                      {(dashboard?.payments?.length ?? 0) > listLimits.payments ? (
                        <button
                          type="button"
                          onClick={() => showMoreItems("payments")}
                          className="w-full rounded-2xl border border-[rgba(93,63,31,0.14)] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[rgba(143,31,31,0.24)]"
                        >
                          Voir plus de paiements
                        </button>
                      ) : null}
                      {(dashboard?.payments?.length ?? 0) > 8 && listLimits.payments > 8 ? (
                        <button
                          type="button"
                          onClick={() => showFewerItems("payments", 8)}
                          className="w-full rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
                        >
                          Réduire la liste
                        </button>
                      ) : null}
                      {!dashboard?.payments.length ? <EmptyHint text="Aucun paiement enregistré." /> : null}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}

            {activeTab === "certificates" ? (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Panel title="Générer un certificat" subtitle="Jujitsu et Aïkido disponibles">
                  <form className="space-y-4" onSubmit={handleCertificateSubmit}>
                    <Field label="Athlète enregistré (optionnel)">
                      <SelectField
                        title="Athlète pour certificat"
                        value={certificateForm.athleteId}
                        placeholder="Sélectionner un athlète"
                        onChange={(athleteId) => {
                        const athlete = dashboard?.athletes.find((item) => item.id === athleteId);
                        setCertificateForm((current) => ({
                          ...current,
                          athleteId,
                          studentName: athlete?.fullName ?? current.studentName,
                        }));
                        }}
                        options={(dashboard?.athletes ?? []).map((athlete) => ({ value: athlete.id, label: athlete.fullName }))}
                      />
                    </Field>
                    <Field label="Nom affiché sur le certificat">
                        <input className={inputClass} title="Nom affiché" placeholder="Nom complet" value={certificateForm.studentName} onChange={(event) => handleCertificateChange("studentName", event.target.value)} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Grade / Ceinture">
                        <SelectField
                          title="Grade du certificat"
                          value={certificateForm.rank}
                          onChange={(value) => handleCertificateChange("rank", value)}
                          options={ranks.map((rank) => ({ value: rank, label: rank }))}
                        />
                      </Field>
                      <Field label="Date">
                        <DateField title="Date du certificat" value={certificateForm.date} onChange={(value) => handleCertificateChange("date", value)} />
                      </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Lieu">
                        <input className={inputClass} title="Lieu du certificat" placeholder="Ville, dojo ou club" value={certificateForm.location} onChange={(event) => handleCertificateChange("location", event.target.value)} />
                      </Field>
                      <Field label="Discipline">
                        <SelectField
                          title="Discipline du certificat"
                          value={certificateForm.discipline}
                          onChange={(value) => handleCertificateChange("discipline", value)}
                          options={certificateModes.map((mode) => ({ value: mode.value, label: mode.label }))}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {certificateModes.map((mode) => (
                        <div key={mode.value} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex aspect-square h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-[rgba(184,148,71,0.35)] bg-white p-1">
                              <Image src={mode.logo} alt={mode.label} width={64} height={64} className="h-full w-full flex-shrink-0 rounded-full object-cover" />
                            </div>
                            <div>
                              <p className="font-semibold text-stone-900">{mode.label}</p>
                              <p className="text-sm text-stone-600">{mode.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button className={primaryButtonClass} disabled={actionLoading === "certificate"} type="submit">
                        {actionLoading === "certificate" ? "Génération..." : editingCertificateId ? "Mettre à jour le certificat" : "Générer le certificat"}
                      </button>
                      <button
                        type="button"
                        onClick={handleBlankCertificateDownload}
                        disabled={actionLoading === "certificate" || Boolean(editingCertificateId)}
                        className="inline-flex items-center justify-center rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-700 transition hover:border-[rgba(143,31,31,0.26)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Télécharger modèle vide
                      </button>
                    </div>
                    {editingCertificateId ? (
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-5 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-700"
                        onClick={() => {
                          setEditingCertificateId(null);
                          setCertificateForm({
                            ...defaultCertificateForm,
                            date: new Date().toISOString().split("T")[0],
                          });
                        }}
                      >
                        Annuler la modification
                      </button>
                    ) : null}
                  </form>
                </Panel>

                <Panel title="Historique des certificats" subtitle="Documents déjà générés">
                  <div className="space-y-3">
                    {(dashboard?.certificates ?? []).slice(0, listLimits.certificates).map((certificate) => (
                      <div key={certificate.id} className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-stone-900">{certificate.studentName}</p>
                            <p className="text-sm text-stone-500">{certificate.rank} • {certificate.location}</p>
                          </div>
                          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                            {certificate.discipline}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-stone-500">Généré le {formatDate(certificate.createdAt)}</p>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCertificateId(certificate.id);
                              setCertificateForm((current) => ({
                                ...current,
                                athleteId: certificate.athleteId ?? "",
                                studentName: certificate.studentName,
                                rank: certificate.rank,
                                date: certificate.date.split("T")[0],
                                location: certificate.location,
                                discipline: certificate.discipline === "AIKIDO" ? "Aïkido" : "Jujitsu",
                              }));
                            }}
                            className="rounded-full border border-[rgba(93,63,31,0.16)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCertificate(certificate.id)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                    {(dashboard?.certificates?.length ?? 0) > listLimits.certificates ? (
                      <button
                        type="button"
                        onClick={() => showMoreItems("certificates")}
                        className="w-full rounded-2xl border border-[rgba(93,63,31,0.14)] bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition hover:border-[rgba(143,31,31,0.24)]"
                      >
                        Voir plus de certificats
                      </button>
                    ) : null}
                    {(dashboard?.certificates?.length ?? 0) > 8 && listLimits.certificates > 8 ? (
                      <button
                        type="button"
                        onClick={() => showFewerItems("certificates", 8)}
                        className="w-full rounded-2xl border border-[rgba(93,63,31,0.1)] bg-white/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600"
                      >
                        Réduire la liste
                      </button>
                    ) : null}
                    {!dashboard?.certificates.length ? <EmptyHint text="Aucun certificat généré pour le moment." /> : null}
                  </div>
                </Panel>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function InfoCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-900">{value}</p>
      <p className="mt-2 text-sm text-stone-600">{subtitle}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_18px_45px_rgba(38,26,11,0.08)] sm:p-6 lg:p-7 xl:p-8">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-gold)]">{subtitle}</p>
        <h3 className="mt-2 text-2xl font-semibold text-stone-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2.5">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(93,63,31,0.08)] bg-white/70 px-4 py-3">
      <span>{label}</span>
      <span className="font-semibold text-stone-900">{value}</span>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="rounded-full border border-[rgba(143,31,31,0.16)] bg-[rgba(143,31,31,0.06)] px-3 py-1 font-medium text-[var(--accent)]">{label}</span>;
}

function MiniAction({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-[rgba(93,63,31,0.1)] bg-white/80 p-4 shadow-sm">
      <p className="font-semibold text-stone-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-[rgba(93,63,31,0.18)] bg-white/50 p-5 text-sm text-stone-600">{text}</div>;
}

function SelectField({
  title,
  value,
  options,
  placeholder = "Sélectionner",
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => setOpen((current) => !current)}
        className={`${selectClass} flex min-h-[3.5rem] items-center justify-between gap-3 text-left`}
      >
        <span className={selected ? "text-stone-900" : "text-stone-400"}>{selected?.label ?? placeholder}</span>
        <span className={`text-lg leading-none text-[var(--accent)] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white p-1.5 shadow-[0_20px_40px_rgba(49,29,10,0.18)]">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active ? "bg-[rgba(143,31,31,0.12)] font-semibold text-[var(--accent)]" : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <span>{option.label}</span>
                {active ? <span className="text-xs">●</span> : null}
              </button>
            );
          })}
          {!options.length ? <p className="px-3 py-2 text-sm text-stone-500">Aucune option.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function DateField({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = fromYmd(value);
  const [month, setMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => {
          if (selectedDate) {
            setMonth(selectedDate);
          }
          setOpen((current) => !current);
        }}
        className={`${dateInputClass} flex min-h-[3.5rem] items-center justify-between gap-3 text-left`}
      >
        <span className={value ? "text-stone-900" : "text-stone-400"}>{formatDateFieldLabel(value)}</span>
        <span className="rounded-lg bg-[rgba(143,31,31,0.1)] px-2 py-1 text-xs text-[var(--accent)]">📅</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-[19rem] rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white p-3 shadow-[0_20px_40px_rgba(49,29,10,0.18)]">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate}
            showOutsideDays
            onSelect={(date) => {
              if (!date) return;
              onChange(toYmd(date));
              setOpen(false);
            }}
          />
          <div className="mt-2 flex items-center justify-between border-t border-[rgba(93,63,31,0.1)] pt-2 text-xs">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-stone-600 hover:bg-stone-100"
              onClick={() => onChange("")}
            >
              Effacer
            </button>
            <button
              type="button"
              className="rounded-md bg-[rgba(143,31,31,0.1)] px-2 py-1 font-semibold text-[var(--accent)] hover:bg-[rgba(143,31,31,0.15)]"
              onClick={() => {
                const today = new Date();
                onChange(toYmd(today));
                setMonth(today);
                setOpen(false);
              }}
            >
              Aujourd&apos;hui
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-4 py-3.5 text-base leading-6 text-stone-900 shadow-[0_8px_16px_rgba(49,29,10,0.06)] outline-none transition placeholder:text-stone-400 hover:border-[rgba(143,31,31,0.22)] focus:border-[rgba(143,31,31,0.35)] focus:ring-4 focus:ring-[rgba(143,31,31,0.1)]";
const selectClass =
  "w-full rounded-2xl border border-[rgba(93,63,31,0.16)] bg-white px-4 py-3.5 text-base leading-6 text-stone-900 shadow-[0_8px_16px_rgba(49,29,10,0.06)] outline-none transition hover:border-[rgba(143,31,31,0.22)] focus:border-[rgba(143,31,31,0.35)] focus:ring-4 focus:ring-[rgba(143,31,31,0.1)]";
const dateInputClass =
  `${inputClass}`;
const textareaClass = `${inputClass} min-h-24 resize-y`;
const primaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#8f1f1f,#5c1212)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-white shadow-[0_18px_35px_rgba(95,20,20,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-stone-400";
