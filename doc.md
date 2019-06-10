<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [ValidatorError][1]
    -   [Parameters][2]
-   [createValidator][3]
    -   [Parameters][4]
-   [createRule][5]
    -   [Parameters][6]
-   [createAsyncRule][7]
    -   [Parameters][8]
-   [getPayload][9]
    -   [Parameters][10]
-   [AsyncRule][11]
    -   [Parameters][12]
-   [FormData][13]
    -   [Examples][14]
-   [ValidatorResult][15]
    -   [Properties][16]
    -   [Examples][17]
-   [Rule][18]
    -   [Parameters][19]
-   [RuleCollection][20]
-   [Validate][21]
    -   [Parameters][22]
-   [ValidateResult][23]
    -   [Properties][24]
-   [ValidateFormData][25]
    -   [Parameters][26]
-   [ValidateValue][27]
    -   [Parameters][28]
    -   [Examples][29]
-   [GetPayload][30]
    -   [Parameters][31]

## ValidatorError

**Extends Error**

Error thrown by interrupted validations

### Parameters

-   `results` **[Array][32]&lt;[ValidatorResult][33]>?** the stale results
-   `params` **...any** passed to Error constructor

## createValidator

Creates a [Validate][21] function based on the provided rules

### Parameters

-   `rules` **[RuleCollection][34]** 

Returns **[Validate][35]** The function to use to perform a validation.

## createRule

Helper for defining simple validation rules

### Parameters

-   `type` **[string][36]** names the rule
-   `validate` **[ValidateValue][37]** callback that accepts a value and returns a
      boolean; does the value pass or fail the rule?
-   `payload` **([GetPayload][38] | any)** data to include in the result if the rule
      fails. If a function is provided it will be called with the result object
      and the response used as result.payload (optional, default `null`)

Returns **[Rule][39]** function to call to apply the rule to a change; typically
  this is passed as part of a [RuleCollection][20] to [createValidator][3]

## createAsyncRule

Helper for augmenting asynchronous validation rules with payloads.

### Parameters

-   `validate` **[function][40]** callback that accepts a `change` object and
      returns a list of { type, prop } objects for each element in the change
      that failed has a failing rule.
-   `payload` **([GetPayload][38] | any)** data to augment the result with. If a
      function is provided it will be called with the result object and the
      response used as the result.payload (optional, default `null`)

Returns **[AsyncRule][41]** function to call to apply the rule to a change; typically
  this is passed as part of a [RuleCollection][20] to [createValidator][3]

## getPayload

Helper for transforming a list of validator results into a simpler object
mapping field names to payloads.

### Parameters

-   `args` **[Array][32]** 
    -   `args.0` **[ValidatorResult][33]** List of validator result object containing { type, prop, payload }
    -   `args.1` **[FormData][42]** The data the results apply to

Returns **[object][43]** The results reduced to {[prop]&#x3A; payload, ...}

## AsyncRule

Perform an asynchronous validation of a change

Type: [Function][40]

### Parameters

-   `change` **[FormData][42]** The data being validated

Returns **[Promise][44]&lt;[Array][32]&lt;[ValidatorResult][33]>>** Contains an item for each field that failed

## FormData

Data to apply a validation to

Type: [Object][43]&lt;[string][36], any>

### Examples

```javascript
{
  field1: "Field 1 value",
  field2: "Field 2 value"
}
```

## ValidatorResult

Indicates a validation has failed and identifies the rule and the prop that
triggered the failure.

Type: [Object][43]

### Properties

-   `type` **![string][36]** Identifies the rule
-   `prop` **![string][36]** Identifies the field
-   `payload` **any?** Application specific data

### Examples

```javascript
{
  type: "rule1",
  prop: "field1",
  payload: "Rule 1 applies here"
}
```

## Rule

Perform a validation of a value

Type: [Function][40]

### Parameters

-   `change` **[FormData][42]** The data being validated
-   `prop` **[string][36]** The field in `change` to apply the validation to

Returns **[ValidatorResult][33]?** Returns null if the field passes the validation

## RuleCollection

Defines the rules that applies to each field

Type: [Object][43]&lt;[string][36], [Array][32]&lt;([Rule][39] \| [AsyncRule][41])>>

## Validate

This function is returned by [createValidator][3] to be used to perform a validation.

### Parameters

-   `change` **[FormData][42]** The data to be validated


-   Throws **[ValidatorError][45]** if an asynchronous validation is interrupted

Returns **[Promise][44]&lt;[ValidateResult][46]>** result and merged change

## ValidateResult

Return value from the [Validate][21] function

Type: [Array][32]

### Properties

-   `0` **[Array][32]&lt;[ValidatorResult][33]>** 
-   `1` **[FormData][42]** 

## ValidateFormData

Validate a change object

Used as the `validate` parameter to [createAsyncRule][7]

Type: [Function][40]

### Parameters

-   `change` **[FormData][42]** the data being validated

Returns **[Promise][44]&lt;[Array][32]&lt;[ValidatorResult][33]>>** 

## ValidateValue

Validates a value to determine whether it passes a test.

Used as the `validate` parameter to [CreateRule][47].

Type: [Function][40]

### Parameters

-   `value` **any** the value to be tested
-   `change` **[FormData][42]** the data being validated

### Examples

```javascript
function validateFilledValue(value, change) {
  return change[prop].length > 0
}
const filled = createRule('filled', validateFilledValue)
```

Returns **[boolean][48]** true if the value passes the validation; false otherwise

## GetPayload

Get payload data to augment a [ValidatorResult][15]

Type: [Function][40]

### Parameters

-   `result` **[ValidatorResult][33]** Identifies the rule and field that failed the validation
-   `change` **[FormData][42]** The change that caused the validation to be evaluated

Returns **any** Application specific data

[1]: #validatorerror

[2]: #parameters

[3]: #createvalidator

[4]: #parameters-1

[5]: #createrule

[6]: #parameters-2

[7]: #createasyncrule

[8]: #parameters-3

[9]: #getpayload

[10]: #parameters-4

[11]: #asyncrule

[12]: #parameters-5

[13]: #formdata

[14]: #examples

[15]: #validatorresult

[16]: #properties

[17]: #examples-1

[18]: #rule

[19]: #parameters-6

[20]: #rulecollection

[21]: #validate

[22]: #parameters-7

[23]: #validateresult

[24]: #properties-1

[25]: #validateformdata

[26]: #parameters-8

[27]: #validatevalue

[28]: #parameters-9

[29]: #examples-2

[30]: #getpayload-1

[31]: #parameters-10

[32]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array

[33]: #validatorresult

[34]: #rulecollection

[35]: #validate

[36]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[37]: #validatevalue

[38]: #getpayload

[39]: #rule

[40]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/function

[41]: #asyncrule

[42]: #formdata

[43]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[44]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise

[45]: #validatorerror

[46]: #validateresult

[47]: CreateRule

[48]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean