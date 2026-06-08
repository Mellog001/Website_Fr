"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mpesaConfig = void 0;
const env_1 = require("./env");
const SANDBOX_BASE_URL = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE_URL = 'https://api.safaricom.co.ke';
exports.mpesaConfig = {
    baseUrl: env_1.env.MPESA_ENVIRONMENT === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL,
    consumerKey: env_1.env.MPESA_CONSUMER_KEY,
    consumerSecret: env_1.env.MPESA_CONSUMER_SECRET,
    shortCode: env_1.env.MPESA_SHORTCODE,
    passKey: env_1.env.MPESA_PASSKEY,
    callbackUrl: env_1.env.MPESA_CALLBACK_URL,
    // Daraja Endpoints
    oauthEndpoint: '/oauth/v1/generate?grant_type=client_credentials',
    stkPushEndpoint: '/mpesa/stkpush/v1/processrequest', // processrequest is actual trigger
    stkPushTriggerEndpoint: '/mpesa/stkpush/v1/processrequest',
    stkPushQueryEndpoint: '/mpesa/stkpush/v1/query',
};
//# sourceMappingURL=mpesa.js.map