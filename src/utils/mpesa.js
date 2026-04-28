const axios = require('axios');

const BASE_URL = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

/**
 * Fetch OAuth access token from Daraja API.
 */
async function getAccessToken() {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth   = Buffer.from(`${key}:${secret}`).toString('base64');

  const { data } = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return data.access_token;
}

/**
 * Initiate M-PESA STK Push (Lipa Na M-PESA Online).
 * @param {string} phone   - Customer phone "254XXXXXXXXX"
 * @param {number} amount  - Amount in KES (100, 500, 1000…)
 * @param {string} orderId - Reference (e.g. "NBW-BUY-5T")
 */
async function stkPush(phone, amount, orderId) {
  const token      = await getAccessToken();
  const shortcode  = process.env.MPESA_SHORTCODE;
  const passkey    = process.env.MPESA_PASSKEY;
  const timestamp  = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password   = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            amount,
      PartyA:            phone,
      PartyB:            shortcode,
      PhoneNumber:       phone,
      CallBackURL:       process.env.MPESA_CALLBACK_URL,
      AccountReference:  orderId,
      TransactionDesc:   `NextBigWin Ticket(s) - ${orderId}`,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;  // { MerchantRequestID, CheckoutRequestID, ResponseCode, CustomerMessage }
}

/**
 * Query STK push status.
 */
async function stkQuery(checkoutRequestId) {
  const token     = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey   = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

/**
 * Format phone number to "254XXXXXXXXX".
 * Accepts: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
function formatPhone(raw) {
  const clean = raw.replace(/\s+/g, '').replace(/^\+/, '');
  if (clean.startsWith('254')) return clean;
  if (clean.startsWith('0'))   return `254${clean.slice(1)}`;
  return `254${clean}`;
}

/**
 * Mask phone for public display: "0712***678"
 */
function maskPhone(phone) {
  const local = phone.startsWith('254') ? `0${phone.slice(3)}` : phone;
  return `${local.slice(0, 4)}***${local.slice(-3)}`;
}

module.exports = { getAccessToken, stkPush, stkQuery, formatPhone, maskPhone };
