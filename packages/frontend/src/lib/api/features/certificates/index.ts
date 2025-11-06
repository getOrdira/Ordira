// src/lib/api/features/certificates/index.ts
// Certificates API barrel export

import certificateAccountApi from './certificateAccount.api';
import certificateBatchApi from './certificateBatch.api';
import certificateDataApi from './certificateData.api';
import certificateHelpersApi from './certificateHelpers.api';
import certificateMintingApi from './certificateMinting.api';
import certificateValidationApi from './certificateValidation.api';

export * from './certificateAccount.api';
export * from './certificateBatch.api';
export * from './certificateData.api';
export * from './certificateHelpers.api';
export * from './certificateMinting.api';
export * from './certificateValidation.api';

export {
  certificateAccountApi,
  certificateBatchApi,
  certificateDataApi,
  certificateHelpersApi,
  certificateMintingApi,
  certificateValidationApi,
};

export const certificatesApi = {
  account: certificateAccountApi,
  batch: certificateBatchApi,
  data: certificateDataApi,
  helpers: certificateHelpersApi,
  minting: certificateMintingApi,
  validation: certificateValidationApi,
};

export default certificatesApi;

