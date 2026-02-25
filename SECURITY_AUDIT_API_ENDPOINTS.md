# Backend API Endpoints Security Audit

**Date:** 2026-02-25  
**Scope:** API endpoint security analysis  
**Files Analyzed:**
- `pms-server/src/api/*.js` - API route definitions
- `pms-server/src/controllers/*.js` - Controller implementations
- `pms-server/src/middlewares/*.js` - Middleware implementations

## Executive Summary

The PMIS backend exposes multiple API endpoints through Express.js routers. The analysis identified **7 security concerns**:

- **2 High** - Missing input validation, missing rate limiting
- **3 Medium** - Inconsistent authorization, missing request size limits, error information disclosure
- **2 Low** - Missing API versioning, missing request logging

**Overall Assessment:** The API uses the `authorize` middleware from `maroon-auth` for authentication, and `mongo-sanitize` for basic NoSQL injection protection. However, **systematic input validation and rate limiting are missing**, creating significant security risks.

## API Structure Overview

### Route Organization

```
/api/
├── /attachment/*          - File upload/download endpoints
├── /crud/*                - CRUD operations for all models
├── /dashboard/*           - Dashboard data endpoints
├── /finance/*             - Financial data endpoints
├── /history/*             - History/audit endpoints
├── /ipim/*                - IPIM-specific endpoints
├── /notification/*        - Notification endpoints
├── /report/*              - Report generation endpoints
└── /smoketest/*           - Health check endpoints
```

### Authentication Pattern

All API endpoints use the `authorize` middleware:

```javascript
router.route(`/${collection}`)
    .post(authorize, crudController.create)
    .get(authorize, crudController.viewAll)
```


## High Severity Issues

### 1. Missing Systematic Input Validation ⚠️ HIGH

**Severity:** HIGH  
**Location:** All API endpoints

**Finding:** No systematic input validation framework detected

**Current State:**
- Controllers accept `req.body` directly without validation
- Only `mongo-sanitize` used for NoSQL injection prevention
- No schema validation for request payloads
- No type checking or format validation
- No length limits on string inputs

**Example from crud.js:**
```javascript
create: async (req, res, next) => {
    try {
        const { ...info } = req.body  // No validation!
        let { user } = req.session
        user = user ? user : req.user

        const data = await crudService.create({
            info,
            user
        })

        res.status(201).json(data)
    }
    catch(error) {
        next(new RequestError(400, errorMessage(error)))
    }
}
```

**Vulnerabilities:**
- ⚠️ Type confusion attacks
- ⚠️ Injection attacks (SQL, NoSQL, command injection)
- ⚠️ Buffer overflow via long strings
- ⚠️ Business logic bypass via unexpected fields
- ⚠️ Mass assignment vulnerabilities

**Risk Level:** HIGH - Multiple attack vectors possible

**Remediation:**

Install express-validator:

```bash
npm install express-validator
```

Create validation middleware:

```javascript
// src/middlewares/validation.js
const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                details: errors.array()
            }
        });
    }
    next();
};

// Validation rules for common operations
const validationRules = {
    createProject: [
        body('name').isString().trim().isLength({ min: 1, max: 200 }),
        body('description').optional().isString().trim().isLength({ max: 2000 }),
        body('startDate').isISO8601().toDate(),
        body('endDate').isISO8601().toDate(),
        body('budget').isNumeric().isFloat({ min: 0 }),
        body('department').isMongoId(),
        body('projectType').isMongoId()
    ],
    
    updateProject: [
        param('_id').isMongoId(),
        body('name').optional().isString().trim().isLength({ min: 1, max: 200 }),
        body('description').optional().isString().trim().isLength({ max: 2000 }),
        body('startDate').optional().isISO8601().toDate(),
        body('endDate').optional().isISO8601().toDate(),
        body('budget').optional().isNumeric().isFloat({ min: 0 })
    ],
    
    deleteResource: [
        param('_id').isMongoId()
    ],
    
    deleteMultiple: [
        body('ids').isArray({ min: 1, max: 100 }),
        body('ids.*').isMongoId()
    ]
};

module.exports = { validate, validationRules };
```

Apply validation to routes:

```javascript
// In src/api/crud.js
const { validate, validationRules } = require('../middlewares/validation');

router.route(`/${collection}`)
    .post(
        authorize,
        validationRules.createProject,  // Add validation
        validate,
        crudController.create
    )
    .get(
        authorize,
        crudController.viewAll
    );

router.route(`/${collection}/:_id`)
    .patch(
        authorize,
        validationRules.updateProject,  // Add validation
        validate,
        crudController.update
    )
    .delete(
        authorize,
        validationRules.deleteResource,  // Add validation
        validate,
        canDeleteDocument(collection),
        crudController.delete
    );
```


### 2. Missing Rate Limiting on API Endpoints ⚠️ HIGH

**Severity:** HIGH  
**Location:** All API endpoints

**Finding:** No rate limiting middleware applied to API routes

**Current State:**
- No rate limiting on CRUD operations
- No rate limiting on file uploads
- No rate limiting on report generation
- Only password reset has custom rate limiting (in-memory, not distributed)

**Vulnerabilities:**
- ⚠️ Brute force attacks on authentication
- ⚠️ DoS attacks via resource exhaustion
- ⚠️ API abuse and scraping
- ⚠️ Excessive file uploads
- ⚠️ Report generation abuse

**Risk Level:** HIGH - Service disruption possible

**Remediation:**

See SECURITY_AUDIT_AUTH_SESSION.md for detailed rate limiting implementation using express-rate-limit and Redis.

Apply rate limiting to API routes:

```javascript
// In app.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

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
    }
});

// Strict rate limiter for file uploads
const uploadLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:upload:'
    }),
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 50,  // 50 uploads per hour
    message: {
        error: {
            code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
            message: 'Too many file uploads, please try again later'
        }
    }
});

// Apply rate limiters
app.use(`${baseUrl}/`, apiLimiter);
app.use(`${baseUrl}/attachment/`, uploadLimiter);
```

## Medium Severity Issues

### 3. Inconsistent Authorization Checks ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** Various API endpoints

**Finding:** Authorization logic is inconsistent and scattered

**Current State:**
- Some endpoints use `authorize` middleware (authentication only)
- Some endpoints have custom authorization in `maroonAuthMiddleware`
- Some endpoints have authorization in controllers
- No centralized authorization service
- Role checks use string includes (fragile)

**Example from maroonAuthMiddleware.js:**
```javascript
const isAllowed = userRole.includes('admin') || userRole.includes('superadmin')

if(dataview !== 'projectUsers' && !isAllowed) {
    next(new RequestError(403, 'Authorization error: Only IT Admin and Super Admin can view all users.'))
}
```

**Issues:**
- Authorization logic mixed with business logic
- Hard to audit and maintain
- Inconsistent error messages
- No resource-based access control
- No fine-grained permissions

**Risk Level:** MEDIUM - Authorization bypass possible

**Remediation:**

See SECURITY_AUDIT_AUTH_SESSION.md for detailed authorization service implementation.

Create authorization middleware:

```javascript
// src/middlewares/authorization.js
const authService = require('../services/authorizationService');
const { RequestError } = require('error-handler');

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.session.userRole) {
            return next(new RequestError(401, 'Authentication required'));
        }
        
        if (!authService.hasAnyRole(req.session.userRole, roles)) {
            return next(new RequestError(403, 'Insufficient permissions'));
        }
        
        next();
    };
};

const requireResourceOwnership = (resourceType) => {
    return async (req, res, next) => {
        const resourceId = req.params._id;
        const userId = req.session.user;
        
        const hasAccess = await authService.canAccessResource(
            userId,
            resourceType,
            resourceId
        );
        
        if (!hasAccess) {
            return next(new RequestError(403, 'Access denied to this resource'));
        }
        
        next();
    };
};

module.exports = { requireRole, requireResourceOwnership };
```

Apply to routes:

```javascript
const { requireRole, requireResourceOwnership } = require('../middlewares/authorization');

router.route(`/${collection}`)
    .post(
        authorize,
        requireRole('admin', 'superadmin'),  // Only admins can create
        validationRules.createProject,
        validate,
        crudController.create
    );

router.route(`/${collection}/:_id`)
    .patch(
        authorize,
        requireResourceOwnership('project'),  // Only owner can update
        validationRules.updateProject,
        validate,
        crudController.update
    );
```


### 4. Missing Request Size Limits ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** File upload endpoints

**Finding:** Request size limits configured globally but not per-endpoint

**Current Configuration:**
```javascript
// In app.js
app.use(express.json({
    limit: payloadMaxSize  // 20mb globally
}));
app.use(express.urlencoded({
    extended: true,
    limit: payloadMaxSize  // 20mb globally
}))
```

**Issues:**
- Same limit for all endpoints (20MB)
- No differentiation between regular API calls and file uploads
- No per-user upload quotas
- Could lead to DoS via large payloads

**Risk Level:** MEDIUM - Resource exhaustion possible

**Remediation:**

Configure different limits for different endpoint types:

```javascript
// In app.js

// Strict limit for regular API endpoints
app.use(`${baseUrl}/`, express.json({ limit: '1mb' }));
app.use(`${baseUrl}/`, express.urlencoded({ extended: true, limit: '1mb' }));

// Higher limit for file upload endpoints
app.use(`${baseUrl}/attachment/`, express.json({ limit: '50mb' }));
app.use(`${baseUrl}/attachment/`, express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer with file size limits
const multer = require('multer');
const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024,  // 10MB per file
        files: 5  // Maximum 5 files per request
    }
});
```

Implement per-user upload quotas:

```javascript
// src/middlewares/uploadQuota.js
const checkUploadQuota = async (req, res, next) => {
    const userId = req.session.user;
    const userQuota = await getUserUploadQuota(userId);
    
    if (userQuota.used >= userQuota.limit) {
        return next(new RequestError(429, 'Upload quota exceeded'));
    }
    
    next();
};
```

### 5. Error Information Disclosure ⚠️ MEDIUM

**Severity:** MEDIUM  
**Location:** Error handling in controllers

**Finding:** Error messages may leak sensitive information

**Current Implementation:**
```javascript
catch(error) {
    next(new RequestError(400, errorMessage(error)))
}
```

**Issues:**
- Database error messages exposed to client
- Stack traces may be included in development
- Internal paths may be revealed
- Schema information may be leaked

**Risk Level:** MEDIUM - Information disclosure

**Remediation:**

Implement error sanitization:

```javascript
// src/lib/errorHandler.js
const sanitizeError = (error, environment) => {
    // In production, return generic messages
    if (environment === 'production') {
        // Log full error server-side
        logger.error('API Error', {
            error: error.message,
            stack: error.stack,
            code: error.code
        });
        
        // Return sanitized error to client
        return {
            code: error.code || 'INTERNAL_ERROR',
            message: 'An error occurred processing your request',
            requestId: req.id
        };
    }
    
    // In development, return detailed errors
    return {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        stack: error.stack,
        requestId: req.id
    };
};

// In controllers
catch(error) {
    const sanitized = sanitizeError(error, environment);
    next(new RequestError(400, sanitized.message, sanitized));
}
```

## Low Severity Issues

### 6. Missing API Versioning ⚠️ LOW

**Severity:** LOW  
**Location:** API structure

**Finding:** No API versioning strategy

**Current State:**
- All endpoints under `/api/` without version
- Breaking changes would affect all clients
- No migration path for API changes

**Risk Level:** LOW - Maintenance and compatibility issues

**Remediation:**

Implement API versioning:

```javascript
// Option 1: URL-based versioning
app.use('/api/v1/', apiRoutesV1);
app.use('/api/v2/', apiRoutesV2);

// Option 2: Header-based versioning
app.use((req, res, next) => {
    const version = req.headers['api-version'] || 'v1';
    req.apiVersion = version;
    next();
});
```

### 7. Missing Request Logging ⚠️ LOW

**Severity:** LOW  
**Location:** Application-wide

**Finding:** Limited request logging with Morgan

**Current Configuration:**
```javascript
app.use(morgan(morganRules.default))
// Format: ':method :url :status :response-time ms - :res[content-length]'
```

**Issues:**
- No request ID for tracing
- No user ID in logs
- No request body logging (for audit)
- No correlation between requests

**Risk Level:** LOW - Audit and debugging difficulties

**Remediation:**

Implement comprehensive request logging:

```javascript
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// Add request ID middleware
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Configure Winston logger
const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/api.log' }),
        new winston.transports.Console()
    ]
});

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        logger.info('API Request', {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: Date.now() - startTime,
            userId: req.session?.user,
            userRole: req.session?.userRole,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
    });
    
    next();
});
```


## Positive Security Findings ✅

### 1. Authentication Middleware Applied

All API endpoints use the `authorize` middleware from `maroon-auth`:

```javascript
router.route(`/${collection}`)
    .post(authorize, crudController.create)
    .get(authorize, crudController.viewAll)
```

### 2. NoSQL Injection Protection

`mongo-sanitize` is used in critical areas:

```javascript
const sanitize = require('mongo-sanitize')
const doc = await model.findById(sanitize(_id))
```

### 3. Custom Authorization Middleware

Some endpoints have additional authorization checks:

```javascript
router.route(`/${collection}/:_id`)
    .delete(
        authorize,
        canDeleteDocument(collection),  // Additional check
        crudController.delete
    )
```

### 4. File Upload Middleware

File uploads have dedicated middleware for validation:

```javascript
router.route(`/attachment/:_model/:_id/:_fieldName`)
    .post(
        authorize,
        canUploadAttachment,  // Validates upload permissions
        attachment.post
    )
```

### 5. Helmet Security Headers

Basic security headers configured:

```javascript
app.use(helmet.frameguard({ action: "sameorigin" }))
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: [ "'self'" ],
        frameAncestors: [ "'self'" ],
        formAction: [ "'self'" ]
    }
}))
app.use(helmet.noSniff())
```

## API Endpoint Inventory

### CRUD Endpoints (All Models)

For each model in the system:

```
POST   /{collection}                    - Create new resource
GET    /{collection}                    - List all resources
GET    /{collection}/:_id               - Get specific resource
PATCH  /{collection}/:_id               - Update resource
DELETE /{collection}/:_id               - Delete resource
PATCH  /{collection}/:_id/activate      - Activate resource
GET    /{collection}/years/active       - Get active years
GET    /{collection}/years/archived     - Get archived years
POST   /{collection}/multiple/delete    - Delete multiple resources
POST   /{collection}/multiple/activate  - Activate multiple resources
```

**Security Status:**
- ✅ Authentication: Required (authorize middleware)
- ⚠️ Input Validation: Missing
- ⚠️ Rate Limiting: Missing
- ⚠️ Authorization: Inconsistent

### Attachment Endpoints

```
POST   /attachment/:_model/:_id/:_fieldName                    - Upload file
GET    /attachment/:_model/:_id/:_fieldName/:_fileName         - Download file
PATCH  /attachment/:_model/:_id/:_fieldName/:_fileName         - Update filename
DELETE /attachment/:_model/:_id/:_fieldName/:_fileName         - Delete file
POST   /attachment/:_model/:_id/:_fieldName/:_index            - Upload to array
GET    /attachment/:_model/:_id/:_fieldName/:_index/:_fileName - Download from array
DELETE /attachment/:_model/:_id/:_fieldName/:_index/:_fileName - Delete from array
PATCH  /attachment/:_model/:_id/:_fieldName/:_operate/multiple - Bulk operations
PATCH  /attachment/:_model/:_id/:_fieldName/:_fileName/:_operate - File operations
```

**Security Status:**
- ✅ Authentication: Required
- ✅ Authorization: Custom middleware (canUploadAttachment, canAccessAttachment)
- ⚠️ Input Validation: Partial (file type validation in middleware)
- ⚠️ Rate Limiting: Missing
- ⚠️ File Size Limits: Global only

### Dashboard Endpoints

```
GET /dashboard/* - Various dashboard data endpoints
```

**Security Status:**
- ✅ Authentication: Required
- ⚠️ Authorization: Needs review
- ⚠️ Rate Limiting: Missing

### Finance Endpoints

```
POST/GET/PATCH/DELETE /finance/* - Financial data operations
```

**Security Status:**
- ✅ Authentication: Required
- ⚠️ Authorization: Needs review (sensitive financial data)
- ⚠️ Input Validation: Missing
- ⚠️ Rate Limiting: Missing
- ⚠️ Audit Logging: Should be enhanced

### Report Endpoints

```
GET /report/* - Report generation endpoints
```

**Security Status:**
- ✅ Authentication: Required
- ⚠️ Authorization: Needs review
- ⚠️ Rate Limiting: Missing (important for resource-intensive operations)
- ⚠️ Output Sanitization: Needs review

## Security Recommendations by Priority

### Critical Priority (Week 1)

1. ✅ **Implement systematic input validation** using express-validator
   - Create validation schemas for all models
   - Apply validation middleware to all endpoints
   - Validate types, formats, lengths, ranges

2. ✅ **Implement rate limiting** using express-rate-limit with Redis
   - General API: 100 requests per 15 minutes
   - Authentication: 5 requests per 15 minutes
   - File uploads: 50 uploads per hour
   - Reports: 10 requests per hour

3. ✅ **Implement CSRF protection** (see SECURITY_AUDIT_AUTH_SESSION.md)
   - Use csurf middleware
   - Provide CSRF tokens to frontend
   - Validate tokens on state-changing operations

### High Priority (Week 2-3)

4. ✅ **Centralize authorization logic**
   - Create AuthorizationService
   - Implement role-based access control
   - Implement resource-based access control
   - Apply consistent authorization checks

5. ✅ **Implement request size limits per endpoint**
   - 1MB for regular API calls
   - 50MB for file uploads
   - Per-user upload quotas

6. ✅ **Enhance error handling**
   - Sanitize error messages in production
   - Implement structured error responses
   - Add request ID for tracing

### Medium Priority (Week 4-6)

7. ✅ **Implement API versioning**
   - Use URL-based versioning (/api/v1/)
   - Document migration path

8. ✅ **Enhance request logging**
   - Add request IDs
   - Log user context
   - Implement audit logging for sensitive operations

9. ✅ **Implement output sanitization**
   - Sanitize data before sending to client
   - Remove sensitive fields
   - Implement field-level permissions

### Long-term (Ongoing)

10. ✅ **Implement API documentation** (OpenAPI/Swagger)
11. ✅ **Implement API monitoring and alerting**
12. ✅ **Implement API analytics**
13. ✅ **Implement API gateway** (optional, for microservices)

## Testing Requirements

After implementing security fixes, test:

1. **Input Validation:**
   - Test with invalid data types
   - Test with missing required fields
   - Test with oversized inputs
   - Test with special characters
   - Test with SQL/NoSQL injection payloads

2. **Rate Limiting:**
   - Test exceeding rate limits
   - Test rate limit reset
   - Test distributed rate limiting (multiple servers)

3. **Authorization:**
   - Test access with different roles
   - Test resource ownership checks
   - Test privilege escalation attempts

4. **File Uploads:**
   - Test file size limits
   - Test file type restrictions
   - Test malicious file uploads
   - Test upload quotas

5. **Error Handling:**
   - Test error messages don't leak information
   - Test error responses are consistent
   - Test request IDs are included

## Compliance Checklist

- [x] Authentication required on all endpoints
- [x] NoSQL injection protection (mongo-sanitize)
- [x] Basic security headers (Helmet)
- [ ] **CRITICAL:** Systematic input validation
- [ ] **CRITICAL:** Rate limiting on all endpoints
- [ ] **HIGH:** CSRF protection
- [ ] **HIGH:** Centralized authorization
- [ ] **MEDIUM:** Request size limits per endpoint
- [ ] **MEDIUM:** Error message sanitization
- [ ] **LOW:** API versioning
- [ ] **LOW:** Comprehensive request logging

## Conclusion

The PMIS backend API has a solid authentication foundation using `maroon-auth` and basic NoSQL injection protection with `mongo-sanitize`. However, **critical security gaps exist in input validation and rate limiting** that must be addressed before production deployment.

**Critical Issues:**
1. No systematic input validation framework
2. No rate limiting on API endpoints
3. Inconsistent authorization checks
4. Missing CSRF protection (see SECURITY_AUDIT_AUTH_SESSION.md)

**Estimated Effort:**
- Input validation implementation: 24-32 hours
- Rate limiting implementation: 8-16 hours
- Authorization centralization: 16-24 hours
- Error handling improvements: 8-16 hours
- Testing: 24-32 hours
- Total: 80-120 hours (10-15 days)

**Risk if not addressed:**
- Data corruption via invalid inputs
- DoS attacks via API abuse
- Authorization bypass
- Information disclosure via error messages
- CSRF attacks on state-changing operations
