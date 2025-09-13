export type runProps = {
  command: string;
  args: string[];
};

// Result Types
export type ReleaseNote = {
  language: string;
  text: string;
};

export type Release = {
  name: string;
  versionCodes: string[];
  releaseNotes: ReleaseNote[];
  status: string;
};

export type Track = {
  track: string;
  releases?: Release[];
};

export type TracksResponse = {
  kind: string;
  tracks: Track[];
};

export type ApksResponse = {
  kind: string;
};

export type Bundle = {
  versionCode: number;
  sha1: string;
  sha256: string;
};

export type BundlesResponse = {
  kind: string;
  bundles: Bundle[];
};

export type Listing = {
  language: string;
  title: string;
  fullDescription: string;
  shortDescription: string;
};

export type ListingsResponse = {
  kind: string;
  listings: Listing[];
};

export type Image = {
  id: string;
  url: string;
  sha1: string;
  sha256: string;
};

export type ImageGroup = {
  images: Image[];
};

export type Images = {
  icon: ImageGroup;
  featureGraphic: ImageGroup;
  tvBanner: Record<string, unknown>;
  phoneScreenshots: ImageGroup;
  sevenInchScreenshots: Record<string, unknown>;
  tenInchScreenshots: Record<string, unknown>;
  tvScreenshots: Record<string, unknown>;
  wearScreenshots: Record<string, unknown>;
};

export type TokenPagination = {
  previousPageToken: string;
};

export type InappsResponse = {
  kind: string;
  tokenPagination: TokenPagination;
};

export type ReviewsResponse = {
  count: number;
  reviews: unknown[];
};

export type VoidedPurchasesResponse = {
  count: number;
  voidedPurchases: unknown[];
};

export type GoogleGroups = {
  googleGroups: unknown[];
};

export type Testers = {
  internal: Record<string, unknown>;
  alpha: Record<string, unknown>;
  beta: Record<string, unknown>;
  production: GoogleGroups;
};

export type AppDetails = {
  defaultLanguage: string;
  contactEmail: string;
};

export type ExpansionFiles = {
  apks: Record<string, unknown>;
};

export type ResultData = {
  tracks: TracksResponse;
  apks: ApksResponse;
  bundles: BundlesResponse;
  listings: ListingsResponse;
  images: Images;
  inapps: InappsResponse;
  reviews: ReviewsResponse;
  voided_purchases: VoidedPurchasesResponse;
  testers: Testers;
  app_details: AppDetails;
  expansion_files: ExpansionFiles;
};