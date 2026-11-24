# ELENOR code structure

`app.js` loads the environment, connects MongoDB and starts the server. `src/app.js` builds the Express application and can be imported without opening a port or connecting the database.

| Folder | Responsibility |
| --- | --- |
| `src/routes` | URL, HTTP method and middleware order; delegates to named handlers. |
| `src/controllers` | Reads request data, coordinates model/service calls, renders views or redirects. |
| `src/models` | Mongoose schema, field constraints and persistence definitions. |
| `src/services` | Reusable domain logic: authentication/session creation, OTP issuance and hashing, Google client setup, address validation, product catalog, referrals, user access changes and admin sorting. |
| `src/middleware` | Authentication guards, CSRF checks, request preparation and error handling. |
| `src/config` | Database connection and session cookie configuration. |
| `src/views` | EJS templates for customer and admin screens. |
| `src/public` | Browser JavaScript, CSS and images. |

Request flow: route → middleware → controller → service/model → view or redirect.

For example, `POST /admin/users/:id/access` runs through the admin authentication guard, then `adminController.updateUserAccess` validates the request and calls `userService.setUserBlocked`. The service updates the account and revokes customer sessions when blocking. The controller redirects back to the user list.

To change user sorting, edit `src/services/adminUserService.js`. To change signup OTP issuance, edit `src/services/authService.js`; its route remains in `src/routes/authRoutes.js`.

Customer and admin cookies remain separate. Existing paths, form fields, validation, OTP deadlines and redirects are preserved. Keep `.env` private; it is not part of this refactor.

Run with `npm start`. The default port is 3000; set `PORT=3100` to use the current local address.
