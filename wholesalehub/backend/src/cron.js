const cron = require('node-cron');
const { query } = require('../db');
const { closePool } = require('../routes/pools');

// Run every 5 minutes - expire old offers
const expireOffers = cron.schedule('*/5 * * * *', async () => {
  try {
    const expired = await query(
      "SELECT id, buyer_id, seller_id FROM offers WHERE status = 'pending' AND expires_at < NOW()"
    );
    for (const offer of expired) {
      await query("UPDATE offers SET status='expired' WHERE id=?", [offer.id]);
      await query(
        "INSERT INTO notifications (user_id, type, title, message, data) VALUES (?,?,?,?,?)",
        [offer.buyer_id, 'offer_expired', 'Offer Expired', 'Your offer has expired', JSON.stringify({ offer_id: offer.id })]
      );
    }
    if (expired.length > 0) console.log(`Expired ${expired.length} offer(s)`);
  } catch (err) {
    console.error('Cron error (expireOffers):', err.message);
  }
});

// Run every minute - close pools past deadline
const closePools = cron.schedule('* * * * *', async () => {
  try {
    const pools = await query(
      "SELECT id FROM group_pools WHERE status = 'active' AND deadline <= NOW()"
    );
    for (const p of pools) {
      try {
        console.log(`Closing pool ${p.id}`);
        await closePool(p.id);
      } catch (err) {
        console.error(`Failed to close pool ${p.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Cron error (closePools):', err.message);
  }
});

module.exports = { expireOffers, closePools };
