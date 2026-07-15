const { randomUUID } = require('crypto');

// Every request gets a unique ID, attached to req.id and echoed back as a
// response header. When a resident reports "my complaint update didn't
// send an email," you grep logs for this ID across every layer (tenant
// resolver, auth, service, notification) instead of guessing which
// request it was from a timestamp.
function requestIdMiddleware(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestIdMiddleware;
