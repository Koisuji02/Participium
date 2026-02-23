# ReportsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getReports**](ReportsApi.md#getreports) | **GET** /Reports | Retrieve all public Reports for map visualization |
| [**uploadReport**](ReportsApi.md#uploadreport) | **POST** /Reports | User upload a new Report |



## getReports

> Array&lt;Report&gt; getReports()

Retrieve all public Reports for map visualization

Get all approved Reports to display on the public map

### Example

```ts
import {
  Configuration,
  ReportsApi,
} from '';
import type { GetReportsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ReportsApi();

  try {
    const data = await api.getReports();
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

[**Array&lt;Report&gt;**](Report.md)

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


## uploadReport

> Report uploadReport(report)

User upload a new Report

### Example

```ts
import {
  Configuration,
  ReportsApi,
} from '';
import type { UploadReportRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ReportsApi();

  const body = {
    // Report | Created user object (optional)
    report: ...,
  } satisfies UploadReportRequest;

  try {
    const data = await api.uploadReport(body);
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
| **report** | [Report](Report.md) | Created user object | [Optional] |

### Return type

[**Report**](Report.md)

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

