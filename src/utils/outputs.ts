import { ResultData } from '../types';
import * as core from '@actions/core';

export const setOutputs = async (result: ResultData) => {
  // Check for tracks
  if ('tracks' in result) {
    core.setOutput('tracks', result.tracks);
  }

  // Check for apks
  if ('apks' in result) {
    core.setOutput('apks', result.apks);
  }

  // Check for bundles
  if ('bundles' in result) {
    core.setOutput('bundles', result.bundles);
  }

  // Check for listings
  if ('listings' in result) {
    core.setOutput('listings', result.listings);
  }

  // Check for images
  if ('images' in result) {
    core.setOutput('images', result.images);
  }

  // Check for inapps
  if ('inapps' in result) {
    core.setOutput('inapps', result.inapps);
  }

  // Check for reviews
  if ('reviews' in result) {
    core.setOutput('reviews', result.reviews);
  }

  // Check for voidedPurchases
  if ('voided_purchases' in result) {
    core.setOutput('voidedPurchases', result.voided_purchases);
  }

  // Check for testers
  if ('testers' in result) {
    core.setOutput('testers', result.testers);
  }

  // Check for appDetails
  if ('app_details' in result) {
    core.setOutput('appDetails', result.app_details);
  }

  // Check for expansionFiles
  if ('expansion_files' in result) {
    core.setOutput('expansionFiles', result.expansion_files);
  }
};
