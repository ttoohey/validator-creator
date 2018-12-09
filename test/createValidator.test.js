import {
  createValidator,
  createRule,
  createAsyncRule,
  getPayload,
  ValidatorError
} from "../src";

function createSimpleAsyncRule(type, validate) {
  return async change =>
    Object.keys(change).map(prop =>
      validate(change[prop]) ? null : { type, prop }
    );
}

function createMatchRule(type, data, field) {
  return (change, prop) =>
    data[field] === change[prop] ? null : { type, prop };
}

function createAsyncSubscriptionRule(type, validate) {
  const subscribers = [];
  const rule = jest.fn((change, prop, data) => {
    return new Promise(resolve => {
      subscribers.push(() => {
        resolve(
          Object.keys(change)
            .filter(prop => !validate(change[prop]))
            .map(prop => ({ type, prop }))
        );
      });
    });
  });
  return [rule, i => subscribers[i]()];
}

let validate, async1;
beforeEach(() => {
  const filled = createRule("filled", value => value.length > 0);
  const rule1 = createRule("rule1", value => value !== "rule1");
  const rule2 = createRule("rule2", value => value !== "rule2");
  const rule3 = createRule("rule3", value => value !== "rule3");
  async1 = jest.fn(
    createSimpleAsyncRule("async1", value => value !== "async1")
  );
  const data = {
    password: "abc123"
  };
  const matchPassword = createMatchRule("matchPassword", data, "password");
  const rules = {
    field1: [filled],
    field2: [async1],
    field3: [async1],
    field4: [filled, matchPassword],
    field5: [rule1, rule2, rule3, async1]
  };
  validate = createValidator(rules, data);
});

test("empty value fails 'filled' rule ", async () => {
  const change = {
    field1: ""
  };
  const [results] = await validate(change);
  const expected = [
    {
      type: "filled",
      prop: "field1"
    }
  ];
  expect(results).toMatchObject(expected);
});

test("non-empty value passes 'filled' rule ", async () => {
  const change = {
    field1: "filled"
  };
  const [results] = await validate(change);
  const expected = [];
  expect(results).toMatchObject(expected);
});

test("async rule fails when condition is met", async () => {
  const change = {
    field2: "async1"
  };
  const [results] = await validate(change);
  const expected = [
    {
      type: "async1",
      prop: "field2"
    }
  ];
  expect(results).toMatchObject(expected);
});

test("async rule can be used in multiple fields", async () => {
  const change = {
    field2: "filled",
    field3: "async1"
  };
  const [results] = await validate(change);
  const expected = [
    {
      type: "async1",
      prop: "field3"
    }
  ];
  expect(results).toMatchObject(expected);
  expect(async1).toHaveBeenCalledTimes(1);
});

test("able to do a password check validation", async () => {
  const [results] = await validate({ field4: "abc" });
  const expected = [
    {
      type: "matchPassword",
      prop: "field4"
    }
  ];
  expect(results).toMatchObject(expected);
  const [goodResults] = await validate({ field4: "abc123" });
  expect(goodResults).toHaveLength(0);
});

test("validation returns first failing rule", async () => {
  expect((await validate({ field5: "rule1" }))[0][0].type).toEqual("rule1");
  expect((await validate({ field5: "rule2" }))[0][0].type).toEqual("rule2");
  expect((await validate({ field5: "rule3" }))[0][0].type).toEqual("rule3");
  expect((await validate({ field5: "async1" }))[0][0].type).toEqual("async1");
});

test("simulataneous validations", async () => {
  const [delayed, resolveDelayed] = createAsyncSubscriptionRule(
    "delayed",
    () => false
  );
  const rules = {
    field1: [delayed],
    field2: [delayed],
    field3: [delayed]
  };
  const validate = createValidator(rules);
  const change1 = { field1: "" };
  const change2 = { field2: "" };
  const change3 = { field3: "" };
  const validation1 = validate(change1);
  const validation2 = validate(change2);
  const validation3 = validate(change3);
  const validation4 = validate();
  expect(delayed).toHaveBeenCalledTimes(1);
  resolveDelayed(0);
  await validation1.catch(error => {
    expect(error instanceof ValidatorError).toBe(true);
    expect(error.validatorErrorPayload).toMatchObject([
      { type: "delayed", prop: "field1" }
    ]);
  });
  await validation2.catch(error => {
    expect(error instanceof ValidatorError).toBe(true);
  });
  await validation3.catch(error => {
    expect(error instanceof ValidatorError).toBe(true);
  });
  expect(delayed).toHaveBeenCalledTimes(2);
  resolveDelayed(1);
  const [results] = await validation4;
  const expected = [
    { type: "delayed", prop: "field1" },
    { type: "delayed", prop: "field2" },
    { type: "delayed", prop: "field3" }
  ];
  expect(delayed).toHaveBeenCalledTimes(2);
  expect(results).toMatchObject(expected);
});

test("payload augmentation", async () => {
  const rule1 = createRule("rule1", value => false, { text: "rule1" });
  const rule2 = createRule(
    "rule2",
    value => false,
    ({ type, prop }) => ({ text: `${type} ${prop}` })
  );
  const rules = {
    field1: [rule1],
    field2: [rule2]
  };
  const validate = createValidator(rules);
  const change = {
    field1: "",
    field2: ""
  };
  const [results] = await validate(change);
  const expected = [
    {
      type: "rule1",
      prop: "field1",
      payload: {
        text: "rule1"
      }
    },
    {
      type: "rule2",
      prop: "field2",
      payload: {
        text: "rule2 field2"
      }
    }
  ];
  expect(results).toMatchObject(expected);
});

test("async payload augmentation", async () => {
  const rule1 = createRule("rule1", value => false);
  const serverRules = {
    field1: [rule1]
  };
  const serverValidate = createValidator(serverRules);
  const server = createAsyncRule(
    change => serverValidate(change).then(([result]) => result),
    ({ type, prop }) => `${type} ${prop}`
  );
  const rules = {
    field1: [server]
  };
  const validate = createValidator(rules);
  const change = {
    field1: ""
  };
  const [results] = await validate(change);
  const expected = [
    {
      type: "rule1",
      prop: "field1",
      payload: "rule1 field1"
    }
  ];
  expect(results).toMatchObject(expected);
});

test("getPayload result transformation", () => {
  const results = [
    {
      type: "rule1",
      prop: "field1",
      payload: "payload 1"
    },
    {
      type: "rule2",
      prop: "field2",
      payload: "payload 2"
    }
  ];
  const change = {
    field1: "",
    field2: "",
    field3: ""
  };
  const messages = getPayload([results, change]);
  const expected = {
    field1: "payload 1",
    field2: "payload 2",
    field3: null
  };
  expect(messages).toMatchObject(expected);
});
