// Wraps an async controller so a rejected promise reaches Express's error
// handling instead of becoming an unhandled rejection. Every controller in
// every module uses this -- it's the one bit of boilerplate that replaces
// writing try/catch in every single controller function.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
