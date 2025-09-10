import path from 'path';
import os from 'os';
import * as core from '@actions/core';
import fs from 'fs';

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    core.setFailed(message);
    process.exit(1);
  }
}

export const getExecutablePath = (): string => {
  const basePath = path.join(process.cwd(), 'cli', 'dist');
  switch (os.platform()) {
    case 'win32':
      return path.join(basePath, 'play_console_cli.exe');
    case 'darwin':
    case 'linux':
      return path.join(basePath, 'play_console_cli');
    default:
      throw new ActionError(`Unknown platform: ${os.platform()}`);
  }
};

export const getPackage = (): string => {
  const pkg = core.getInput('package');
  if (!pkg) {
    throw new ActionError("Input 'package' is required.");
  }
  return pkg;
};

export const getServiceAccountJsonPath = (): string => {
  const serviceAccountJsonPath = core.getInput('serviceAccountJsonPath', {
    required: false,
  });
  core.setOutput('serviceAccountJsonPath', serviceAccountJsonPath);
  if (serviceAccountJsonPath) {
    if (!fs.existsSync(serviceAccountJsonPath)) {
      throw new ActionError(
        `Credentials file not found at path: ${serviceAccountJsonPath}`
      );
    }
    return serviceAccountJsonPath;
  }

  const serviceAccountJsonPlainText = core.getInput(
    'serviceAccountJsonPlainText',
    { required: false }
  );

  if (serviceAccountJsonPlainText) {
    const tempFilePath = path.join(
      os.tmpdir(),
      `gplaycli-creds-${Date.now()}.json`
    );
    fs.writeFileSync(tempFilePath, serviceAccountJsonPlainText);
    return tempFilePath;
  }

  throw new ActionError(
    "Either 'serviceAccountJsonPath' or 'serviceAccountJsonPlainText' input must be provided."
  );
};

export const getArguments = (): string[] => {
  const resourceRequestInputs: Record<string, string> = {
    tracks: core.getInput('tracks', { required: false }), // Comma-separated tracks, supported: production, beta, alpha, internal, default: all
    apks: core.getInput('apks', { required: false }), // boolean, default: false
    bundles: core.getInput('bundles', { required: false }), // boolean, default: false
    listings: core.getInput('listings', { required: false }), // boolean, default: false
    images: core.getInput('images', { required: false }), // Comma-separated image types, supported: icon, featureGraphic, promoGraphic, tvBanner, phoneScreenshots, sevenInchScreenshots, tenInchScreenshots, tvScreenshots, wearScreenshots, default: all
    inapps: core.getInput('inapps', { required: false }), // boolean, default: false
    reviews: core.getInput('reviews', { required: false }), // boolean, default: false
    voidedPurchases: core.getInput('voidedPurchases', { required: false }), // boolean, default: false
    testers: core.getInput('testers', { required: false }), // Comma-separated testers, supported: internal, alpha, beta, production, default: all
    appDetails: core.getInput('appDetails', { required: false }), // boolean, default: false
    expansionFiles: core.getInput('expansionFiles', { required: false }), // boolean, default: false
    all: core.getInput('all', { required: false }), // boolean, default: false
  };

  // either tracks, apks, bundles, listings, images, inapps, reviews, voided_purchases, testers, app_details, expansion_files or all must be true
  if (!Object.values(resourceRequestInputs).some((value) => !!value)) {
    throw new ActionError(
      "At least one of the following inputs must be set to true: 'tracks', 'apks', 'bundles', 'listings', 'images', 'inapps', 'reviews', 'voided_purchases', 'testers', 'app_details', 'expansion_files', or 'all'."
    );
  }

  const resourceOptionsInputs: Record<string, string> = {
    imagesLanguage: core.getInput('imagesLanguage'), // comma-separated BCP-47 language codes, e.g. en-US, fr-FR, default: en-US
    reviewsPages: core.getInput('reviewsPages'), // number of review pages to fetch, each page contains reviewsPageSize reviews, default: 1
    reviewsPageSize: core.getInput('reviewsPageSize'), // number of reviews per page, default: 100, max: 200
  };

  const args: string[] = [];

  // tracks
  if (resourceRequestInputs.tracks) {
    args.push('--tracks', resourceRequestInputs.tracks);
  }
  // apks
  if (resourceRequestInputs.apks === 'true') {
    args.push('--apks');
  }
  // bundles
  if (resourceRequestInputs.bundles === 'true') {
    args.push('--bundles');
  }
  // listings
  if (resourceRequestInputs.listings === 'true') {
    args.push('--listings');
  }
  // images
  if (resourceRequestInputs.images) {
    args.push('--images', resourceRequestInputs.images);
    if (resourceOptionsInputs.imagesLanguage) {
      args.push('--images-language', resourceOptionsInputs.imagesLanguage);
    }
  }
  // inapps
  if (resourceRequestInputs.inapps === 'true') {
    args.push('--inapps');
  }
  // reviews
  if (resourceRequestInputs.reviews === 'true') {
    args.push('--reviews');
    if (resourceOptionsInputs.reviewsPages) {
      args.push('--reviews-pages', resourceOptionsInputs.reviewsPages);
    }
    if (resourceOptionsInputs.reviewsPageSize) {
      args.push('--reviews-page-size', resourceOptionsInputs.reviewsPageSize);
    }
  }
  // voided_purchases
  if (resourceRequestInputs.voidedPurchases === 'true') {
    args.push('--voided-purchases');
  }
  // testers
  if (resourceRequestInputs.testers) {
    args.push('--testers', resourceRequestInputs.testers);
  }
  // app_details
  if (resourceRequestInputs.appDetails === 'true') {
    args.push('--app-details');
  }
  // expansion_files
  if (resourceRequestInputs.expansionFiles === 'true') {
    args.push('--expansion-files');
  }
  // all
  if (resourceRequestInputs.all === 'true') {
    args.push('--all');
  }

  return args;
};