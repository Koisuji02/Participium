# e2e tests

The testing approach and outcomes are documented in the attached report.

Additionally, user stories implemented in previous sprints but still carrying open issues at the start of this sprint were also included in the testing scope to validate the corresponding fixes and updates.

## Story 28 - Report visualization (unregistered user)

### Test 28.1: Report visualization

| Step | Description               |
| ---- | ------------------------- |
| 1    | Open the application      |
| 2    | Ensure user is logged out |

| Expected Outcome                               | Actual outcome                                 |
| ---------------------------------------------- | ---------------------------------------------- |
| The user is able to see the reports on the map | The user is able to see the reports on the map |

## Story 15 - Anonymous reports

### Test 15.1: Report filtering

| Step | Description                                         |
| ---- | --------------------------------------------------- |
| 1    | Login with a valid citizen account                  |
| 2    | Insert data for a report                            |
| 3    | Check the "Submit Anonymously" option               |
| 4    | Login with a valid Public Relations Officer account |
| 5    | Navigate to the "Review Reports" section            |

| Expected Outcome                      | Actual outcome                        |
| ------------------------------------- | ------------------------------------- |
| The reporter is marked as "Anonymous" | The reporter is marked as "Anonymous" |

## Story 30 - Search report by address

### Test 30.1: Search an existing report

| Step | Description                                                             |
| ---- | ----------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                      |
| 2    | Go to the "Write a report" screen using the button on the top bar       |
| 3    | Select the entrance of the main building of the "Politecnico di Torino" |
| 4    | Complete and submit the report                                          |
| 5    | Write and submit a report in a different location                       |
| 6    | Login with a valid Public Relations Officer account                     |
| 7    | Navigate to the "Review Reports" section                                |
| 8    | Assign the reports to a Yechnical Officer                               |
| 9    | Login with a valid Technical Officer account                            |
| 10   | Set the reports to "IN PROGRESS"                                        |
| 11   | Log out                                                                 |
| 12   | Search "Politecnico di Torino"                                          |

| Expected Outcome                                            | Actual outcome                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| The screen shows only the report at "Politecnico di Torino" | The screen shows only the report at "Politecnico di Torino" |


### Test 30.2: Search a non-existing report

Starts from test 30.1

| Step | Description                                              |
| ---- | -------------------------------------------------------- |
| 13   | Search a location different from "Politecnico di Torino" |

| Expected Outcome                    | Actual outcome                      |
| ----------------------------------- | ----------------------------------- |
| The screen does not show any report | The screen does not show any report |


## Story 13 - Check report via Telegram

### Test 13.1: Existing report

| Step | Description                                                       |
| ---- | ----------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                |
| 2    | Set the Telegram username                                         |
| 3    | Go to the "Write a report" screen using the button on the top bar |
| 5    | Write and submit a report                                         |
| 6    | Login with a valid Public Relations Officer account               |
| 7    | Navigate to the "Review Reports" section                          |
| 8    | Assign the reports to a Yechnical Officer                         |
| 9    | Login with a valid Technical Officer account                      |
| 10   | Set the reports to "IN PROGRESS"                                  |
| 11   | Access the Telegram bot                                           |
| 12   | Use the /start command to start the bot                           |
| 13   | Use the /login command to log in                                  |
| 14   | Press the "View My Active Reports" button                         |

| Expected Outcome    | Actual outcome      |
| ------------------- | ------------------- |
| The report is shown | The report is shown |

### Test 13.2: Non-existing report

| Step | Description                                            |
| ---- | ------------------------------------------------------ |
| 1    | Login with a valid citizen account without any reports |
| 2    | Set the Telegram username                              |
| 3    | Access the Telegram bot                                |
| 4    | Use the /start command to start the bot                |
| 5    | Use the /login command to log in                       |
| 6    | Press the "View My Active Reports" button              |

| Expected Outcome   | Actual outcome     |
| ------------------ | ------------------ |
| No report is shown | No report is shown |

## Story 14 - Telegram assistance

### Test 14.1: Basic Commands button

| Step | Description                                            |
| ---- | ------------------------------------------------------ |
| 1    | Login with a valid citizen account without any reports |
| 2    | Set the Telegram username                              |
| 3    | Access the Telegram bot                                |
| 4    | Use the /start command to start the bot                |
| 5    | Use the /login command to log in                       |
| 6    | Press the "Help" button                                |
| 7    | Press the "Basic Commands" button                      |

| Expected Outcome              | Actual outcome                |
| ----------------------------- | ----------------------------- |
| The bot's commands are listed | The bot's commands are listed |

### Test 14.2: FAQ button

| Step | Description                                            |
| ---- | ------------------------------------------------------ |
| 1    | Login with a valid citizen account without any reports |
| 2    | Set the Telegram username                              |
| 3    | Access the Telegram bot                                |
| 4    | Use the /start command to start the bot                |
| 5    | Use the /login command to log in                       |
| 6    | Press the "Help" button                                |
| 7    | Press the "FAQ" button                                 |

| Expected Outcome               | Actual outcome                 |
| ------------------------------ | ------------------------------ |
| The configured FAQs are listed | The configured FAQs are listed |

### Test 14.3: Contact Support button

| Step | Description                                            |
| ---- | ------------------------------------------------------ |
| 1    | Login with a valid citizen account without any reports |
| 2    | Set the Telegram username                              |
| 3    | Access the Telegram bot                                |
| 4    | Use the /start command to start the bot                |
| 5    | Use the /login command to log in                       |
| 6    | Press the "Help" button                                |
| 7    | Press the "Contact Support" button                     |

| Expected Outcome             | Actual outcome               |
| ---------------------------- | ---------------------------- |
| Contact information is shown | Contact information is shown |

## Story 18 - Reply to operators

### Test 18.1: Exchange information

| 1    | Login with a valid citizen account                                   |
| 2    | File a report of the Water Supply category                           |
| 3    | Open a new window                                                    |
| 4    | Log In with the account of the Public Relations Officer              |
| 5    | Assign the report to a Technical Officer for the Water Supply office |
| 6    | Close the window                                                     |
| 7    | Open a new window                                                    |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10    | Click the "Chat" button                                              |
| 11   | Send a message from the Officer account                              |
| 12   | Navigate back to the window with the Citizen account                 |
| 13   | Send a message from the Citizen account                              |

| Expected Outcome                                      | Actual outcome                                        |
| ----------------------------------------------------- | ----------------------------------------------------- |
| The messages are received in real time on each window | The messages are received in real time on each window |

### Test 18.2: Anonymous report

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | File an anonymous report of the Water Supply category                |
| 3    | Open a new window                                                    |
| 4    | Log In with the account of the Public Relations Officer              |
| 5    | Assign the report to a Technical Officer for the Water Supply office |
| 6    | Close the window                                                     |
| 7    | Open a new window                                                    |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10   | Click the "Chat" button                                              |
| 11   | Send a message from the Officer account                              |
| 12   | Navigate back to the window with the Citizen account                 |
| 13   | Send a message from the Citizen account                              |

| Expected Outcome                                                                                      | Actual outcome                                                                                        |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| The messages are received in real time on each window and the username for the citizen is not visible | The messages are received in real time on each window and the username for the citizen is not visible |

## Story 16 - Follow reports by other citizens

### Test 16.1: Notifications

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | File an anonymous report of the Water Supply category                |
| 3    | Open a new window                                                    |
| 4    | Log In with the account of the Public Relations Officer              |
| 5    | Assign the report to a Technical Officer for the Water Supply office |
| 6    | Close the window                                                     |
| 7    | Open a new window                                                    |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10   | Change the report status to "IN PROGRESS"                            |
| 11   | Navigate back to the window with the Citizen account                 |
| 12   | Logout                                                               |
| 13   | Log in with a different Citizen account                              |
| 14   | Click the "Follow" button on the report                              |
| 15   | Navigate back to the window with the Officer account                 |
| 16   | Change the report status to any status                               |
| 17   | Navigate back to the window with the Citizen account                 |

| Expected Outcome                                    | Actual outcome                                      |
| --------------------------------------------------- | --------------------------------------------------- |
| The citizen receives a "Status Change" notification | The citizen receives a "Status Change" notification |

### Test 16.2: Notifications after unfollowing

Starts from test 16.1

| Step | Description                                          |
| ---- | ---------------------------------------------------- |
| 17   | Click the "Unfollow" button on the report            |
| 18   | Navigate back to the window with the Officer account |
| 19   | Change the report status to any status               |
| 20   | Navigate back to the window with the Citizen account |

| Expected Outcome                            | Actual outcome                              |
| ------------------------------------------- | ------------------------------------------- |
| The citizen does not receive a notification | The citizen does not receive a notification |

## Story 17 - Telegram Notifications

### Test 17.1: Own Reports

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | Set the Telegram username                                            |
| 3    | File a report of the Water Supply category                           |
| 4    | Logout                                                               |
| 5    | Log In with the account of the Public Relations Officer              |
| 6    | Assign the report to a Technical Officer for the Water Supply office |
| 7    | Close the window                                                     |
| 8    | Open a new window                                                    |
| 9    | Log In with the account of the Technical Officer                     |
| 10   | Navigate to the "Technical Workspace" screen                         |
| 11   | Change the report status to "IN PROGRESS"                            |
| 12   | Access the Telegram bot                                              |
| 13   | Use the /start command to start the bot                              |
| 14   | Use the /login command to log in                                     |
| 15   | Click the "Manage Notifications" button                              |
| 16   | Click the "Follow All My Reports" button                             |
| 17   | Navigate back to the window with the Officer account                 |
| 18   | Change the report status to any status                               |

| Expected Outcome                                               | Actual outcome                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| A message from the bot notifying the status change is received | A message from the bot notifying the status change is received |

### Test 17.2: Disable own Reports

Starts from 17.1

| Step | Description                                          |
| ---- | ---------------------------------------------------- |
| 19   | Navigate back to the Telegram window                 |
| 20   | Click the "Unollow All My Reports" button            |
| 21   | Navigate back to the window with the Officer account |
| 22   | Change the report status to any status               |

| Expected Outcome                    | Actual outcome                      |
| ----------------------------------- | ----------------------------------- |
| No message from the bot is received | No message from the bot is received |

### Test 17.3: Followed Reports

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | Enable notifications in Account Settings                             |
| 3    | File a report of the Water Supply category                           |
| 4    | Open a new window                                                    |
| 5    | Log In with the account of the Public Relations Officer              |
| 6    | Assign the report to a Technical Officer for the Water Supply office |
| 7    | Close the window                                                     |
| 8    | Open a new window                                                    |
| 9    | Log In with the account of the Technical Officer                     |
| 10    | Navigate to the "Technical Workspace" screen                         |
| 11   | Change the report status to "IN PROGRESS"                            |
| 12   | Navigate back to the window with the Citizen account                 |
| 13   | Logout                                                               |
| 14   | Access the Telegram bot                                              |
| 15   | Use the /start command to start the bot                              |
| 16   | Use the /login command to log in                                     |
| 17   | Click the "Manage Notifications" button                              |
| 18   | Click the "Follow Report by ID" button                             |
| 19   | Enter the newly created report's ID                             |
| 20   | Navigate back to the window with the Officer account                 |
| 21   | Change the report status to any status                               |

| Expected Outcome                                               | Actual outcome                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| A message from the bot notifying the status change is received | A message from the bot notifying the status change is received |

### Test 17.4: Disable followed Reports

Starts from 17.3

| Step | Description                                          |
| ---- | ---------------------------------------------------- |
| 19   | Navigate back to the Telegram window                 |
| 20   | Click the "Unollow Report by ID" button            |
| 20   | Enter the ID of the report            |
| 21   | Navigate back to the window with the Officer account |
| 22   | Change the report status to any status               |

| Expected Outcome                    | Actual outcome                      |
| ----------------------------------- | ----------------------------------- |
| No message from the bot is received | No message from the bot is received |

## Story 19 - Email alerts

### Test 19.1: Receive email

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | Enable notifications in Account Settings                             |
| 3    | File a report of the Water Supply category                           |
| 4    | Open a new window                                                    |
| 5    | Log In with the account of the Public Relations Officer              |
| 6    | Assign the report to a Technical Officer for the Water Supply office |
| 7    | Close the window                                                     |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10   | Change the report status to "IN PROGRESS"                            |

| Expected Outcome                     | Actual outcome                       |
| ------------------------------------ | ------------------------------------ |
| An email with the update is received | An email with the update is received |

### Test 19.2: Disabled notifications

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | Disable notifications in Account Settings                            |
| 3    | File a report of the Water Supply category                           |
| 4    | Open a new window                                                    |
| 5    | Log In with the account of the Public Relations Officer              |
| 6    | Assign the report to a Technical Officer for the Water Supply office |
| 7    | Close the window                                                     |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10   | Change the report status to "IN PROGRESS"                            |

| Expected Outcome     | Actual outcome       |
| -------------------- | -------------------- |
| No email is received | No email is received |

### Test 19.3: Email for anonymous report

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | Enable notifications in Account Settings                             |
| 3    | File an anonymous report of the Water Supply category                |
| 4    | Open a new window                                                    |
| 5    | Log In with the account of the Public Relations Officer              |
| 6    | Assign the report to a Technical Officer for the Water Supply office |
| 7    | Close the window                                                     |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10   | Change the report status to "IN PROGRESS"                            |

| Expected Outcome                     | Actual outcome                       |
| ------------------------------------ | ------------------------------------ |
| An email with the update is received | An email with the update is received |

### Test 19.4: Email for followed report

| Step | Description                                                          |
| ---- | -------------------------------------------------------------------- |
| 1    | Login with a valid citizen account                                   |
| 2    | Enable notifications in Account Settings                             |
| 2    | File a report of the Water Supply category                           |
| 3    | Open a new window                                                    |
| 4    | Log In with the account of the Public Relations Officer              |
| 5    | Assign the report to a Technical Officer for the Water Supply office |
| 6    | Close the window                                                     |
| 7    | Open a new window                                                    |
| 8    | Log In with the account of the Technical Officer                     |
| 9    | Navigate to the "Technical Workspace" screen                         |
| 10   | Change the report status to "IN PROGRESS"                            |
| 11   | Navigate back to the window with the Citizen account                 |
| 12   | Logout                                                               |
| 13   | Log in with a different Citizen account                              |
| 14   | Click the "Follow" button on the report                              |
| 15   | Navigate back to the window with the Officer account                 |
| 16   | Change the report status to any status                               |

| Expected Outcome                     | Actual outcome                       |
| ------------------------------------ | ------------------------------------ |
| An email with the update is received | An email with the update is received |

## Story 20 - Report statistics

### Test 20.1: Exchange information

| Step | Description                       |
| ---- | --------------------------------- |
| 1    | Navigate to the "Statistics" page |

| Expected Outcome                                 | Actual outcome                                   |
| ------------------------------------------------ | ------------------------------------------------ |
| The statistics of the uploaded reports are shown | The statistics of the uploaded reports are shown |

