// src/middleware/responseHandler.js
const responseHandler = {
  success: (res, payload = {}, message = 'Success') => {
    const base = { ok: true, message, timestamp: new Date().toISOString() }

    if (Array.isArray(payload)) {
      return res.json({ ...base, count: payload.length, data: payload })
    }
    if (typeof payload !== 'object') {
      return res.json({ ...base, data: payload })
    }
    return res.json({ ...base, ...payload })
  },

  error: (res, error, statusCode = 500) => {
    res.status(statusCode).json({
      ok: false,
      error: typeof error === 'string' ? error : error.message,
      timestamp: new Date().toISOString()
    })
  },

  notFound: (res, message = 'Resource not found') => {
    res.status(404).json({
      ok: false,
      error: message,
      timestamp: new Date().toISOString()
    })
  },

  badRequest: (res, message = 'Bad request') => {
    res.status(400).json({
      ok: false,
      error: message,
      timestamp: new Date().toISOString()
    })
  },

  unauthorized: (res, message = 'Unauthorized') => {
    res.status(401).json({
      ok: false,
      error: message,
      timestamp: new Date().toISOString()
    })
  }
}

module.exports = responseHandler