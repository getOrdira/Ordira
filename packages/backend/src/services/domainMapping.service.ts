// src/services/domainMapping.service.ts

import { google, run_v1 } from 'googleapis';

const run = google.run('v1');

/**
 * Creates a Cloud Run Domain Mapping for a given service, returning
 * the DNS resourceRecords you need to configure.
 */
export async function createDomainMapping(
  projectId:   string,
  region:      string,
  serviceName: string,
  domainName:  string
): Promise<run_v1.Schema$DomainMapping> {
  // 1) Acquire application default credentials
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  // 2) Build parent path
  const parent = `projects/${projectId}/locations/${region}`;

  // 3) Call the DomainMappings.create endpoint
  const res = await run.projects.locations.domainmappings.create({
    auth,
    parent,
    requestBody: {
      metadata: { name: domainName },
      spec: {
        routeName:       serviceName,
        certificateMode: 'AUTOMATIC'
      }
    }
  });

  // 4) Return the created DomainMapping resource
  //    The caller can read `.status.resourceRecords` to get the DNS entries
  return res.data;
}

