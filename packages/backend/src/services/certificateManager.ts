// src/services/certificateManager.ts

import fs from 'fs/promises';
import path from 'path';
import acme, { forge } from 'acme-client';

// Pull your Cloudflare token from env
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!CLOUDFLARE_API_TOKEN) {
  throw new Error('Missing CLOUDFLARE_API_TOKEN in environment');
}

// Import Cloudflare at runtime and cast to `any` to avoid TS definition mismatches
const Cloudflare: any = require('cloudflare');
const cf = new Cloudflare({ token: CLOUDFLARE_API_TOKEN });

const CERT_DIR = process.env.CERT_STORAGE_DIR || 'certs';

/** Create and return a fully-configured ACME client. */
async function getAcmeClient(): Promise<acme.Client> {
  // Generate a new account key (PEM string)
  const accountKey = await forge.createPrivateKey();

  return new acme.Client({
    directoryUrl: acme.directory.letsencrypt.production,
    accountKey
  });
}

/** Create a TXT record in Cloudflare and return its record ID. */
async function setDnsTxtRecord(
  zoneId: string,
  recordName: string,
  recordValue: string
): Promise<string> {
  const rec = await cf.dnsRecords.add(zoneId, {
    type:    'TXT',
    name:    recordName,
    content: recordValue,
    ttl:     120
  });
  return rec.id;
}

/** Remove a TXT record from Cloudflare by its record ID. */
async function deleteDnsTxtRecord(
  zoneId:   string,
  recordId: string
): Promise<void> {
  await cf.dnsRecords.del(zoneId, recordId);
}

/**
 * Provisions a Let's Encrypt certificate for `hostname` via DNS-01,
 * using Cloudflare to fulfill the TXT challenges.
 */
export async function provisionCertForHost(hostname: string): Promise<void> {
  // 1) Create ACME client
  const client = await getAcmeClient();

  // 2) Place a new order for the hostname
  const order = await client.createOrder({
    identifiers: [{ type: 'dns', value: hostname }]
  });

  // 3) Fetch authorizations (one per identifier)
  const authorizations = await client.getAuthorizations(order);

  // 4) Determine your Cloudflare zone ID for this hostname
  //    e.g. if hostname "sub.example.com", zoneName = "example.com"
  const parts    = hostname.split('.');
  const zoneName = parts.slice(-2).join('.');
  const zonesRes = await cf.zones.browse({ name: zoneName });
  if (!zonesRes.result || zonesRes.result.length === 0) {
    throw new Error(`Cloudflare zone not found for ${zoneName}`);
  }
  const zoneId = zonesRes.result[0].id;

  // 5) For each authorization, complete the DNS-01 challenge
for (const auth of authorizations) {
  // grab the DNS-01 challenge entry (typed as any)
  const challenge = (auth as any).challenges.find((c: any) => c.type === 'dns-01');
  if (!challenge) {
    throw new Error(`No DNS-01 challenge found for ${auth.identifier.value}`);
  }

  // Compute the key authorization
  const keyAuth    = await client.getChallengeKeyAuthorization(challenge);
  const recordName = `_acme-challenge.${hostname}`;

  // 5a) Create the TXT record in Cloudflare
  const recordId = await setDnsTxtRecord(zoneId, recordName, keyAuth);

  // 5b) Tell ACME it’s ready, then complete
  await client.verifyChallenge(auth, challenge);
  await client.completeChallenge(challenge);

  // 5c) Wait for validation
  await client.waitForValidStatus(challenge);

  // 5d) Clean up the DNS record
  await deleteDnsTxtRecord(zoneId, recordId);
}

  // 6) Wait until the order is ready to finalize
  await client.waitForValidStatus(order);

  // 7) Generate a CSR and private key for this hostname
  const [privateKeyPem, csr] = await forge.createCsr({
    commonName: hostname
  });

  // 8) Finalize the order and download the cert chain
  await client.finalizeOrder(order, csr);
  const certPem      = await client.getCertificate(order);
  const fullchainPem = certPem; // acme-client returns full chain by default

  // 9) Persist to disk
  const dir = path.join(CERT_DIR, hostname);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'privkey.pem'), privateKeyPem);
  await fs.writeFile(path.join(dir, 'cert.pem'), certPem);
  await fs.writeFile(path.join(dir, 'fullchain.pem'), fullchainPem);
}

