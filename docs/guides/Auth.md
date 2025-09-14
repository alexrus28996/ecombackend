# Auth Guide

This guide covers auth flows for clients and the admin panel.

Base URL: `http://localhost:<PORT>` (default 4001)
API prefix: `/api`

## Endpoints
- Register: `POST /api/auth/register` { name, email, password }
- Login: `POST /api/auth/login` → { token, refreshToken, user }
- Me: `GET /api/auth/me` (Bearer token)
- Refresh: `POST /api/auth/refresh` { refreshToken }
- Logout: `POST /api/auth/logout` { refreshToken }
- Password change: `POST /api/auth/password/change` (auth)
- Password reset:
  - Request: `POST /api/auth/password/forgot`
  - Confirm: `POST /api/auth/password/reset`
- Email:
  - Verify request: `POST /api/auth/email/verify/request` (auth)
  - Verify token: `POST /api/auth/email/verify`
  - Change request: `POST /api/auth/email/change/request` (auth)
- Preferences:
  - Get: `GET /api/auth/preferences`
  - Update: `PATCH /api/auth/preferences`

## Typical Flow (User)
1. Register
2. Login → store `token` + `refreshToken`
3. Authorize protected calls with `Authorization: Bearer <token>`
4. When access token expires, call `/auth/refresh` with `refreshToken`
5. Logout to revoke refresh token

## cURL Examples
Login:
```
curl -X POST "http://localhost:4001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

Me:
```
curl "http://localhost:4001/api/auth/me" -H "Authorization: Bearer <TOKEN>"
```

Refresh:
```
curl -X POST "http://localhost:4001/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH>"}'
```

