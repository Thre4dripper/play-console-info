import {
  ArtifactNotFoundError,
  DefaultArtifactClient,
} from '@actions/artifact';
import { ArtifactArgs, ResultData } from '../types';
import { Logger } from './helpers';
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

  Logger.info(`Uploading artifact: ${name}`);
  Logger.info(`Artifact root directory: ${rootDirectory}`);
  Logger.info(`Artifact retention days: ${retentionDays}`);

  await deleteArtifactIfExists(name);

  //create a JSON file in the rootDirectory with the data
  const filePath = path.join(rootDirectory, name);
  Logger.debug(`Writing JSON data to: ${filePath}`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), {
    encoding: 'utf8',
  });

  Logger.info('Uploading artifact to GitHub Actions...');
  await artifactClient.uploadArtifact(name, [filePath], rootDirectory, {
    retentionDays: +retentionDays,
    compressionLevel: 0,
  });
  
  Logger.info('✅ Artifact uploaded successfully');
};

const deleteArtifactIfExists = async (name: string) => {
  try {
    await artifactClient.deleteArtifact(name);
  } catch (error) {
    if (error instanceof ArtifactNotFoundError) {
      Logger.debug(`Skipping deletion of '${name}', it does not exist`);
      return;
    }

    // Best effort, we don't want to fail the action if this fails
    Logger.debug(`Unable to delete artifact: ${(error as Error).message}`);
  }
};
