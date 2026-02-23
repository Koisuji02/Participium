
# ReportDocument


## Properties

Name | Type
------------ | -------------
`description` | string
`photos` | Array&lt;string&gt;

## Example

```typescript
import type { ReportDocument } from ''

// TODO: Update the object below with actual values
const example = {
  "description": the water is clear,
  "photos": null,
} satisfies ReportDocument

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReportDocument
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


