import { env } from './env';

const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';

export const mpesaConfig = {
  baseUrl: env.MPESA_ENVIRONMENT === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL,
  consumerKey: env.MPESA_CONSUMER_KEY,
  consumerSecret: env.MPESA_CONSUMER_SECRET,
  shortCode: env.MPESA_SHORTCODE,
  passKey: env.MPESA_PASSKEY,
  callbackUrl: env.MPESA_CALLBACK_URL,
  
  // Daraja Endpoints
  oauthEndpoint: '/oauth/v1/generate?grant_type=client_credentials',
  stkPushEndpoint: '/mpesa/stkpush/v1/processrequest', // processrequest is actual trigger
  stkPushTriggerEndpoint: '/mpesa/stkpush/v1/processrequest',
  stkPushQueryEndpoint: '/mpesa/stkpush/v1/query',
};
