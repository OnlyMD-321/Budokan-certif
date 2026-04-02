"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { jujitsuLogo, aikidoLogo } from "@/lib/logos";

// ============= TYPE DEFINITIONS =============
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
  createdAt: string;
};

type Championship = {
  id: string;
  name: string;
  league: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
  eventDate: string;
  location: string;
  createdAt: string;
};

type Registration = {
  id: string;
  athleteId: string;
  championshipId: string;
  selectedDisciplines: string[];
  ageGroup: string;
  weightCategory: string;
  tuitionAmount: number;
  athlete: Athlete;
  championship: Championship;
  createdAt: string;
};

type Payment = {
  id: string;
  registrationId: string;
  amountDue: number;
  amountPaid: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  createdAt: string;
};

type Certificate = {
  id: string;
  studentName: string;
  rank: string;
  date: string;
  createdAt: string;
};

type ListKey = "athletes" | "championships" | "registrations" | "payments" | "certificates";
type ItemsPerPage = 10 | 20 | 50;

// ============= MAIN COMPONENT =============
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "athletes" | "championships" | "registrations" | "certificates">("dashboard");
  const [data, setData] = useState<{athletes: Athlete[]; championships: Championship[]; registrations: Registration[]; payments: Payment[];certificates: Certificate[]} | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState<Record<ListKey, ItemsPerPage>>({
    athletes: 10,
    championships: 10,
    registrations: 10,
    payments: 10,
    certificates: 10,
  });
  const [displayLimits, setDisplayLimits] = useState<Record<ListKey, number>>({
    athletes: 10,
    championships: 10,
    registrations: 10,
    payments: 10,
    certificates: 10,
  });

  // Initialize from URL and load data
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Parse URL for tab and items per page
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as typeof activeTab;
    if (tab && ["dashboard", "athletes", "championships", "registrations", "certificates"].includes(tab)) {
      setActiveTab(tab);
    }

    const limits: Record<ListKey, ItemsPerPage> = { athletes: 10, championships: 10, registrations: 10, payments: 10, certificates: 10 };
    (['athletes', 'championships', 'registrations', 'payments', 'certificates'] as ListKey[]).forEach(key => {
      const val = params.get(`${key}_per_page`);
      if (val === '20' || val === '50') limits[key] = parseInt(val) as ItemsPerPage;
    });
    setItemsPerPage(limits);
    setDisplayLimits(limits);

    // Load dashboard data
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [athletesRes, champsRes, regsRes, paysRes, certsRes] = await Promise.all([
        fetch("/api/athletes"),
        fetch("/api/championships"),
        fetch("/api/registrations"),
        fetch("/api/payments"),
        fetch("/api/certificates"),
      ]);

      const athletes = (await athletesRes.json()).athletes || [];
      const championships = (await champsRes.json()).championships || [];
      const registrations = (await regsRes.json()).registrations || [];
      const payments = (await paysRes.json()).payments || [];
      const certificates = (await certsRes.json()).certificates || [];

      setData({ athletes, championships, registrations, payments, certificates });
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTabUrl = (newTab: typeof activeTab) => {
    setActiveTab(newTab);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const updateItemsPerPageUrl = (key: ListKey, newLimit: ItemsPerPage) => {
    setItemsPerPage(prev => ({ ...prev, [key]: newLimit }));
    setDisplayLimits(prev => ({ ...prev, [key]: newLimit }));

    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set(`${key}_per_page`, String(newLimit));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const showMore = (key: ListKey) => {
    setDisplayLimits(prev => ({ ...prev, [key]: prev[key] + 6 }));
  };

  // ============= RENDER =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex gap-2">
            <Image src={jujitsuLogo} alt="Jujitsu" width={48} height={48} className="h-12 w-12 rounded-full" />
            <Image src={aikidoLogo} alt="Aikido" width={48} height={48} className="h-12 w-12 rounded-full" />
          </div>
          <h1 className="text-3xl font-bold text-white">Budokan Admin</h1>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-2">
          {(['dashboard', 'athletes', 'championships', 'registrations', 'certificates'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => updateTabUrl(tab)}
              className={`rounded-lg px-4 py-2 font-semibold transition ${
                activeTab === tab
                  ? 'bg-white text-stone-900'
                  : 'bg-stone-700 text-white hover:bg-stone-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center text-white">Chargement...</div>
        ) : activeTab === "dashboard" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Athlètes" value={data?.athletes.length ?? 0} />
            <StatCard label="Championnats" value={data?.championships.length ?? 0} />
            <StatCard label="Inscriptions" value={data?.registrations.length ?? 0} />
            <StatCard label="Paiements" value={data?.payments.length ?? 0} />
          </div>
        ) : activeTab === "athletes" ? (
          <ListSection
            title="Athlètes"
            items={data?.athletes ?? []}
            itemsPerPage={itemsPerPage.athletes}
            displayLimit={displayLimits.athletes}
            onChangeItemsPerPage={(limit) => updateItemsPerPageUrl("athletes", limit)}
            onShowMore={() => showMore("athletes")}
            renderItem={(athlete) => (
              <div key={athlete.id} className="rounded-lg bg-stone-700 p-4 text-white">
                <p className="font-bold">{athlete.fullName}</p>
                <p className="text-sm text-stone-300">{athlete.clubName}</p>
                <p className="text-xs text-stone-400 mt-2">
                  {athlete.gender} • {athlete.currentWeight}kg • {new Date(athlete.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            )}
          />
        ) : activeTab === "championships" ? (
          <ListSection
            title="Championnats"
            items={data?.championships ?? []}
            itemsPerPage={itemsPerPage.championships}
            displayLimit={displayLimits.championships}
            onChangeItemsPerPage={(limit) => updateItemsPerPageUrl("championships", limit)}
            onShowMore={() => showMore("championships")}
            renderItem={(champ) => (
              <div key={champ.id} className="rounded-lg bg-stone-700 p-4 text-white">
                <p className="font-bold">{champ.name}</p>
                <p className="text-sm text-stone-300">{champ.league}</p>
                <p className="text-xs text-stone-400 mt-2">{new Date(champ.eventDate).toLocaleDateString()} • {champ.location}</p>
              </div>
            )}
          />
        ) : activeTab === "registrations" ? (
          <div className="space-y-6">
            <ListSection
              title="Inscriptions"
              items={data?.registrations ?? []}
              itemsPerPage={itemsPerPage.registrations}
              displayLimit={displayLimits.registrations}
              onChangeItemsPerPage={(limit) => updateItemsPerPageUrl("registrations", limit)}
              onShowMore={() => showMore("registrations")}
              renderItem={(reg) => (
                <div key={reg.id} className="rounded-lg bg-stone-700 p-4 text-white">
                  <p className="font-bold">{reg.athlete.fullName}</p>
                  <p className="text-sm text-stone-300">{reg.championship.name}</p>
                  <p className="text-xs text-stone-400 mt-2">
                    {reg.ageGroup} • {reg.weightCategory} • {reg.selectedDisciplines.join(", ")} • {reg.tuitionAmount} MAD
                  </p>
                </div>
              )}
            />

            {/* SEPARATOR */}
            <div className="my-8 border-t-2 border-stone-600"></div>

            <ListSection
              title="Paiements"
              items={data?.payments ?? []}
              itemsPerPage={itemsPerPage.payments}
              displayLimit={displayLimits.payments}
              onChangeItemsPerPage={(limit) => updateItemsPerPageUrl("payments", limit)}
              onShowMore={() => showMore("payments")}
              renderItem={(pay) => (
                <div key={pay.id} className="rounded-lg bg-stone-700 p-4 text-white">
                  <p className="text-sm">
                    <span className="font-bold">Du:</span> {pay.amountDue} MAD
                  </p>
                  <p className="text-sm">
                    <span className="font-bold">Reçu:</span> {pay.amountPaid} MAD
                  </p>
                  <span className={`mt-2 inline-block px-2 py-1 rounded text-xs font-bold ${
                    pay.status === 'PAID' ? 'bg-green-600' : pay.status === 'PARTIAL' ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    {pay.status}
                  </span>
                </div>
              )}
            />
          </div>
        ) : activeTab === "certificates" ? (
          <ListSection
            title="Certificats"
            items={data?.certificates ?? []}
            itemsPerPage={itemsPerPage.certificates}
            displayLimit={displayLimits.certificates}
            onChangeItemsPerPage={(limit) => updateItemsPerPageUrl("certificates", limit)}
            onShowMore={() => showMore("certificates")}
            renderItem={(cert) => (
              <div key={cert.id} className="rounded-lg bg-stone-700 p-4 text-white">
                <p className="font-bold">{cert.studentName}</p>
                <p className="text-sm text-stone-300">{cert.rank}</p>
                <p className="text-xs text-stone-400 mt-2">{new Date(cert.date).toLocaleDateString()}</p>
              </div>
            )}
          />
        ) : null}
      </div>
    </div>
  );
}

// ============= HELPER COMPONENTS =============
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-700 p-6 text-white">
      <p className="text-sm text-stone-300">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

interface ListSectionProps<T> {
  title: string;
  items: T[];
  itemsPerPage: ItemsPerPage;
  displayLimit: number;
  onChangeItemsPerPage: (limit: ItemsPerPage) => void;
  onShowMore: () => void;
  renderItem: (item: T) => React.ReactNode;
}

function ListSection<T>({
  title,
  items,
  itemsPerPage,
  displayLimit,
  onChangeItemsPerPage,
  onShowMore,
  renderItem,
}: ListSectionProps<T>) {
  const visibleItems = items.slice(0, displayLimit);
  const hasMore = items.length > displayLimit;

  return (
    <div className="rounded-lg bg-stone-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{title}</h2>

        {/* Items Per Page Selector - PHASE 1 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-stone-300">Par page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onChangeItemsPerPage(parseInt(e.target.value) as ItemsPerPage)}
            className="rounded bg-stone-700 px-3 py-1 text-white text-sm"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item, idx) => (
          <div key={idx}>{renderItem(item)}</div>
        ))}
      </div>

      {/* Show More Button */}
      {hasMore && (
        <button
          onClick={onShowMore}
          className="mt-4 w-full rounded bg-stone-600 px-4 py-2 font-semibold text-white hover:bg-stone-500 transition"
        >
          Voir plus ({items.length - displayLimit} restant(s))
        </button>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-8 text-stone-400">Aucun élément</div>
      )}
    </div>
  );
}
