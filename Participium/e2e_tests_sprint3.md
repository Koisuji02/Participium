# e2e tests

During this sprint, we encountered challenges in implementing automated test cases with Playwright. As a result, all end-to-end testing was performed manually. The testing approach and outcomes are documented in the attached report.

Additionally, user stories implemented in previous sprints but still carrying open issues at the start of this sprint were also included in the testing scope to validate the corresponding fixes and updates.

## Story 3 - Assign municipality user role

### Test 3.1: Create External Maintainer account

| Step | Description                                   |
| ---- | --------------------------------------------- |
| 1    | Login with a valid Administrator account      |
| 2    | Navigate to the "Register new officer" screen |
| 3    | Insert officer information                    |
| 4    | Choose "External Maintainer" as officer role  |
| 5    | Confirm officer creation                      |
| 6    | Log out                                       |
| 7    | Login with the new credentials                |

| Expected Outcome                                  | Actual outcome                                    |
| ------------------------------------------------- | ------------------------------------------------- |
| The user is logged with the newly created account | The user is logged with the newly created account |

## Story 4 - Select Location

### Test 4.1: View street name

| Step | Description                                                             |
| ---- | ----------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                      |
| 2    | Go to the "Write a report" screen using the button on the top bar       |
| 3    | Select the entrance of the main building of the "Politecnico di Torino" |

| Expected Outcome                                                                | Actual outcome                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The screen shows "Corso Duca degli Abruzzi 24" as the chosen location's address | The screen shows "Corso Duca degli Abruzzi 24" as the chosen location's address |


## Story 7 - Reports Overview

### Test 7.1: Report filtering

| Step | Description                                                               |
| ---- | ------------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                        |
| 2    | File 2 reports: one of "Safety" category and one of "Sanitation" category |
| 3    | Logout                                                                    |
| 4    | Login with a valid Public Relations Officer account                       |
| 5    | Choose the "Safety" category in the filters                               |

| Expected Outcome                                   | Actual outcome                                     |
| -------------------------------------------------- | -------------------------------------------------- |
| The screen only shows the "Safety" category report | The screen only shows the "Safety" category report |

## Story 10 - Modify municipality user role


### Test 10.1: Assign Technical Officer role to Public Relations Officer

| Step | Description                                                 |
| ---- | ----------------------------------------------------------- |
| 1    | Login with a valid Administrator account                    |
| 2    | Navigate to the "Register new officer" screen               |
| 3    | Insert officer information                                  |
| 4    | Choose "Municipal Public Relations Officer" as officer role |
| 5    | Confirm officer creation                                    |
| 6    | Navigate to the "Update officer accounts" screen            |
| 7    | Select the newly created officer                            |
| 8    | Press the "Edit" button                                     |
| 9    | Add a Technical Officer role                                |
| 10   | Log Out                                                     |
| 11   | Log In with the new account's credentials                   |

| Expected Outcome                                                                 | Actual outcome                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| The top bar shows both the "Review Reports" and the "Technical Workspace" button | The top bar shows both the "Review Reports" and the "Technical Workspace" button |

### Test 10.2: Assign another Technical Officer role to Technical Officer

| Step | Description                                                               |
| ---- | ------------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                        |
| 2    | File 2 reports: one of "Safety" category and one of "Sanitation" category |
| 3    | Logout                                                                    |
| 4    | Login with a valid Administrator account                                  |
| 5    | Navigate to the "Register new officer" screen                             |
| 6    | Insert officer information                                                |
| 7    | Choose "Technical Officer" as officer role                                |
| 8    | Choose "Safety" as office                                                 |
| 9    | Confirm officer creation                                                  |
| 10   | Navigate to the "Update officer accounts" screen                          |
| 11   | Select the newly created officer                                          |
| 12   | Press the "Edit" button                                                   |
| 13   | Add a Technical Officer role for the "Sanitation" office                  |
| 14   | Log Out                                                                   |
| 15   | Log In with a valid Municipal Public Relations Officer account            |
| 16   | Navigate to the "Review Reports" screen                                   |
| 17   | Assign the two reports to the newly created officer                       |
| 18   | Log Out                                                                   |
| 19   | Log In with the new account's credentials                                 |
| 20   | Navigate to the "Technical Workspace" screen                              |

| Expected Outcome                 | Actual outcome                   |
| -------------------------------- | -------------------------------- |
| Both reports are available | Both reports are available |

### Test 10.3: Remove role from officer

| Step | Description                                                               |
| ---- | ------------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                        |
| 2    | File 2 reports: one of "Safety" category and one of "Sanitation" category |
| 3    | Logout                                                                    |
| 4    | Login with a valid Administrator account                                  |
| 5    | Navigate to the "Register new officer" screen                             |
| 6    | Insert officer information                                                |
| 7    | Choose "Technical Officer" as officer role                                |
| 8    | Choose "Safety" as office                                                 |
| 9    | Confirm officer creation                                                  |
| 10   | Navigate to the "Update officer accounts" screen                          |
| 11   | Select the newly created officer                                          |
| 12   | Press the "Edit" button                                                   |
| 13   | Add a Technical Officer role for the "Sanitation" office                  |
| 14   | Log Out                                                                   |
| 15   | Log In with a valid Municipal Public Relations Officer account            |
| 16   | Navigate to the "Review Reports" screen                                   |
| 17   | Assign the two reports to the newly created officer                       |
| 18   | Log Out                                                                   |
| 19   | Login with a valid Administrator account                                  |
| 20   | Navigate to the "Update officer accounts" screen                          |
| 21   | Select the newly created officer                                          |
| 22   | Press the "Edit" button                                                   |
| 23   | Remove the Technical Officer role for the "Sanitation" office             |
| 24   | Log Out                                                                   |
| 25   | Log In with the new account's credentials                                 |
| 26   | Navigate to the "Technical Workspace" screen                              |

| Expected Outcome                             | Actual outcome                               |
| -------------------------------------------- | -------------------------------------------- |
| Only the "Safety" report is available | Only the "Safety" report is available |

## Story 24 - Assign report to external maintainers

### Test 24.1: Assign report to external maintainer

| Step | Description                                      |
| ---- | ------------------------------------------------ |
| 1    | Login with a valid Administrator account         |
| 2    | Navigate to the "Register new officer" screen    |
| 3    | Insert officer information                       |
| 4    | Choose "External Maintainer" as officer role     |
| 5    | Choose "Sanitation" as category                  |
| 6    | Confirm officer creation                         |
| 7    | Insert new officer information                   |
| 8    | Choose "Technical Maintainer" as officer role    |
| 9    | Choose "Sanitation" as office                    |
| 10   | Confirm officer creation                         |
| 11   | Log out                                          |
| 12   | Login with a valid citizen account               |
| 13   | File a report of the Sanitation category         |
| 14   | Log out                                          |
| 15   | Log In with the new Officer's credentials        |
| 16   | Navigate to the "Technical Workspace" screen     |
| 17   | Click the "Assign to external maintainer" button |
| 18   | Choose the newly created external maintainer     |
| 19   | Log out                                          |
| 20   | Log In with the new Maintainer's credentials     |
| 21   | Navigate to the "Maintainer Dashboard" screen    |

| Expected Outcome                        | Actual outcome                          |
| --------------------------------------- | --------------------------------------- |
| The assigned report is available | The assigned report is available |

## Story 25 - Update report (external maintainer)

### Test 25.1: Update report

The first steps of this test are the same of 24.1

| Step | Description                           |
| ---- | ------------------------------------- |
| 22   | Change the report's status            |
| 23   | Log out                               |
| 24   | Log In with the Officer's credentials |

| Expected Outcome                                        | Actual outcome                                          |
| ------------------------------------------------------- | ------------------------------------------------------- |
| The officer sees the updated status of the report | The officer sees the updated status of the report |

## Story 26 - Exchange information between staff members and external maintainers

### Test 26.1: Exchange information

The first steps of this test are the same of 24.1

| Step | Description                           |
| ---- | ------------------------------------- |
| 22   | Press the "Chat" button               |
| 23   | Write a message                       |
| 24   | Log out                               |
| 25   | Log In with the Officer's credentials |

| Expected Outcome                   | Actual outcome                     |
| ---------------------------------- | ---------------------------------- |
| The officer sees the message | The officer sees the message |

## Story 27 - Confirmation code for registration

### Test 27.1: Successful registration

| Step | Description                                 |
| ---- | ------------------------------------------- |
| 1    | Navigate to the "Register" screen           |
| 2    | Fill the form with the required information |
| 3    | Insert the OTP code received by email       |

| Expected Outcome                    | Actual outcome                      |
| ----------------------------------- | ----------------------------------- |
| The user successfully logs in | The user successfully logs in |

### Test 27.2: Failed registration

| Step | Description                                 |
| ---- | ------------------------------------------- |
| 1    | Navigate to the "Register" screen           |
| 2    | Fill the form with the required information |
| 3    | Insert a wrong OTP code                     |

| Expected Outcome           | Actual outcome             |
| -------------------------- | -------------------------- |
| The user does not log in | The user does not log in |