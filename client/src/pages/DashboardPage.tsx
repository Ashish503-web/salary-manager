import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type {
  AnalyticsGroup,
  AnalyticsOverview,
  DistributionBucket,
  PayEquityRow,
  RecentChange,
} from "@/lib/types";
import { KpiCard } from "@/components/analytics/KpiCard";
import { AvgSalaryBarChart } from "@/components/analytics/AvgSalaryBarChart";
import { DistributionChart } from "@/components/analytics/DistributionChart";
import { PayEquityChart } from "@/components/analytics/PayEquityChart";
import { RecentChangesTable } from "@/components/analytics/RecentChangesTable";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatUsd } from "@/lib/utils";

export default function DashboardPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [byDepartment, setByDepartment] = useState<AnalyticsGroup[]>([]);
  const [byCountry, setByCountry] = useState<AnalyticsGroup[]>([]);
  const [byLevel, setByLevel] = useState<AnalyticsGroup[]>([]);
  const [distribution, setDistribution] = useState<DistributionBucket[]>([]);
  const [payEquity, setPayEquity] = useState<PayEquityRow[]>([]);
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ov, dept, country, level, dist, equity, recent] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getAnalyticsByDepartment(),
          api.getAnalyticsByCountry(),
          api.getAnalyticsByLevel(),
          api.getAnalyticsDistribution(),
          api.getAnalyticsPayEquity(),
          api.getRecentChanges(20),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setByDepartment(dept);
        setByCountry(country);
        setByLevel(level);
        setDistribution(dist);
        setPayEquity(equity);
        setRecentChanges(recent);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          All monetary figures below are normalized to USD for comparison.
        </p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="Headcount" value={formatNumber(overview.headcount)} />
          <KpiCard
            label="Active headcount"
            value={formatNumber(overview.activeHeadcount)}
          />
          <KpiCard
            label="Total annual payroll"
            value={formatUsd(overview.totalAnnualPayrollUsd)}
            hint="USD"
          />
          <KpiCard
            label="Avg salary"
            value={formatUsd(overview.avgSalaryUsd)}
            hint="USD"
          />
          <KpiCard
            label="Median salary"
            value={formatUsd(overview.medianSalaryUsd)}
            hint="USD"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <AvgSalaryBarChart data={byDepartment} title="Avg salary by department (USD)" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <AvgSalaryBarChart data={byCountry} title="Avg salary by country (USD)" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <AvgSalaryBarChart data={byLevel} title="Avg salary by level (USD)" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DistributionChart data={distribution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <PayEquityChart data={payEquity} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <RecentChangesTable data={recentChanges} />
        </CardContent>
      </Card>
    </div>
  );
}
