import {
  ArtifactNotFoundError,
  DefaultArtifactClient,
} from '@actions/artifact';
import * as core from '@actions/core';
import { ArtifactArgs, ResultData } from '../types';
import fs from 'fs';
import path from 'path';

const artifactClient = new DefaultArtifactClient();

export const createArtifact = async (
  artifactArgs: ArtifactArgs,
  data: ResultData
) => {
  const {
    uploadOutputsArtifact: isUploadArtifact,
    outputsArtifactName: name,
    outputsJsonPath: rootDirectory,
    outputsArtifactRetentionDays: retentionDays,
  } = artifactArgs;

  if (!isUploadArtifact) {
    return;
  }

  core.info(`Uploading artifact: ${name}`);
  core.info(`Artifact root directory: ${rootDirectory}`);
  core.info(`Artifact retention days: ${retentionDays}`);

  await deleteArtifactIfExists(name);

  //create a JSON file in the rootDirectory with the data
  const filePath = path.join(rootDirectory, name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
    encoding: 'utf8',
  });

  await artifactClient.uploadArtifact(name, [filePath], rootDirectory, {
    retentionDays: +retentionDays,
    compressionLevel: 0,
  });
};

const deleteArtifactIfExists = async (name: string) => {
  try {
    await artifactClient.deleteArtifact(name);
  } catch (error) {
    if (error instanceof ArtifactNotFoundError) {
      core.debug(`Skipping deletion of '${name}', it does not exist`);
      return;
    }

    // Best effort, we don't want to fail the action if this fails
    core.debug(`Unable to delete artifact: ${(error as Error).message}`);
  }
};
