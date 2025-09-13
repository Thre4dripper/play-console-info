import { ResultData } from './types';
import * as core from '@actions/core';

export const setTracks = async (result: ResultData) => {
  // Check for tracks
  if ('tracks' in result) {
    core.setOutput('tracks', result.tracks);
  }
};

export const setApks = async (result: ResultData) => {
  // Check for apks
  if ('apks' in result) {
    core.setOutput('apks', result.apks);
  }
}

export const setBundles = async (result: ResultData) => {
  // Check for bundles
  if ('bundles' in result) {
    core.setOutput('bundles', result.bundles);
  }
}

export const setListings = async (result: ResultData) => {
  // Check for listings
  if ('listings' in result) {
    core.setOutput('listings', result.listings);
  }
}

export const setImages = async (result: ResultData) => {
  // Check for images
  if ('images' in result) {
    core.setOutput('images', result.images);
  }
}

export const setInapps = async (result: ResultData) => {
  // Check for inapps
  if ('inapps' in result) {
    core.setOutput('inapps', result.inapps);
  }
}

export const setReviews = async (result: ResultData) => {
  // Check for reviews
  if ('reviews' in result) {
    core.setOutput('reviews', result.reviews);
  }
}

export const setVoidedPurchases = async (result: ResultData) => {
  // Check for voidedPurchases
  if ('voidedPurchases' in result) {
    core.setOutput('voidedPurchases', result.voidedPurchases);
  }
}

export const setTesters = async (result: ResultData) => {
  // Check for testers
  if ('testers' in result) {
    core.setOutput('testers', result.testers);
  }
}

export const setAppDetails = async (result: ResultData) => {
  // Check for appDetails
  if ('appDetails' in result) {
    core.setOutput('appDetails', result.appDetails);
  }
}

export const setExpansionFiles = async (result: ResultData) => {
  // Check for expansionFiles
  if ('expansionFiles' in result) {
    core.setOutput('expansionFiles', result.expansionFiles);
  }
}