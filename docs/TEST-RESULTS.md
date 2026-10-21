# Verification results

Verified locally on **21 October 2026** using Bun 1.3.13 and installed Google Chrome.

## Final results

| Check | Result |
|---|---|
| API suite: `bun run test` | **21 passed, 0 failed; 104 assertions** |
| Browser suite: `bun run test:ui` | **19 passed, 0 failed; no captured JavaScript errors** |
| Exported Postman collection: `bun run test:collection` | **31 request/assertion sequences passed** |
| PDF generation: `bun run guide` | **11 pages, no page overflow** |
| PDF extraction verification | **All source text retained on its intended page; all 11 footers present** |
| Demo seed, first run | **4 accounts / 4 stories created through real APIs** |
| Demo seed, second run | **0 duplicate stories added** |
| Actual ports 4000 and 5000 | **Both health endpoints and public feed verified** |

The local presentation data is already populated. Verification servers were stopped afterward so `START-APP.cmd` can use the required ports.

## API scenarios

- Public list/detail and missing-post handling
- Register validation, role validation, duplicate username handling
- Login success and invalid credentials
- JWT identity claims and exact 15-minute / 7-day lifetimes
- Saved user schema, salted hashes, saved refresh token, revoked_at
- Absent, malformed, wrong-secret, expired and refresh JWT rejection by Blog
- Reader restrictions; author create and edit
- Token-derived authorship, ignoring spoofed authorId/authorName
- Post input validation and partial updates
- Ownership denial for another author or reader
- Personal post filtering
- Admin create/edit/delete
- Refresh validation, type checking and token replacement
- Independent Blog behavior while Auth is stopped
- User/post/refresh persistence across restart
- Logout revocation and continued access-token validity until expiry
- Consistent error shapes, malformed JSON, oversized bodies and unknown routes
- Static frontend, Content Security Policy and blocked .env access

## Browser scenarios

1. Public homepage and empty state.
2. Author registration, login, publishing and detail view.
3. Owner editing and own-post filtering; no author delete button.
4. Manual session refresh.
5. Automatic refresh and retry after an expired access token.
6. UI logout actually revokes the saved refresh token.
7. Reader browsing and write/edit restrictions.
8. Another author cannot edit someone else's story.
9. Admin editing and cancelable delete confirmation.
10. Admin deletion removes the real API record.
11. Admin publishing through the UI.
12. User HTML displays as literal text; no injected image/script runs.
13. Search and no-results state.
14. 390px mobile viewport without horizontal overflow.
15. About page checks both live services.
16. Auth-offline feedback while Blog still accepts a valid access token.
17. Wrong-password feedback.
18. Missing-story recovery.
19. Signed-out public browsing.

Screenshots were saved and visually reviewed:
- `artifacts/desktop-home.png`
- `artifacts/mobile-home.png`
- `artifacts/architecture.png`

Raw logs and JSON reports are in `artifacts/` (git-ignored).

## Test isolation and limitations

API and browser suites use temporary storage directories, separate test ports, and temporary browser profiles. They do not wipe presentation data. The optional seed intentionally adds documented local demo accounts and stories.

The collection verifier executes the exported requests and test scripts with a small compatible `pm` shim; Postman's desktop application itself was not automated.

Playwright's pipe/WebSocket transport stalled under this Bun/Windows combination. The final browser suite instead uses a small native-WebSocket Chrome DevTools driver in `tests/browser.js`. Mouse actions use Chrome input dispatch; text entry dispatches DOM input/change events. This is real browser/API integration testing, not a simulated DOM, but it is not a complete accessibility or cross-browser audit.

The backend was executed under Bun, not the actual Node runtime. Backend source uses Node.js-compatible APIs; confirm the handout's explicit Node.js runtime requirement before presentation.

These checks do not guarantee a grade or production security. Admin self-registration, browser localStorage sessions, synchronous hashing and file-backed persistence are documented classroom tradeoffs.
