/**
 * Create error
 */
function create(message) {
  const error =
    message instanceof Error
      ? message
      : new Error(message ? message : undefined);

  error.isConsul = true;

  return error;
}

/**
 * Create validation error
 */
function validation(message) {
  const error = create(message);

  error.isValidation = true;

  return error;
}

export { create as Consul, validation as Validation };
