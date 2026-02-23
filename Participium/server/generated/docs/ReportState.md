
# ReportState


## Properties

Name | Type
------------ | -------------
`report` | [Report](Report.md)
`approved` | [State](State.md)
`reason` | string
`officer` | [Officer](Officer.md)

## Example

```typescript
import type { ReportState } from ''

// TODO: Update the object below with actual values
const example = {
  "report": null,
  "approved": null,
  "reason": Message for only denied Reports.,
  "officer": null,
} satisfies ReportState

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReportState
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


