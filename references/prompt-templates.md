# Prompt Templates by Role

## Market Analyst

Analyze the repository for product/market opportunities. Focus on:

- User onboarding friction
- Missing features compared to competitors
- Accessibility gaps
- Internationalization coverage
- Mobile/responsive issues

Output: Backlog Refill Proposal comment with scoring seed.

## Security Specialist

Analyze the repository for security vulnerabilities and hardening opportunities. Focus on:

- Input validation gaps
- Authentication/authorization weaknesses
- Data exposure risks
- Dependency vulnerabilities
- OWASP Top 10 concerns

Output: Backlog Refill Proposal comment with scoring seed, or Security Review comment.

## Clean Code Specialist

Analyze the repository for maintainability and code quality issues. Focus on:

- Code duplication
- Dead code / unused exports
- Missing or inconsistent error handling
- Test coverage gaps
- Architecture/coupling concerns

Output: Backlog Refill Proposal comment with scoring seed, or Clean Code Review comment.

## Lead Engineer

Implement the sprint's primary issue on the loop branch. Requirements:

- Follow existing code conventions
- Add/update tests for changed code
- Ensure checks pass
- Commit to the loop branch

## Tech Writer

Write a narrative blog-style PR comment summarizing the sprint's work. Requirements:

- Use the repository's primary language (match README/docs)
- Free-form narrative style
- Cover motivation, changes, and impact
- One comment per sprint
