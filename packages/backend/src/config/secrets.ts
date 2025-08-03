// src/config/secrets.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config as dotenvConfig } from 'dotenv';

// Load any local .env values (e.g. GCP_PROJECT_ID, GCP_SECRET_NAME)
dotenvConfig();

const projectId  = process.env.GCP_PROJECT_ID!;
const secretName = process.env.GCP_SECRET_NAME!;   // e.g. "prod-despoke-secrets"

if (!projectId) {
  throw new Error('Missing GCP_PROJECT_ID in environment');
}
if (!secretName) {
  throw new Error('Missing GCP_SECRET_NAME in environment');
}

const client = new SecretManagerServiceClient();

export async function loadSecrets(): Promise<void> {
  // Build the resource name of the secret version we want
  // using "latest" to always fetch the current value.
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  // Access the secret version.
  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString('utf8');
  if (!payload) {
    throw new Error(`Secret ${name} has no payload`);
  }

  let secrets: Record<string,string>;
  try {
    secrets = JSON.parse(payload);
  } catch (e) {
    throw new Error(`Failed to parse JSON from secret ${name}: ${e}`);
  }

  // Merge into process.env, without overwriting any already-set vars
  for (const [k,v] of Object.entries(secrets)) {
    if (!process.env[k]) {
      process.env[k] = v;
    }
  }
}
