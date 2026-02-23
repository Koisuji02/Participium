
# Report


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`location` | [Location](Location.md)
`author` | [User](User.md)
`anonymity` | boolean
`date` | string
`category` | [OfficeType](OfficeType.md)
`document` | [ReportDocument](ReportDocument.md)

## Example

```typescript
import type { Report } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "location": null,
  "author": null,
  "anonymity": null,
  "date": null,
  "category": null,
  "document": null,
} satisfies Report

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Report
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


