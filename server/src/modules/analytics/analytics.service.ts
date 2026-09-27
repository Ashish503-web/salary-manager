export interface OverviewEmployee {
  status: string;
  currentSalaryUsd: number | undefined;
}

export interface OverviewResult {
  headcount: number;
  activeHeadcount: number;
  totalAnnualPayrollUsd: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function computeOverview(employees: OverviewEmployee[]): OverviewResult {
  const headcount = employees.length;
  const active = employees.filter((e) => e.status === "ACTIVE");
  const activeHeadcount = active.length;

  const salaries = active
    .map((e) => e.currentSalaryUsd)
    .filter((s): s is number => typeof s === "number")
    .sort((a, b) => a - b);

  const totalAnnualPayrollUsd = salaries.reduce((sum, s) => sum + s, 0);
  const avgSalaryUsd = salaries.length > 0 ? totalAnnualPayrollUsd / salaries.length : 0;
  const medianSalaryUsd = median(salaries);

  return {
    headcount,
    activeHeadcount,
    totalAnnualPayrollUsd,
    avgSalaryUsd,
    medianSalaryUsd,
  };
}

export interface GroupByEmployee {
  status: string;
  currentSalaryUsd: number | undefined;
}

export interface GroupByResult {
  key: string;
  headcount: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
}

export function groupBy<T extends GroupByEmployee>(
  employees: T[],
  keyFn: (e: T) => string
): GroupByResult[] {
  const active = employees.filter((e) => e.status === "ACTIVE");

  const groups = new Map<string, number[]>();
  for (const emp of active) {
    const key = keyFn(emp);
    if (typeof emp.currentSalaryUsd !== "number") continue;
    const arr = groups.get(key) ?? [];
    arr.push(emp.currentSalaryUsd);
    groups.set(key, arr);
  }

  const result: GroupByResult[] = [];
  for (const [key, salaries] of groups.entries()) {
    const sorted = [...salaries].sort((a, b) => a - b);
    const avgSalaryUsd = sorted.reduce((sum, s) => sum + s, 0) / sorted.length;
    result.push({
      key,
      headcount: sorted.length,
      avgSalaryUsd,
      medianSalaryUsd: median(sorted),
    });
  }

  result.sort((a, b) => b.headcount - a.headcount);
  return result;
}

export interface DistributionBucket {
  bucketLabel: string;
  min: number;
  max: number;
  count: number;
}

export function computeDistribution(
  salariesUsd: number[],
  bucketSizeUsd = 20000
): DistributionBucket[] {
  if (salariesUsd.length === 0) return [];

  const min = Math.min(...salariesUsd);
  const max = Math.max(...salariesUsd);

  const startBucket = Math.floor(min / bucketSizeUsd);
  const endBucket = Math.floor(max / bucketSizeUsd);

  const buckets: DistributionBucket[] = [];
  for (let b = startBucket; b <= endBucket; b++) {
    const bucketMin = b * bucketSizeUsd;
    const bucketMax = bucketMin + bucketSizeUsd;
    buckets.push({
      bucketLabel: `${bucketMin.toLocaleString()}-${bucketMax.toLocaleString()}`,
      min: bucketMin,
      max: bucketMax,
      count: 0,
    });
  }

  for (const salary of salariesUsd) {
    const idx = Math.floor(salary / bucketSizeUsd) - startBucket;
    buckets[idx].count += 1;
  }

  return buckets;
}

export interface PayEquityEmployee {
  department: string;
  gender: string;
  currentSalaryUsd: number | undefined;
  status: string;
}

export interface PayEquityResult {
  department: string;
  gender: string;
  avgSalaryUsd: number;
  headcount: number;
}

export function computePayEquity(employees: PayEquityEmployee[]): PayEquityResult[] {
  const active = employees.filter((e) => e.status === "ACTIVE");

  // Map<department, Map<gender, salaries[]>> avoids fragile string-key
  // concatenation/splitting when department or gender names contain spaces.
  const groups = new Map<string, Map<string, number[]>>();
  for (const emp of active) {
    if (typeof emp.currentSalaryUsd !== "number") continue;
    let byGender = groups.get(emp.department);
    if (!byGender) {
      byGender = new Map<string, number[]>();
      groups.set(emp.department, byGender);
    }
    const arr = byGender.get(emp.gender) ?? [];
    arr.push(emp.currentSalaryUsd);
    byGender.set(emp.gender, arr);
  }

  const result: PayEquityResult[] = [];
  for (const [department, byGender] of groups.entries()) {
    for (const [gender, salaries] of byGender.entries()) {
      const avgSalaryUsd = salaries.reduce((sum, s) => sum + s, 0) / salaries.length;
      result.push({ department, gender, avgSalaryUsd, headcount: salaries.length });
    }
  }

  result.sort((a, b) => {
    if (a.department !== b.department) return a.department.localeCompare(b.department);
    return a.gender.localeCompare(b.gender);
  });

  return result;
}
