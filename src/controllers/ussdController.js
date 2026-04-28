const Draw   = require('../models/Draw');
const Ticket = require('../models/Ticket');
const { stkPush, formatPhone } = require('../utils/mpesa');

// POST /api/ussd — Africa's Talking USSD handler
const handleUSSD = async (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  const phone = formatPhone(phoneNumber);
  const parts = text ? text.split('*') : [];
  const level = parts.length;

  let response = '';

  try {
    const draw = await Draw.findOne({ status: 'open' }).sort({ drawDate: 1 });

    // Level 0 — main menu
    if (text === '') {
      const drawInfo = draw
        ? `\nDraw Date: ${draw.drawDate.toDateString()}\nTickets Sold: ${draw.totalTickets.toLocaleString()}`
        : '\nNo active draw at the moment.';

      response = `CON 🎟️ Welcome to NextBigWin
Kenya's Largest Youth Raffle${drawInfo}

1. Buy Ticket (KES 100)
2. My Tickets
3. Check Ticket ID
4. About NextBigWin
0. Exit`;

    // Level 1 — main menu selection
    } else if (level === 1) {
      const choice = parts[0];

      if (choice === '1') {
        if (!draw) {
          response = `END ❌ No active draw right now.
Follow @NextBigWinKe on TikTok for updates.`;
        } else {
          response = `CON 🎟️ Buy Ticket (KES 100)
Grand Prize: ${draw.prizes[0]?.name || 'Amazing prizes'}

How many tickets? (1-10)
Each ticket = KES 100

Enter quantity:`;
        }

      } else if (choice === '2') {
        response = `CON Enter your M-PESA number to view tickets:
(e.g. 0712345678)`;

      } else if (choice === '3') {
        response = `CON Enter your Ticket ID to verify:`;

      } else if (choice === '4') {
        response = `END 🌟 About NextBigWin

Kenya's largest youth raffle.
Licensed by BCLB Kenya.
Draws every Friday at 8PM.
Watch LIVE on TikTok & Instagram @NextBigWinKe

Support: +254700000000`;

      } else if (choice === '0') {
        response = `END 👋 Thank you for using NextBigWin!
Good luck on the next draw!`;

      } else {
        response = `END ❌ Invalid option. Please try again.`;
      }

    // Level 2
    } else if (level === 2) {
      const choice   = parts[0];
      const userInput= parts[1];

      if (choice === '1') {
        // quantity entered
        const qty = parseInt(userInput, 10);
        if (isNaN(qty) || qty < 1 || qty > 10) {
          response = `END ❌ Invalid quantity. Enter a number between 1 and 10.`;
        } else {
          const total = qty * 100;
          const drawDate = draw?.drawDate.toDateString() || 'upcoming';
          response = `CON Confirm payment:
📱 Phone: ${phone.replace('254','0').replace(/(\d{4})(\d{3})(\d{3})/,'$1 $2 $3')}
🎟️ Tickets: ${qty}
💰 Total: KES ${total}

Draw: ${drawDate}

1. Yes, pay now
2. Cancel`;
        }

      } else if (choice === '2') {
        // phone number for my tickets lookup
        const lookupPhone = formatPhone(userInput);
        const tickets = await Ticket.find({ phone: lookupPhone, status: 'confirmed' })
          .populate('drawId', 'drawDate')
          .sort({ purchasedAt: -1 })
          .limit(5);

        if (tickets.length === 0) {
          response = `END No confirmed tickets found for this number.
Buy your first ticket: Dial *123# and select option 1.`;
        } else {
          const list = tickets.map((t, i) => `${i+1}. ${t.ticketId}`).join('\n');
          response = `END 🎟️ Your tickets (last 5):
${list}

Draw: ${tickets[0].drawId?.drawDate?.toDateString() || 'upcoming'}
Good luck! 🍀`;
        }

      } else if (choice === '3') {
        // Ticket ID verification
        const ticket = await Ticket.findOne({ ticketId: userInput.toUpperCase() });
        if (!ticket) {
          response = `END ❌ Ticket ID not found.
Check for typos and try again.`;
        } else {
          const statusLabel = ticket.status === 'won' ? '🏆 WINNER!' : ticket.status === 'confirmed' ? '✅ Valid' : ticket.status;
          response = `END 🎟️ Ticket: ${ticket.ticketId}
Status: ${statusLabel}
Purchased: ${ticket.purchasedAt?.toDateString()}

Good luck on draw day! 🍀`;
        }
      }

    // Level 3 — confirm purchase
    } else if (level === 3 && parts[0] === '1') {
      const qty    = parseInt(parts[1], 10);
      const choice = parts[2];

      if (choice === '2') {
        response = `END ❌ Payment cancelled.
Dial *123# anytime to try again. Good luck!`;

      } else if (choice === '1') {
        if (!draw) {
          response = `END ❌ No active draw. Follow @NextBigWinKe for updates.`;
        } else {
          const amount = qty * 100;
          try {
            const stkResponse = await stkPush(phone, amount, `USSD-${sessionId}`);

            if (stkResponse.ResponseCode === '0') {
              response = `END ✅ M-PESA request sent!
Check your phone and enter your M-PESA PIN to confirm KES ${amount}.

Your Ticket ID(s) will arrive via SMS.
Good luck! 🍀 — NextBigWin`;
            } else {
              response = `END ❌ Payment failed: ${stkResponse.CustomerMessage}
Please try again later.`;
            }
          } catch (err) {
            response = `END ❌ Payment error. Please try again or call +254700000000.`;
          }
        }
      } else {
        response = `END ❌ Invalid option.`;
      }

    } else {
      response = `END Session expired. Dial *123# to start again.`;
    }

  } catch (err) {
    console.error('[USSD] Error:', err.message);
    response = `END Something went wrong. Please try again later.\nSupport: +254700000000`;
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
};

module.exports = { handleUSSD };
