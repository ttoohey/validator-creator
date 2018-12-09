export class ValidatorError extends Error {
  constructor(results, ...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidatorError);
    }
    this.validatorErrorPayload = results;
  }
}

/**
 * Creates a validator function based on the provided rules
 * @param  {object} rules - Keys are the field names; the values are a list of
 *     rule functions to apply to that field
 * @return {[object]} - A list of failing rule objects containing a
 *     { type, prop } pair that identifies the rule that failed and the field
 *     that triggered it
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
    let result
    if (state.cache.change === state.change) {
      result = state.cache.result
    } else {
      state.cache.change = state.change
      state.cache.result = result = (await validate(state.change, ...args))
    }
    state.active = false;
    state.blocked.forEach(resolve => resolve());
    state.blocked = [];
    if (timeline !== state.timeline) {
      throw new ValidatorError(result);
    }
    state.change = {};
    state.cache = {}
    state.timeline = 0;
    return result;
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
 * @param  {function} validate - callback that accepts a value and returns a
 *     boolean; does the value pass or fail the rule
 * @param  {function|*} payload - data to include in the result if the rule
 *     fails. If a function is provided it will be called with the result object
 *     and the response used as result.payload
 * @return {function} - function to call to apply the rule to a change; typically
 *     this is passed as part of a rule collection to createValidator
 */
export function createRule(type, validate, payload = null) {
  if (payload === null) {
    return (change, prop) => (validate(change[prop]) ? null : { type, prop });
  }
  const getPayload =
    payload instanceof Function ? result => payload(result) : () => payload;
  return (change, prop) => {
    if (validate(change[prop])) {
      return null;
    }
    return { type, prop, payload: getPayload({ type, prop }) };
  };
}

/**
 * Helper for augmenting asynchronous validation rules with payloads.
 * @param  {function} validate - callback that accepts a `change` object and
 *     returns a list of { type, prop } objects for each element in the change
 *     that failed has a failing rule.
 * @param  {function|*} [payload=null] - data to augment the result with. If a
 *     function is provided it will be called with the result object and the
 *     response used as the result.payload
 * @return {function} - function to call to apply the rule to a change; typically
 *     this is passed as part of a rule collection to createValidator
 */
export function createAsyncRule(validate, payload = null) {
  if (payload === null) {
    return validate;
  }
  const getPayload =
    payload instanceof Function ? result => payload(result) : () => payload;
  return async change =>
    (await validate(change)).map(result => ({
      ...result,
      payload: getPayload(result)
    }));
}

/**
 * Helper for transforming a list of validator results into a simpler object
 * mapping field names to payloads.
 *
 * @param  {[object]} results - List of validator result object containing { type, prop, payload }
 * @return {object} - The results reduced to {[prop]: payload, ...}
 */
export function getPayload(results) {
  return results.reduce(
    (o, { prop, payload }) => ({ ...o, [prop]: payload }),
    {}
  );
}
