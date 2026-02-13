# Prioritization Rubric

## Scoring Dimensions (1-5 each)

| Dimension      | Description                                        |
| -------------- | -------------------------------------------------- |
| impact         | User-facing value or developer productivity gain   |
| risk_reduction | Reduces security, reliability, or correctness risk |
| effort         | Inverse of implementation effort (5 = trivial)     |
| confidence     | Certainty that the change achieves its goal        |
| urgency        | Time sensitivity or dependency pressure            |

## Priority Score

`priority = impact + risk_reduction + effort + confidence + urgency`

Range: 5–25

## Theme Selection

Choose the sprint theme from the highest-scoring issue's primary category:

- **security** — vulnerability fix, auth hardening, input validation
- **ux** — user-facing improvement, accessibility, onboarding
- **dx** — developer experience, tooling, test infrastructure
- **reliability** — error handling, monitoring, resilience
- **performance** — speed, bundle size, caching
- **feature** — new user-facing capability

## Tie-Breaking

When scores are equal: security > reliability > ux > feature > dx > performance
