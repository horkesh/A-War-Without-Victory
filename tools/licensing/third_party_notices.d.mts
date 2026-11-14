export interface RuntimeExtra {
  name: string;
  reason: string;
}

export interface ShippedPackage {
  key: string;
  name: string;
  version: string;
  lockLicense: string;
  lockPaths: string[];
  platformSpecific: boolean;
  extraReason: string | null;
}

export interface LicenseRecord {
  license: string;
  copyright: string[];
  author: string;
  licenseTexts: string[];
  noticeTexts: string[];
  inheritedFrom: string | null;
}

export interface NoticesCoverage {
  missing: string[];
  stale: string[];
  markersFound: boolean;
}

export const NOTICES_FILE: 'THIRD_PARTY_NOTICES.md';
export const STATIC_SECTIONS_FILE: 'tools/licensing/third_party_notices_static.md';
export const GENERATOR_COMMAND: string;
export const PACKAGES_START: string;
export const PACKAGES_END: string;
export const NOT_DECLARED: 'NOT DECLARED';
export const RUNTIME_EXTRAS: readonly RuntimeExtra[];

export function strictCompare(a: string, b: string): number;
export function normaliseLicenseField(value: unknown): string;
export function collectShippedPackages(lock: unknown, extras?: readonly RuntimeExtra[]): ShippedPackage[];
export function extractCopyrightLines(text: string): string[];
export function formatAuthor(author: unknown): string;
export function readInstalledLicenseRecord(rootDir: string, pkg: ShippedPackage): LicenseRecord;
export function findPlatformParent(pkg: ShippedPackage, packages: ShippedPackage[]): ShippedPackage | null;
export function resolveLicenseRecords(rootDir: string, packages: ShippedPackage[]): Map<string, LicenseRecord>;
export function renderNotices(input: {
  packages: ShippedPackage[];
  records: Map<string, LicenseRecord>;
  staticSections: string;
}): string;
export function parseNoticePackageKeys(markdown: string): string[] | null;
export function checkNoticesCoverage(markdown: string, packages: ShippedPackage[]): NoticesCoverage;
export function buildNoticesForRoot(
  rootDir: string,
  options?: { extras?: readonly RuntimeExtra[] },
): { packages: ShippedPackage[]; records: Map<string, LicenseRecord>; markdown: string };
