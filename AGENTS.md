<!-- Persistent instructions for the AI coding tool-->

# MANDATORY RULE :

- DO NOT CHANGE THIS FILE, THIS CAN ONLY BE CHANGED BY THE ADMIN.

# Approach Rules :

- Simplicity over cleverness.
- Readability over module abstraction.
- Follow a simple approach for tasks, avoid complex business logic until necessary.
- Don't build everything at once, finish one task a time.
- **Important** : Implement 3 phases at a time.
- Create a new branch for each feature after implementng it successfully with the syntax git switch -c feature/(feature name) and push the changes to it so that I can create a pull request and merge to the main branch.

# UI Rules :

- Use Tailwind CSS for dark/light mode UI.
- Keep the UI modern and eye-catching.
- Use decent colors and nice layout.

# Engineering Rules :

- Keep creating and updating the UI whenever needed and keep it modern & eye-catching.
- Write proper but brief comments over codes to explain what the below code does.
- Never rely on the previously trained information, always fetch the latest documentation to get the up-to-date data.
- Always use Typescript to ensure correct type assignments.
- In case of vague features requirements, ask for relevant details, never assume the parameters.
- Only change the relevant file for a task, don't touch any unrelated file.
- Don't over engineer, follow the principles of KISS ( Keep It Simple Stupid ) & YAGNI ( You Ain't Gonna Need It ) for every task.
- Keep the folder structure manageable, don't create too many modules for small tasks.
- Add dummy environment variables in the .env.example file, I'll provide the actual secret variables later.
- Avoid using any type as much as possible.
- Use RAG for memory based data-retreival.

# Security Rules :

- Never change the .env.local file, always change .env.example file for the envronment variables that are needed.
- Never expose the .env secrets.
- Never commit the .env.local file.

# Documentation Rules :

- The docs folder contains the files which may be changed upon certain actions.
- After completing a task or at the end of a chat, update the PROGRESS.md file by writing what has been done and what's the next thing to do so that if the tokens are exhausted, the next agent can pick up the context and understand what work has been done and what's remaining.
- The HOW_IT_WORKS.md file inside the docs folder contains the app's description, so after adding any feature to the app, update that file and mention the new feature implemented and how it is used.
- Update PRE_BUILD_PLAN.md if there is any change n the architecture of the application as it contains the application's features and the architecture.
- Update NOTES.md on wrong assumptions or there's a error or some bug is resolved in the already implemented code as it stores the mistakes made during the implementation along with a brief summary of the prompt given by the user to point out or resolve the bug or changing the already implemented feature.
- Update README.md if there's a change in the overview, features or dependencies of the application as it is supposed to be a manual for a Github visitor about the applcation overview and how to run it on their local machine.

# Code Review Rules :

- For every feature added, create a new git branch and commit, I'll review, generate a pull request and merge it later.
- Always perform tests and edge case testing before changing the code.
- Always explain the code in detail before implementing it.
- Follow regression tests for resolving bugs.

# Testing Rules :

- After every feature implementation, use these criterias for testing :
- ESlint errors
- Type errors
- Edge cases
- Authorization checks

# Architecture Rules :

- Frontend --> Backend --> AI --> MCP Tools --> Database --> Response --> AI --> User
- Never skip any stage in the flow.
- Never invent MCP tools unless asked by the admin only.
- Never invent backend APIs.

# Prompt Rules :

- If prompt is vague, ask required parameters instead of inventing informaton.
