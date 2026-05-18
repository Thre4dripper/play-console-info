import { ResultData } from '../types.js';
import * as core from '@actions/core';
import { Logger } from './helpers.js';

export const setOutputs = async (result: ResultData) => {
  const outputs: string[] = [];

  // Check for tracks
  if ('tracks' in result) {
    core.setOutput('tracks', result.tracks);
    outputs.push('tracks');
  }

  // Check for apks
  if ('apks' in result) {
    core.setOutput('apks', result.apks);
    outputs.push('apks');
  }

  // Check for bundles
  if ('bundles' in result) {
    core.setOutput('bundles', result.bundles);
    outputs.push('bundles');
  }

  // Check for listings
  if ('listings' in result) {
    core.setOutput('listings', result.listings);
    outputs.push('listings');
  }

  // Check for images
  if ('images' in result) {
    core.setOutput('images', result.images);
    outputs.push('images');
  }

  // Check for inapps
  if ('inapps' in result) {
    core.setOutput('inapps', result.inapps);
    outputs.push('inapps');
  }

  // Check for reviews
  if ('reviews' in result) {
    core.setOutput('reviews', result.reviews);
    outputs.push('reviews');
  }

  // Check for voidedPurchases
  if ('voided_purchases' in result) {
    core.setOutput('voidedPurchases', result.voided_purchases);
    outputs.push('voidedPurchases');
  }

  // Check for testers
  if ('testers' in result) {
    core.setOutput('testers', result.testers);
    outputs.push('testers');
  }

  // Check for appDetails
  if ('app_details' in result) {
    core.setOutput('appDetails', result.app_details);
    outputs.push('appDetails');
  }

  // Check for expansionFiles
  if ('expansion_files' in result) {
    core.setOutput('expansionFiles', result.expansion_files);
    outputs.push('expansionFiles');
  }

  if (outputs.length > 0) {
    Logger.info(`Set outputs for: ${outputs.join(', ')}`);
  } else {
    Logger.warning('No outputs were set - no matching data found');
  }
};
