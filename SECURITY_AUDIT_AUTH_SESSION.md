# Backend Authentication and Session Management Security Audit

**Date:** 2026-02-25  
**Scope:** Authentication and session management implementation  
**Files Analyzed:**
- `pms-server/app.js` - Session configuration
- `pms-server/src/config/auth.js` - Authentication configuration
- `pms-server/src/middlewares/maroonAuthMiddleware.js` - Custom auth middleware
- `pms-server/src/middlewares/app.js` - Application middleware

## Executive Summary

The PMIS backend uses the `maroon-auth` package for authentication and `express-session` with MongoDB storage for session management. The analysis identified **8 security concerns** ranging from critical to low severity:

- **1 Critical** - Missing secure cookie configuration
- **3 High** - Session fixation, missing CSRF protection, weak password requirements
- **2 Medium** - Rate limiting gaps, authorization logic issues
- **2 Low** - Session timeout configuration, error message verbosity

## Authentication Configuration Analysis

### Authentication Provider: maroon-auth

The application uses a custom authentication package `maroon-auth` from Maroon Studios with the following configuration:

```javascript
// From src/config/auth.js
const auth = require('maroon-auth')({
    uri: dbURL,
    configUri: authURL,
    settings: {
        minUsernameLength: 6,
        maxUsernameLength: Infinity,
        minPasswordLength: 8,
        maxPasswordLength: Infinity,
        otpExpiry: 900000,  // 15 minutes
        saltLength: 10,
        userLockoutTimeout: 180000,  // 3 minutes
        maxFailedLogins: 5,
        maxSessions: 20,
        storePreviousPasswords: true,
        maximumStoredPasswords: 3,
        autoLogOutEnabled: true
    }
})
```

### Positive Security Features ✅

1. **Account Lockout:** Configured with 5 failed login attempts
2. **User Lockout Timeout:** 3 minutes (180000ms)
3. **Password History:** Stores last 3 passwords to prevent reuse
4. **OTP Expiry:** 15 minutes for one-time passwords
5. **Auto Logout:** Enabled
6. **Max Sessions:** Limited to 20 concurrent sessions per user
7. **Salt Length:** 10 rounds (acceptable, but could be higher)

## Session Management Analysis

### Session Configuration

```javascript
// From app.js
const sessionConfig = {
    secret,  // From environment variable
    resave: false,
    rolling: true,
    cookie: {
        maxAge: parseInt(cookieMaxAge, 10)  // From environment variable
    },
    name: `${appData.title}.sid`,
    saveUninitialized: false,
    unset: 'destroy',
    store: new MongoStore({
        mongooseConnection: db,
        stringify: false
    })
}
```

## Critical Security Issues

### 1. Missing Secure Cookie Attributes ⚠️ CRITICAL

**Severity:** CRITICAL  
**Location:** `pms-server/app.js` - sessionConfig

**Finding:** Session cookies are missing critical security attributes:

```javascript
// Current configuration
cookie: {
    maxAge: parseInt(cookieMaxAge, 10)
}

// Missing attributes:
// - httpOnly: true
// - secure: true (for HTTPS)
// - sameSite: 'strict' or 'lax'
```

**Impact:**
- **No httpOnly flag:** Cookies accessible via JavaScript, vulnerable to XSS attacks
- **No secure flag:** Cookies can be transmitted over HTTP, vulnerable to man-in-the-middle attacks
- **No sameSite flag:** Vulnerable to CSRF attacks

**Risk Level:** CRITICAL - Session hijacking, XSS, CSRF attacks possible

**Remediation:**

```javascript
const sessionConfig = {
    secret,
    resave: false,
    rolling: true,
    cookie: {
        maxAge: parseInt(cookieMaxAge, 10),
        httpOnly: true,           // Prevent JavaScript access
        secure: environment === 'production',  // HTTPS only in production
        sameSite: 'strict',       // CSRF protection
        path: '/',
        domain: environment === 'production' ? domain : undefined
    },
    name: `${appData.title}.sid`,
    saveUninitialized: false,
    unset: 'destroy',
    store: new MongoStore({
        mongooseConnection: db,
        stringify: false,
        touchAfter: 24 * 3600  // Lazy session update (24 hours)
    })
}
```

**Testing Required:**
- Verify cookies are not accessible via `document.cookie` in browser console
- Verify cookies are only sent over HTTPS in production
- Verify cookies are not sent with cross-site requests

## High Severity Issues

### 2. Session Fixation Vulnerability ⚠️ HIGH

**Severity:** HIGH  
**Location:** Session management

**Finding:** No evidence of session regeneration after login

**Current Behavior:**
- Session ID is not regenerated after successful authentication
- Same session ID used before and after login
- Vulnerable to session fixation attacks

**Attack Scenario:**
1. Attacker obtains a valid session ID (e.g., by visiting the site)
2. Attacker tricks victim into using that session ID
3. Victim logs in with the attacker's session ID
4. Attacker now has access to victim's authenticated session

**Risk Level:** HIGH - Session hijacking possible

**Remediation:**

Add session regeneration in authentication flow:

```javascript
// In maroon-auth or custom login handler
app.post('/login', async (req, res, next) => {
    // ... authentication logic ...
    
    // After successful authentication:
    const oldSessionData = req.session;
    
    req.session.regenerate((err) => {
        if (err) {
            return next(err);
        }
        
        // Restore session data
        Object.assign(req.session, oldSessionData);
        
        // Set new session data
        req.session.user = user._id;
        req.session.userRole = user.userRole;
        req.session.username = user.username;
        
        req.session.save((err) => {
            if (err) {
                return next(err);
            }
            res.json({ success: true });
        });
    });
});
```

**Also regenerate on:**
- Privilege escalation
- Password change
- Role change

### 3. Missing CSRF Protection ⚠️ HIGH

**Severity:** HIGH  
**Location:** Application-wide

**Finding:** No CSRF token implementation detected

**Current State:**
- No CSRF middleware configured
- No CSRF token generation or validation
- State-changing operations (POST, PUT, DELETE, PATCH) are vulnerable

**Impact:**
- Attackers can forge requests from authenticated users
- Users can be tricked into performing unwanted actions
- Particularly dangerous for:
  - Password changes
  - User deletion
  - Project modifications
  - Financial transactions

**Risk Level:** HIGH - Cross-site request forgery attacks possible

**Remediation:**

Install and configure csurf:

```bash
npm install csurf
```

```javascript
// In app.js
const csrf = require('csurf');

// Configure CSRF protection
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: environment === 'production',
        sameSite: 'strict'
    }
});

// Apply to all routes except login (or use selective protection)
app.use(csrfProtection);

// Provide CSRF token to frontend
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// Error handler for CSRF failures
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        res.status(403).json({
            error: {
                code: 'CSRF_ERROR',
                message: 'Invalid CSRF token'
            }
        });
    } else {
        next(err);
    }
});
```

**Frontend Integration:**

```javascript
// Fetch CSRF token on app initialization
const response = await fetch('/api/csrf-token');
const { csrfToken } = await response.json();

// Include in all state-changing requests
fetch('/api/endpoint', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
});
```

### 4. Weak Password Requirements ⚠️ HIGH

**Severity:** HIGH  
**Location:** `pms-server/src/config/auth.js`

**Finding:** Password requirements are insufficient

**Current Configuration:**
```javascript
minPasswordLength: 8,
maxPasswordLength: Infinity,
passwordValidation: passwordRegex,
passwordValidationDescription: 'a sequence of ten (10) or more characters'
```

**Issues:**
- Minimum length of 8 is below current best practices (12+ recommended)
- Description mentions 10 characters but config says 8 (inconsistency)
- No complexity requirements visible (need to check passwordRegex)
- No maximum length limit (should be reasonable, e.g., 128)

**Risk Level:** HIGH - Weak passwords increase brute force attack success

**Remediation:**

```javascript
// Update password requirements
minPasswordLength: 12,  // Increase to 12 characters minimum
maxPasswordLength: 128,  // Set reasonable maximum
passwordValidation: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
passwordValidationDescription: 'at least 12 characters with uppercase, lowercase, number, and special character',
```

**Password Policy:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Maximum 128 characters (prevent DoS via bcrypt)

**Additional Recommendations:**
- Implement password strength meter in frontend
- Check against common password lists (e.g., Have I Been Pwned API)
- Enforce password expiration (90 days for sensitive systems)
- Prevent password reuse (already implemented with maximumStoredPasswords: 3)

## Medium Severity Issues

### 5. Insufficient Rate Limiting ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** `pms-server/src/middlewares/maroonAuthMiddleware.js`

**Finding:** Rate limiting only on password reset, not on login

**Current Implementation:**
```javascript
// Only for forgot password endpoint
if (req.originalUrl.includes('/user/password/forgot')) {
    if (ids[`${username}`]) {
        next(new RequestError(400, `Need to wait ${calculateDiff(ids[`${username}`])} seconds to generate a link again.`))
    }
    else {
        ids[`${username}`] = Date.now()
        setTimeout(() => {
            delete ids[`${username}`]
        }, miliSecToSec(seconds))  // 180 seconds
    }
}
```

**Issues:**
- Rate limiting implemented in-memory (not distributed)
- Only protects password reset endpoint
- No rate limiting on login endpoint
- No rate limiting on other sensitive endpoints
- In-memory storage lost on server restart
- Doesn't work in multi-server deployments

**Risk Level:** MEDIUM - Brute force attacks possible on login

**Remediation:**

Install express-rate-limit:

```bash
npm install express-rate-limit redis
npm install rate-limit-redis
```

```javascript
// In app.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

const redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
});

// General API rate limiter
const apiLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:api:'
    }),
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,  // 100 requests per window
    message: {
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,  // 5 attempts per window
    skipSuccessfulRequests: true,  // Don't count successful logins
    message: {
        error: {
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts, please try again later'
        }
    }
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/user/account/login', authLimiter);
app.use('/api/user/password/forgot', authLimiter);
app.use('/api/user/password/reset', authLimiter);
```

### 6. Authorization Logic Complexity ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** `pms-server/src/middlewares/maroonAuthMiddleware.js`

**Finding:** Complex authorization logic scattered across middleware

**Issues:**
- Authorization checks mixed with business logic
- Hard to audit and maintain
- Inconsistent error messages
- No centralized authorization service
- Role checks using string includes (fragile)

**Example:**
```javascript
const isAllowed = userRole.includes('admin') || userRole.includes('superadmin')

if(dataview !== 'projectUsers' && !isAllowed) {
    next(new RequestError(403, 'Authorization error: Only IT Admin and Super Admin can view all users.'))
}
```

**Risk Level:** MEDIUM - Authorization bypass possible due to complexity

**Remediation:**

Create centralized authorization service:

```javascript
// src/services/authorizationService.js
class AuthorizationService {
    constructor() {
        this.roleHierarchy = {
            'superadmin': ['admin', 'user'],
            'admin': ['user'],
            'user': []
        };
    }

    hasRole(userRoles, requiredRole) {
        if (!Array.isArray(userRoles)) {
            userRoles = [userRoles];
        }
        
        return userRoles.some(role => {
            if (role === requiredRole) return true;
            const inherited = this.roleHierarchy[role] || [];
            return inherited.includes(requiredRole);
        });
    }

    hasAnyRole(userRoles, requiredRoles) {
        return requiredRoles.some(role => this.hasRole(userRoles, role));
    }

    canAccessResource(user, resource, action) {
        // Implement resource-based access control
        const permissions = this.getPermissions(user.userRole);
        return permissions[resource]?.includes(action);
    }

    canModifyUser(currentUser, targetUser) {
        // Superadmin can modify anyone
        if (this.hasRole(currentUser.userRole, 'superadmin')) {
            return true;
        }
        
        // Admin can modify non-superadmin users
        if (this.hasRole(currentUser.userRole, 'admin')) {
            return !this.hasRole(targetUser.userRole, 'superadmin');
        }
        
        // Users can only modify themselves
        return currentUser._id.toString() === targetUser._id.toString();
    }
}

module.exports = new AuthorizationService();
```

**Usage:**
```javascript
const authService = require('../services/authorizationService');

// In middleware
if (!authService.hasAnyRole(req.session.userRole, ['admin', 'superadmin'])) {
    return next(new RequestError(403, 'Insufficient permissions'));
}
```

## Low Severity Issues

### 7. Session Timeout Configuration ⚠️ LOW

**Severity:** LOW  
**Location:** Session configuration

**Finding:** Session timeout is configurable but not validated

**Current:**
```javascript
cookie: {
    maxAge: parseInt(cookieMaxAge, 10)  // From environment variable
}
```

**Issues:**
- No validation of cookieMaxAge value
- Could be set to extremely long duration
- No warning if set insecurely
- No default fallback if not set

**Risk Level:** LOW - Could lead to long-lived sessions

**Remediation:**

```javascript
// Validate and set reasonable defaults
const DEFAULT_SESSION_TIMEOUT = 24 * 60 * 60 * 1000;  // 24 hours
const MAX_SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;  // 7 days

let sessionTimeout = parseInt(cookieMaxAge, 10) || DEFAULT_SESSION_TIMEOUT;

if (sessionTimeout > MAX_SESSION_TIMEOUT) {
    console.warn(`Session timeout ${sessionTimeout}ms exceeds maximum ${MAX_SESSION_TIMEOUT}ms, using maximum`);
    sessionTimeout = MAX_SESSION_TIMEOUT;
}

const sessionConfig = {
    secret,
    resave: false,
    rolling: true,
    cookie: {
        maxAge: sessionTimeout,
        httpOnly: true,
        secure: environment === 'production',
        sameSite: 'strict'
    },
    // ... rest of config
}
```

### 8. Verbose Error Messages ⚠️ LOW

**Severity:** LOW  
**Location:** `pms-server/src/config/auth.js`

**Finding:** Verbose authorization messages enabled

**Current:**
```javascript
verboseAuthorizeMessages: true,
technicalMessage: false,
```

**Impact:**
- Verbose messages may leak information about system structure
- Could help attackers understand authorization logic
- Not critical but reduces security through obscurity

**Risk Level:** LOW - Information disclosure

**Remediation:**

```javascript
// In production, use generic messages
verboseAuthorizeMessages: environment !== 'production',
technicalMessage: false,
customErrorMessages: {
    notActive: 'Authentication failed',  // Generic message
    unauthorized: 'Access denied',
    forbidden: 'Insufficient permissions'
}
```

## Missing Security Controls

### 9. No Multi-Factor Authentication (MFA)

**Status:** NOT IMPLEMENTED  
**Priority:** HIGH (for production)

**Recommendation:**
- Implement TOTP-based MFA (Time-based One-Time Password)
- Use libraries like `speakeasy` or `otplib`
- Require MFA for admin and superadmin roles
- Provide backup codes (already partially implemented)

### 10. No Session Activity Logging

**Status:** PARTIAL (logout logged, but not other activities)  
**Priority:** MEDIUM

**Current Implementation:**
```javascript
// Only logout is logged
if(req.originalUrl.includes('/user/account/logout')) {
    const authDoc = await Authentication.findOne({
        userDocument: sanitize(userId)
    })
    Object.assign(authDoc, {
        _revision: {
            author: {
                userModel: 'User',
                doc: userId
            },
            description: 'User logged out.'
        }
    })
    await authDoc.save()
}
```

**Recommendation:**
- Log all authentication events (login, logout, failed attempts)
- Log session creation and destruction
- Log privilege escalation
- Include IP address, user agent, timestamp
- Implement audit trail for security investigations

### 11. No IP-Based Access Control

**Status:** NOT IMPLEMENTED  
**Priority:** MEDIUM

**Recommendation:**
- Implement IP whitelisting for admin access
- Track and alert on login from new locations
- Implement geolocation-based anomaly detection
- Allow users to view active sessions and locations

## Security Best Practices Compliance

| Security Control | Status | Priority |
|-----------------|--------|----------|
| Secure cookie attributes (httpOnly, secure, sameSite) | ❌ Missing | CRITICAL |
| Session regeneration after login | ❌ Missing | HIGH |
| CSRF protection | ❌ Missing | HIGH |
| Strong password requirements | ⚠️ Weak | HIGH |
| Account lockout | ✅ Implemented | - |
| Rate limiting on authentication | ⚠️ Partial | MEDIUM |
| Centralized authorization | ⚠️ Scattered | MEDIUM |
| Session timeout validation | ⚠️ Weak | LOW |
| MFA/2FA | ❌ Missing | HIGH |
| Session activity logging | ⚠️ Partial | MEDIUM |
| IP-based access control | ❌ Missing | MEDIUM |
| Password history | ✅ Implemented | - |
| Auto logout | ✅ Implemented | - |

## Recommendations Summary

### Immediate Actions (Critical Priority)

1. ✅ **Add secure cookie attributes** (httpOnly, secure, sameSite)
2. ✅ **Implement session regeneration** after login
3. ✅ **Add CSRF protection** using csurf middleware
4. ✅ **Strengthen password requirements** (12+ characters, complexity)

### High Priority Actions

5. ✅ **Implement distributed rate limiting** using Redis
6. ✅ **Add MFA/2FA** for admin accounts
7. ✅ **Centralize authorization logic** in dedicated service
8. ✅ **Implement comprehensive session logging**

### Medium Priority Actions

9. ✅ **Add IP-based access control** for admin endpoints
10. ✅ **Implement session timeout validation**
11. ✅ **Reduce error message verbosity** in production
12. ✅ **Add session management UI** (view/revoke active sessions)

### Long-term Actions

13. ✅ **Implement anomaly detection** for authentication
14. ✅ **Add security headers** (already partially done with Helmet)
15. ✅ **Implement password breach checking** (Have I Been Pwned API)
16. ✅ **Add biometric authentication** support (optional)

## Implementation Priority

### Phase 1: Critical Fixes (Week 1)
- Secure cookie configuration
- Session regeneration
- CSRF protection
- Password requirements

### Phase 2: High Priority (Week 2-3)
- Distributed rate limiting
- MFA implementation
- Authorization service
- Session logging

### Phase 3: Medium Priority (Week 4-6)
- IP-based access control
- Session management UI
- Error message sanitization
- Timeout validation

### Phase 4: Long-term (Ongoing)
- Anomaly detection
- Password breach checking
- Advanced security features

## Testing Requirements

After implementing security fixes, test:

1. **Cookie Security:**
   - Verify httpOnly flag prevents JavaScript access
   - Verify secure flag enforces HTTPS
   - Verify sameSite prevents CSRF

2. **Session Management:**
   - Verify session ID changes after login
   - Verify old session is invalidated
   - Verify session timeout works correctly

3. **CSRF Protection:**
   - Verify state-changing requests require CSRF token
   - Verify invalid tokens are rejected
   - Verify token rotation works

4. **Rate Limiting:**
   - Verify login rate limiting (5 attempts per 15 min)
   - Verify API rate limiting (100 requests per 15 min)
   - Verify rate limits reset correctly

5. **Password Requirements:**
   - Verify minimum length enforcement
   - Verify complexity requirements
   - Verify password history check

6. **Authorization:**
   - Verify role-based access control
   - Verify privilege escalation prevention
   - Verify resource ownership checks

## Conclusion

The PMIS backend has a solid foundation with the `maroon-auth` package providing account lockout, password history, and auto-logout features. However, **critical security gaps exist in session management and CSRF protection** that must be addressed before production deployment.

**Critical Issues:**
1. Missing secure cookie attributes (httpOnly, secure, sameSite)
2. No session regeneration after login
3. No CSRF protection
4. Weak password requirements

**Estimated Effort:**
- Critical fixes: 8-16 hours
- High priority: 16-24 hours
- Medium priority: 16-24 hours
- Testing: 16-24 hours
- Total: 56-88 hours (7-11 days)

**Risk if not addressed:**
- Session hijacking via XSS attacks
- Session fixation attacks
- CSRF attacks on state-changing operations
- Brute force attacks on weak passwords
- Unauthorized access due to authorization bypass
