/**
 * Extracts a human-readable error message from an API error response.
 * Handles both plain string details and Pydantic validation error objects.
 */
export const getErrorMessage = (error, defaultMsg = 'Something went wrong') => {
  if (!error.response || !error.response.data) {
    return error.message || defaultMsg;
  }

  const detail = error.response.data.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    // Pydantic validation errors format: [{ msg, loc, type, input, url }]
    const firstError = detail[0];
    if (firstError && typeof firstError === 'object') {
      // If we have a 'loc' (location), we can make it more descriptive
      if (Array.isArray(firstError.loc) && firstError.loc.length > 1) {
        const field = firstError.loc[firstError.loc.length - 1];
        return `${field}: ${firstError.msg}`;
      }
      return firstError.msg || defaultMsg;
    }
  }

  return defaultMsg;
};
