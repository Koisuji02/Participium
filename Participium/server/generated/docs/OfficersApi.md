# OfficersApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createOfficer**](OfficersApi.md#createofficer) | **POST** /officers | Admins create new Officer |
| [**retrieveDocs**](OfficersApi.md#retrievedocs) | **GET** /officers/retrievedocs | Retrieve Reports assigned to him |
| [**reviewDoc**](OfficersApi.md#reviewdoc) | **PATCH** /officers/reviewdocs/{id_doc} | Update Report assigned to him |



## createOfficer

> Officer createOfficer(officer)

Admins create new Officer

### Example

```ts
import {
  Configuration,
  OfficersApi,
} from '';
import type { CreateOfficerRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OfficersApi();

  const body = {
    // Officer | Created user object (optional)
    officer: ...,
  } satisfies CreateOfficerRequest;

  try {
    const data = await api.createOfficer(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **officer** | [Officer](Officer.md) | Created user object | [Optional] |

### Return type

[**Officer**](Officer.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`, `application/xml`, `application/x-www-form-urlencoded`
- **Accept**: `application/json`, `application/xml`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | successful operation |  -  |
| **0** | Unexpected error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## retrieveDocs

> Report retrieveDocs()

Retrieve Reports assigned to him

Using the session key, the officer is able to retrieve the docs assigned to him.

### Example

```ts
import {
  Configuration,
  OfficersApi,
} from '';
import type { RetrieveDocsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OfficersApi();

  try {
    const data = await api.retrieveDocs();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**Report**](Report.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | successful operation |  -  |
| **0** | Unexpected error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## reviewDoc

> Report reviewDoc(idDoc)

Update Report assigned to him

### Example

```ts
import {
  Configuration,
  OfficersApi,
} from '';
import type { ReviewDocRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OfficersApi();

  const body = {
    // number
    idDoc: 56,
  } satisfies ReviewDocRequest;

  try {
    const data = await api.reviewDoc(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **idDoc** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Report**](Report.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | successful operation |  -  |
| **0** | Unexpected error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

