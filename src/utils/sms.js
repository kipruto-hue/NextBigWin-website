const AfricasTalking = require('africastalking');

let client;

function getClient() {
  if (!client) {
    client = AfricasTalking({
      apiKey:   process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox',
    });
  }
  return client;
}

/**
 * Send an SMS via Africa's Talking.
 * @param {string|string[]} to      - Phone number(s) "254XXXXXXXXX"
 * @param {string}          message - SMS body (max 160 chars per SMS)
 */
async function sendSMS(to, message) {
  try {
    const sms = getClient().SMS;
    const result = await sms.send({
      to:   Array.isArray(to) ? to : [to],
      from: process.env.AT_SENDER_ID || 'NEXTBIGWIN',
      message,
    });
    return result;
  } catch (err) {
    console.error('[SMS] Failed to send:', err.message);
    throw err;
  }
}

/**
 * Pre-built SMS templates.
 */
const templates = {
  ticketConfirmed: (ticketId, drawDate) =>
    `🎟️ NextBigWin: Your ticket is confirmed!\n\nTicket ID: ${ticketId}\nDraw Date: ${drawDate}\n\nWatch the LIVE draw on TikTok/IG: @NextBigWinKe\nGood luck! 🍀`,

  ticketsBulk: (ticketIds, drawDate) =>
    `🎟️ NextBigWin: Your ${ticketIds.length} ticket(s) are confirmed!\n\nIDs: ${ticketIds.join(', ')}\nDraw: ${drawDate}\n\nWatch LIVE @NextBigWinKe\nGood luck! 🍀`,

  winner: (ticketId, prize) =>
    `🏆 CONGRATULATIONS from NextBigWin!\n\nYour ticket ${ticketId} has WON: ${prize}!\n\nCall us on +254700000000 to claim within 30 days.\nBring your National ID. You deserve this! 🎉`,

  claimReminder: (ticketId, daysLeft) =>
    `⏰ NextBigWin Reminder: You have ${daysLeft} days left to claim your prize for ticket ${ticketId}. Call +254700000000 now!`,
};

module.exports = { sendSMS, templates };
