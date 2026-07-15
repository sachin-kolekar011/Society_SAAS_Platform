const { ValidationError } = require('../errors');

// One generic middleware for every module's validator -- takes a Zod
// schema shaped like { body?, query?, params? } and validates the
// matching parts of the request. Keeps validation declarative in each
// module's *.validator.js instead of repeated by hand in controllers.
function validate(schema) {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        // Drop the body/query/params wrapper segment -- issue.path is
        // ['body','email'] because the schema validates the whole
        // { body, query, params } envelope at once, but that's an
        // internal wrapping detail. API consumers should see "email",
        // not "body.email". Found by a failing unit test, not by
        // inspection -- the test asserted field === 'email' and got
        // 'body.email' back.
        field: issue.path.slice(1).join('.') || issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ValidationError('Validation failed', details));
    }

    // Write the COERCED output back onto req -- without this, z.coerce.number()
    // and z.coerce.boolean() only validate the raw string input and are
    // silently discarded, leaving req.query.page etc. as strings. Found
    // during audit: this made `?sortOverdueFirst=false` evaluate as truthy
    // downstream, since a non-empty string is truthy in JS regardless of
    // its content.
    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query;
    if (result.data.params) req.params = result.data.params;

    next();
  };
}

module.exports = validate;
