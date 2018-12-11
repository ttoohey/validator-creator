/**
 * Error thrown by interrupted validations
 *
 */
export class ValidatorError extends Error {
  /**
   * Throw an error
   * @param {?Array.<ValidatorResult>} results - the stale results
   * @param {...*} params  - passed to Error constructor
   */
  constructor(results, ...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidatorError);
    }
    this.validatorErrorPayload = results;
  }
}

/**
 * Creates a {@link Validate} function based on the provided rules
 * @param  {RuleCollection} rules
 * @return {Validate} - The function to use to perform a validation.
 */
export function createValidator(rules) {
  const validate = validator(rules);
  const state = {
    cache: {},
    change: {},
    timeline: 0,
    active: false,
    blocked: []
  };
  return async (change = null, ...args) => {
    if (change !== null) {
      state.change = { ...state.change, ...change };
      state.cache = {};
    }
    const timeline = ++state.timeline;
    if (state.active) {
      await new Promise(resolve => state.blocked.push(resolve));
      if (timeline !== state.timeline) {
        throw new ValidatorError(null);
      }
    }
    state.active = true;
    if (state.cache.change !== state.change) {
      state.cache.change = state.change;
      state.cache.result = await validate(state.change, ...args);
    }
    state.active = false;
    state.blocked.forEach(resolve => resolve());
    state.blocked = [];
    if (timeline !== state.timeline) {
      throw new ValidatorError(state.cache.result);
    }
    const returnValue = [state.cache.result, state.cache.change];
    state.change = {};
    state.cache = {};
    state.timeline = 0;
    return returnValue;
  };
}

function validator(rules) {
  return async (change, asyncResult = null) => {
    if (!(asyncResult instanceof Map)) {
      asyncResult = new Map(asyncResult);
    }
    const asyncRules = Array.from(asyncResult.keys());
    const getAsyncResult = async (rule, prop) =>
      (await asyncResult.get(rule)).reduce(
        (result, item) => result || (item && item.prop === prop ? item : null),
        null
      );
    return (await Promise.all(
      Object.keys(change)
        .filter(prop => rules.hasOwnProperty(prop))
        .map(async prop => {
          for (let rule of rules[prop]) {
            let result;
            if (!asyncRules.includes(rule)) {
              result = rule(change, prop);
            } else {
              result = await getAsyncResult(rule, prop);
            }
            if (Promise.resolve(result) === result) {
              asyncRules.push(rule);
              asyncResult.set(rule, result);
              result = await getAsyncResult(rule, prop);
            }
            if (result === null) continue;
            return result;
          }
          return null;
        })
    )).filter(result => result !== null);
  };
}

/**
 * Helper for defining simple validation rules
 * @param  {string} type - names the rule
 * @param  {ValidateValue} validate - callback that accepts a value and returns a
 *   boolean; does the value pass or fail the rule?
 * @param  {GetPayload|*} payload - data to include in the result if the rule
 *   fails. If a function is provided it will be called with the result object
 *   and the response used as result.payload
 * @return {Rule} - function to call to apply the rule to a change; typically
 *   this is passed as part of a {@link RuleCollection} to {@link createValidator}
 */
export function createRule(type, validate, payload = null) {
  if (payload === null) {
    return (change, prop) =>
      validate(change[prop], change) ? null : { type, prop };
  }
  const getPayload =
    payload instanceof Function ? (...args) => payload(...args) : () => payload;
  return (change, prop) => {
    if (validate(change[prop], change)) {
      return null;
    }
    return { type, prop, payload: getPayload({ type, prop }, change) };
  };
}

/**
 * Helper for augmenting asynchronous validation rules with payloads.
 * @param  {function} validate - callback that accepts a `change` object and
 *   returns a list of { type, prop } objects for each element in the change
 *   that failed has a failing rule.
 * @param  {GetPayload|*} [payload=null] - data to augment the result with. If a
 *   function is provided it will be called with the result object and the
 *   response used as the result.payload
 * @return {AsyncRule} - function to call to apply the rule to a change; typically
 *   this is passed as part of a {@link RuleCollection} to {@link createValidator}
 */
export function createAsyncRule(validate, payload = null) {
  if (payload === null) {
    return validate;
  }
  const getPayload =
    payload instanceof Function ? (...args) => payload(...args) : () => payload;
  return async change =>
    (await validate(change)).map(result => ({
      ...result,
      payload: getPayload(result, change)
    }));
}

/**
 * Helper for transforming a list of validator results into a simpler object
 * mapping field names to payloads.
 *
 * @param {Array} args
 * @param {ValidatorResult} args.0 - List of validator result object containing { type, prop, payload }
 * @param {FormData} args.1 - The data the results apply to
 * @return {object} - The results reduced to {[prop]: payload, ...}
 */
export function getPayload([results, change]) {
  const cleared = Object.keys(change || {}).reduce(
    (o, k) => ({ ...o, [k]: null }),
    {}
  );
  return results.reduce(
    (o, { prop, payload }) => ({ ...o, [prop]: payload }),
    cleared
  );
}

/**
 * Perform an asynchronous validation of a change
 *
 * @async
 * @callback AsyncRule
 * @param {FormData} change - The data being validated
 * @return {Promise.<ValidatorResult[]>} - Contains an item for each field that failed
 */

/**
 * Data to apply a validation to
 *
 * @example
 *
 * {
 *   field1: "Field 1 value",
 *   field2: "Field 2 value"
 * }

 * @typedef {Object.<string, *>} FormData
 */

/**
 * Get payload data to augment a {@link ValidatorResult}
 *
 * @callback GetPayload
 * @param {ValidatorResult} result - Identifies the rule and field that failed the validation
 * @param {FormData} change - The change that caused the validation to be evaluated
 * @return {*} - Application specific data
 */

/**
 * Perform a validation of a value
 * @callback Rule
 * @param {FormData} change - The data being validated
 * @param {string} prop - The field in `change` to apply the validation to
 * @return {?ValidatorResult} - Returns null if the field passes the validation
 */

/**
 * Defines the rules that applies to each field
 * @typedef {Object.<string,Array.<Rule|AsyncRule>>} RuleCollection
 */

/**
 * This function is returned by {@link createValidator} to be used to perform a validation.
 *
 * @async
 * @function Validate
 * @param {FormData} change - The data to be validated
 * @return {Promise.<ValidateResult>} - result and merged change
 * @throws {ValidatorError} - if an asynchronous validation is interrupted
 */

/**
 * Return value from the {@link Validate} function
 *
 * @typedef {Array} ValidateResult
 * @property {ValidatorResult[]} 0
 * @property {FormData} 1
 */

/**
 * Validate a change object
 *
 * Used as the `validate` parameter to {@link createAsyncRule}
 *
 * @async
 * @callback ValidateFormData
 * @param {FormData} change - the data being validated
 * @return {Promise.<ValidatorResult[]>}
 */

/**
 * Validates a value to determine whether it passes a test.
 *
 * Used as the `validate` parameter to {@link CreateRule}.
 *
 * @example
 * function validateFilledValue(value, change) {
 *   return change[prop].length > 0
 * }
 * const filled = createRule('filled', validateFilledValue)
 *
 * @callback ValidateValue
 * @param {*} value - the value to be tested
 * @param {FormData} change - the data being validated
 * @return {boolean} - true if the value passes the validation; false otherwise
 */

/**
 * Indicates a validation has failed and identifies the rule and the prop that
 * triggered the failure.
 *
 * @example
 * {
 *   type: "rule1",
 *   prop: "field1",
 *   payload: "Rule 1 applies here"
 * }
 *
 * @typedef {Object} ValidatorResult
 * @property {!string} type - Identifies the rule
 * @property {!string} prop - Identifies the field
 * @property {?*} payload - Application specific data
 */
