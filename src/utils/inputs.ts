import { ActionError } from './helpers';
import * as core from '@actions/core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ArtifactArgs } from '../types';

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
  if (serviceAccountJsonPath && fs.existsSync(serviceAccountJsonPath.trim())) {
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

export const getCliArguments = (): string[] => {
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

  // Validate resource request inputs
  validateResourceRequestInputs(resourceRequestInputs);

  const resourceOptionsInputs: Record<string, string> = {
    imagesLanguage: core.getInput('imagesLanguage', { required: false }), // comma-separated BCP-47 language codes, e.g. en-US, fr-FR, default: en-US
    reviewsPages: core.getInput('reviewsPages', { required: false }), // number of review pages to fetch, each page contains reviewsPageSize reviews, default: 1
    reviewsPageSize: core.getInput('reviewsPageSize', { required: false }), // number of reviews per page, default: 100, max: 200
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

const validateResourceRequestInputs = (
  inputs: Record<string, string>
): void => {
  // either tracks, apks, bundles, listings, images, inapps, reviews, voided_purchases, testers, app_details, expansion_files or all must be true
  if (!Object.values(inputs).some((value) => !!value)) {
    throw new ActionError(
      "At least one of the following inputs must be set: 'tracks', 'apks', 'bundles', 'listings', 'images', 'inapps', 'reviews', 'voided_purchases', 'testers', 'app_details', 'expansion_files', or 'all'."
    );
  }

  // validate tracks input
  if (inputs.tracks) {
    const validTracks = ['production', 'beta', 'alpha', 'internal', 'all'];
    const tracks = inputs.tracks.split(',').map((t) => t.trim());
    for (const track of tracks) {
      if (!validTracks.includes(track)) {
        throw new ActionError(
          `Invalid track: ${track}. Valid tracks are: ${validTracks.join(', ')}`
        );
      }
    }
  }

  // validate images input
  if (inputs.images) {
    const validImageTypes = [
      'icon',
      'featureGraphic',
      'promoGraphic',
      'tvBanner',
      'phoneScreenshots',
      'sevenInchScreenshots',
      'tenInchScreenshots',
      'tvScreenshots',
      'wearScreenshots',
      'all',
    ];
    const images = inputs.images.split(',').map((i) => i.trim());
    for (const image of images) {
      if (!validImageTypes.includes(image)) {
        throw new ActionError(
          `Invalid image type: ${image}. Valid image types are: ${validImageTypes.join(
            ', '
          )}`
        );
      }
    }
  }

  // validate testers input
  if (inputs.testers) {
    const validTesters = ['internal', 'alpha', 'beta', 'production', 'all'];
    const testers = inputs.testers.split(',').map((t) => t.trim());
    for (const tester of testers) {
      if (!validTesters.includes(tester)) {
        throw new ActionError(
          `Invalid tester: ${tester}. Valid testers are: ${validTesters.join(
            ', '
          )}`
        );
      }
    }
  }
};

export const getArtifactsInputs = (): ArtifactArgs => {
  const artifactsInputs: Record<string, string> = {
    uploadOutputsArtifact: core.getInput('uploadOutputsArtifact', {
      required: false,
    }), // boolean, default: false
    outputsJsonPath: core.getInput('outputsJsonPath', { required: false }), // string, default: artifacts/
    outputsArtifactName: core.getInput('outputsArtifactName', {
      required: false,
    }), // string, default: play-console-outputs
    outputsArtifactRetentionDays: core.getInput(
      'outputsArtifactRetentionDays',
      {
        required: false,
      }
    ), // string, default: 1
  };

  // Check if outputsJsonPath exists, if not, create it
  if (artifactsInputs.outputsJsonPath) {
    const outputsPath = artifactsInputs.outputsJsonPath.trim();
    if (!fs.existsSync(outputsPath)) {
      fs.mkdirSync(outputsPath, { recursive: true });
    }
  } else {
    // Set the default path if not provided
    const defaultPath = path.join(process.cwd(), 'artifacts');
    artifactsInputs.outputsJsonPath = defaultPath;
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true });
    }
  }

  // Validate artifact inputs
  validateArtifactInputs(artifactsInputs);

  return {
    uploadOutputsArtifact: artifactsInputs.uploadOutputsArtifact === 'true',
    outputsJsonPath: artifactsInputs.outputsJsonPath,
    outputsArtifactName: artifactsInputs.outputsArtifactName + '.json',
    outputsArtifactRetentionDays: artifactsInputs.outputsArtifactRetentionDays,
  };
};

const validateArtifactInputs = (inputs: Record<string, string>): void => {
  // uploadOutputsArtifact must be true or false
  if (
    inputs.uploadOutputsArtifact &&
    !['true', 'false'].includes(inputs.uploadOutputsArtifact)
  ) {
    throw new ActionError(
      "Input 'uploadOutputsArtifact' must be either 'true' or 'false'."
    );
  }

  // outputsArtifactRetentionDays must be a positive integer between 1 and 90
  if (inputs.outputsArtifactRetentionDays) {
    const retentionDays = parseInt(inputs.outputsArtifactRetentionDays, 10);
    if (isNaN(retentionDays) || retentionDays < 1 || retentionDays > 90) {
      throw new ActionError(
        "Input 'outputsArtifactRetentionDays' must be a positive integer between 1 and 90."
      );
    }
  }
};
