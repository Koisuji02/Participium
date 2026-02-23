
# User


## Properties

Name | Type
------------ | -------------
`id` | number
`username` | string
`firstName` | string
`lastName` | string
`password` | string
`email` | string
`avatar` | string 
`telegramUsername` | string
`emailNotifications` | boolean
## Example

```typescript
import type { User } from ''

const example = {
  "id": 2,
  "username": username,
  "firstName": Mario,
  "lastName": Rossi,
  "password": placeholder,
  "email": mail@domain.com,
  "avatar": https://example.com/avatar.jpg,
  "telegramUsername": mario_rossi,
  "emailNotifications": true
} satisfies User

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as User
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


