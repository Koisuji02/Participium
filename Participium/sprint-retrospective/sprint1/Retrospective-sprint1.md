TEMPLATE FOR RETROSPECTIVE (Team 16)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs. done : 7 / 7
- Total points committed vs. done : 21 / 21
- Nr of hours planned vs. spent (as a team): 92 / 96

**Remember** a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD if required (you cannot remove items!) 

### Detailed statistics

| Story                          | # Tasks | Points | Hours est. | Hours actual |
| ------------------------------ | ------- | ------ | ---------- | ------------ |
| _Uncategorized_                | 10      | //     | 34 h       | 38 h 25m     |
| PT01: Citizer Registration     | 6       | 1      | 7 h        | 7 h 15 m     |
| PT02: Municipality users setup | 6       | 1      | 7 h        | 8 h 15 m     |
| PT03: Role assignment          | 5       | 1      | 5 h 30 m   | 5 h 20 m     |
| PT04: Select Location          | 4       | 5      | 17 h       | 12 h 23 m    |
| PT05: Report creation          | 6       | 3      | 6 h        | 7 h 45 m     |
| PT06: Report review            | 4       | 2      | 7 h        | 6 h 10 m     |
| PT07: Report visualization     | 4       | 8      | 12 h 30 m  | 7 h 25 m     |

> story `Uncategorized` is for technical tasks, leave out story points (not applicable in this case)

- Hours per task average, standard deviation (estimate and actual)

|            | Mean  | StDev |
| ---------- | ----- | ----- |
| Estimation | 2.045 | 2,191 |
| Actual     | 1.976 | 2,414 |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1 = 0.03487$$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| = 0.28 $$
  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated : 0
  - Total hours spent : 0
  - Nr of automated unit test cases : 0
  - Coverage : 0%
- E2E testing:
  - Total hours estimated : 12h
  - Total hours spent : 7.41h
  - Nr of test cases : 11
- Code review 
  - Total hours estimated : 21h
  - Total hours spent : 22h
  


## ASSESSMENT

- What did go wrong in the sprint?
  + Difficulties to make last two scrum meetings due to different commitments
- What caused your errors in estimation (if any)?
  + Testing tasks needed more time than expected
- What lessons did you learn (both positive and negative) in this sprint?
  + Communication between frontend and backend
  + More hours needed for testing
  + Scrum meetings are important to both keep track of progress and to discuss doubts
- Which improvement goals set in the previous retrospective were you able to achieve? 
  + Better splitting of tasks
  + Better usage of YouTrack
- Which ones you were not able to achieve? Why?
  + Due to indivudual commitments, we found some difficulties to meet each other for scrum meetings
- Improvement goals for the next sprint and how to achieve them (technical tasks, team coordination, etc.)

  + More scrum meetings, at least 2 per week, more is better but hard to coordinate
  + Better time estimation for testing tasks

- One thing you are proud of as a Team!!
  + We managed to bring 7 stories to the demo presentation without many difficulties