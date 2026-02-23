# Officer

## Properties

Name | Type
------------ | -------------
`id` | number
`username` | string
`name` | string
`surname` | string
`email` | string
`password` | string
`roles` | Array<{ role: OfficerRole; office: OfficeType }>

## Example

```typescript
import type { Officer } from ''

// TODO: Update the object below with actual values
const example: Officer = {
  id: 1,
  username: "m.rossi",
  name: "Mario",
  surname: "Rossi",
  email: "mario.rossi@example.com",
  password: undefined, // nel DTO non esponiamo la password
  roles: [
    { role: "technical_office_staff", office: "infrastructure" },
    { role: "municipal_public_relations_officer", office: "organization" }
  ],
};

console.log(JSON.stringify(example))
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


