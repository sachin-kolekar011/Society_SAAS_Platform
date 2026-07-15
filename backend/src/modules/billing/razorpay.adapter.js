const crypto = require('crypto');
const env = require('../../config/env');

// No Razorpay SDK dependency for order creation -- their REST API is a
// single POST, and pulling in a whole SDK for one call adds a dependency
// for no real benefit. Order creation uses fetch directly; signature
// verification is pure HMAC (documented Razorpay algorithm), needing no
// SDK at all.

async function createOrder(amountInPaise, receipt) {
  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountInPaise, currency: 'INR', receipt }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Razorpay order creation failed: ${body}`);
  }
  return response.json(); // { id, amount, currency, ... }
}

// Razorpay's documented verification: HMAC-SHA256 of "order_id|payment_id"
// using the key SECRET (never the key id), compared against the signature
// their checkout widget returns. This is what actually proves a payment
// callback wasn't forged by someone just POSTing a fake "success" to our
// verify endpoint -- the signature can't be produced without the secret,
// which never leaves the server.
function verifySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return expected === razorpaySignature;
}

module.exports = { createOrder, verifySignature };
