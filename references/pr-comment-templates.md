# PR Comment Templates

## [PM][Sprint Plan]

```
[PM][Sprint Plan]

- sprint_id: <NN>
- milestone: sleep-sprint-<NN>-<YYYYMMDD>
- deadline_local: <deadline>
- primary_issue: #<number>
- sprint_theme: <theme>

Sprint objective:
<1-2 sentence objective>

Acceptance criteria:
1. <criterion>
2. <criterion>
3. <criterion>

Out of scope:
- <item>

Review order:
1. Security Specialist
2. Clean Code Specialist
```

## [Security Review]

```
[Security Review]

- sprint_id: <NN>
- primary_issue: #<number>
- pr_number: #<pr>
- reviewer: Security Specialist

Findings:
| id | severity | location | finding | recommended_fix | create_backlog_issue |
| --- | --- | --- | --- | --- | --- |
| SEC-N | Critical/High/Medium/Low | file:line | description | fix | yes/no |

Overall security status: green/yellow/red
Residual risk: <summary>
```

## [Clean Code Review]

```
[Clean Code Review]

- sprint_id: <NN>
- primary_issue: #<number>
- pr_number: #<pr>
- reviewer: Clean Code Specialist

Findings:
| id | severity | location | finding | recommended_refactor | create_backlog_issue |
| --- | --- | --- | --- | --- | --- |
| CC-N | Critical/High/Medium/Low | file:line | description | refactor | yes/no |

Overall maintainability status: green/yellow/red
Debt hotspots: <list or none>
```

## [Tech Writer]

```
[Tech Writer]

- sprint_id: <NN>
- milestone: sleep-sprint-<NN>-<YYYYMMDD>
- primary_issue: #<number>
- pr_number: #<pr>
- language: <repo primary language>

<Free-form narrative paragraph(s) describing the sprint's changes, motivation, and impact.>
```

## [PM][Deadline Wrap]

```
[PM][Deadline Wrap]

- deadline_local: <deadline>
- total_sprints: <count>
- issues_closed: <count>
- issues_remaining_backlog: <count>
- pr_number: #<pr>

Summary:
<Brief wrap-up of what was accomplished across all sprints.>

Open items:
- <remaining backlog items or follow-ups>
```

## Backlog Refill Proposal

```
[<Role>][Backlog Refill Proposal]

- sprint_id: pre-sprint-<NN>
- role: <Role Name>
- proposal_id: <PREFIX>-<N>
- title: <proposed issue title>
- scoring_seed: impact=N,risk_reduction=N,effort=N,confidence=N,urgency=N
- theme: <theme>
```
