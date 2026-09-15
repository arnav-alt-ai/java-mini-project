export type StoredReport = {
  id: string;
  reporterId: string;
  type: string;
  description: string;
  location: string;
  status: "Active" | "Responding" | "Resolved";
  createdAt: string;
  photo?: string;
};

const reports: StoredReport[] = [];

export const addReport = (report: Omit<StoredReport, "id" | "createdAt">) => {
  const storedReport: StoredReport = {
    ...report,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  reports.unshift(storedReport);
  return storedReport;
};

export const getReportsForReporter = (reporterId: string) =>
  reports.filter((report) => report.reporterId === reporterId);

export const getAllReports = () => [...reports];