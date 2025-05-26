
  

# user-dashboard

  

A dynamic user dashboard application built with Vue 3, Vite, and Pinia. It displays a list of users with their scores and rankings, automatically refreshing data from a simulated API and allowing inline score editing.

  

---

  

## ✨ Features

  

*  **User Ranking:** Displays users sorted by score, with calculated rankings.

*  **Real-time Updates:** Simulates real-time data by automatically refreshing a user's score every 30 seconds.

*  **Highlight Recent Changes:** Visually indicates users whose scores have been recently updated.

*  **Inline Score Editing:** Allows users to click an "Edit" button, modify a score directly in the table, and then "Save" or "Cancel" the changes.

*  **State Management:** Utilizes Pinia for robust and centralized state management.

*  **Simulated Backend:** Uses mock API calls to fetch initial user data and simulate score updates, including random simulated network errors.

*  **Clear Feedback:** Shows loading states, error messages, and a "No users found" message when appropriate.

  

---

  

## 🛠️ Technology Stack

  

*  **Vue 3:** Leveraging the Composition API with `<script setup>`.

*  **Vite:** For fast development and optimized builds.

*  **Pinia:** For state management.

*  **TypeScript:** For type safety.

  

---

  

## 🔧 Core Logic Overview

  

The application's primary functionality revolves around displaying and managing a list of users and their scores.

  

1.  **Data Fetching:** On initialization, the `UserList` component dispatches an action to the `userStore` (Pinia) to fetch an initial set of 150 users from a simulated API (`fakeApiCall`).

2.  **State Management (`userStore`):**

* Stores the list of `users`, `loading` status, and potential `error` messages.

* Tracks `lastUpdatedUsers` (the last 5 users whose scores were refreshed by the simulated API).

* Provides getters like `sortedUsers` which calculates ranks based on scores (higher score means better rank, ties share the same rank) and `lastUpdatedUserIds`.

3.  **Automatic Refresh:** The `UserList` component initiates an interval timer that calls the `refreshUserScores` action in the `userStore` every 30 seconds. This action simulates an API call (`fakeApiRefresh`) that updates a random user's score.

4.  **Inline Editing:**

* Users can click "Edit" to change a user's score. The component manages the edit mode and the temporary score value.

* On "Save", the `updateUserScore` action in the `userStore` is called to persist the change locally in the store.

* "Cancel" reverts any changes made in edit mode.

5.  **UI Rendering:**

* The `UserList` component subscribes to the `userStore`'s state and getters to display the user data in a table.

* It conditionally renders loading messages, error notifications, and the user table or a "no users" message.

* Rows for recently updated users are highlighted.

  

---

  

## ⚙️ Recommended IDE Setup

  

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur if installed).

  

---

  

## 💡 Type Support for `.vue` Imports in TS

  

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

  

---

  

## 🔧 Customize Configuration

  

See [Vite Configuration Reference](https://vite.dev/config/).

  

---

  

## 🚀 Project Setup

  

To install dependencies:

```sh

npm  install

```

  

Compile and Hot-Reload for Development:

```sh

npm  run  dev

```

Type-Check, Compile and Minify for Production:

```sh

npm  run  build

```

Run Unit Tests with [Vitest](https://vitest.dev/)

```sh

npm  run  test:unit

```

Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh

# Install browsers for the first run

npx  playwright  install

  

# When testing on CI, must build the project first

npm  run  build

  

# Runs the end-to-end tests

npm  run  test:e2e

# Runs the tests only on Chromium

npm  run  test:e2e  --  --project=chromium

# Runs the tests of a specific file

npm  run  test:e2e  --  tests/example.spec.ts

# Runs the tests in debug mode

npm  run  test:e2e  --  --debug

```

### Lint with [ESLint](https://eslint.org/)

```sh

npm  run  lint

```

## Aditional API ideas

For back-end API, suggestions are:

1. Endpoint for getting all users:
``GET /api/v1/users``
Query parameters:
``page=<number>``
``limit=<number>``
``sort_by=<field>``
``order=<asc|desc>``

Suggested Back-End response body:
```json
{
  "data": [
    {
      "id": 1,
      "name": "User 1",
      "email": "email1@example.com",
      "score": 85
    },
    {
      "id": 2,
      "name": "User 2",
      "email": "email2@example.com",
      "score": 92
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 50,
    "totalUsers": 150,
    "totalPages": 3
  }
}
```
Error reponse:
```json
{
  "error": "This would be an error."
}
```

2. Endpoint to update user score:
``PATCH /api/v1/users/{userId}/score``
JSON request body:
```json
{
  "score": 77
}
```
JSON response body:
```json
{
  "id": 1,
  "name": "User 1",
  "email": "email1@email.com",
  "score": 77
}
```
Error reponse structure:
```json
{
  "error": "User with ID {userId} not found."
}
```
3. For the API to retrieve recent updates, it could be a websocket or something similar, but for the specific case of retrieving updates every few seconds I believe that using REST API simplifies things. Therefore here is my suggestion: 
``GET /api/v1/users/recent-updates``
Query Params:
``from=<number_in_seconds>``
Response body:
```json
{
  "data": [
    {
      "id": 5,
      "name": "User 5",
      "email": "email5@email.com",
      "score": 60,
      "updatedAt": "2025-05-26T14:35:10Z"
    },
    {
      "id": 23,
      "name": "User 23",
      "email": "email23@email.com",
      "score": 78,
      "updatedAt": "2025-05-26T14:35:05Z"
    }
  ],
  "until": "2025-05-26T14:35:10Z"
}
```