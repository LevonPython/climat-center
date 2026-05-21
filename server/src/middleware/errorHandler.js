/** @returns {boolean} */
function isPostgresQueryError(err) {
  return (
    !!err &&
    typeof err === 'object' &&
    typeof err.code === 'string' &&
    err.code.length === 5 &&
    /^[0-9A-Z]{5}$/.test(err.code)
  );
}

function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  let status = err.statusCode || err.status || 500;
  let message = typeof err.message === 'string' && err.message.trim() !== '' ? err.message : 'Internal Server Error';

  if (isPostgresQueryError(err)) {
    if (err.code === '23503') {
      status = 400;
      message = 'Invalid reference';
    } else if (err.code === '23505') {
      status = 409;
      message = 'Already exists';
    } else {
      status = 500;
      message = 'Internal Server Error';
    }
  } else if (typeof status !== 'number' || status < 400 || status > 599) {
    status = 500;
    message = 'Internal Server Error';
  }

  res.status(status).json({
    ok: false,
    error: {
      message,
      status
    }
  });
}

module.exports = { errorHandler };
