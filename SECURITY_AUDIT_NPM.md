# Backend NPM Security Audit Report

**Date:** 2026-02-25  
**Audited Package:** pms-server/package.json  
**Tool:** npm audit  

## Executive Summary

The npm audit identified **75 vulnerabilities** across the backend dependencies:
- **5 Critical** severity vulnerabilities
- **31 High** severity vulnerabilities
- **30 Moderate** severity vulnerabilities
- **9 Low** severity vulnerabilities

## Critical Vulnerabilities (Priority 1)

### 1. @babel/traverse - Arbitrary Code Execution
- **Severity:** Critical
- **Package:** @babel/traverse <7.23.2
- **CVE:** GHSA-67hx-6x53-jw92
- **Impact:** Arbitrary code execution when compiling specifically crafted malicious code
- **Fix:** `npm audit fix` (updates to safe version)
- **Status:** ⚠️ REQUIRES IMMEDIATE ATTENTION

### 2. crypto-js - PBKDF2 Weakness
- **Severity:** Critical
- **Package:** crypto-js <4.2.0
- **CVE:** GHSA-xwcq-pm8m-c4vf
- **Impact:** PBKDF2 implementation is 1,000 times weaker than specified in 1993 and 1.3M times weaker than current standard
- **Fix:** `npm audit fix` (updates to crypto-js@4.2.0+)
- **Status:** ⚠️ REQUIRES IMMEDIATE ATTENTION
- **Note:** This is a DIRECT dependency - used for password hashing and encryption

### 3. form-data - Unsafe Random Function
- **Severity:** Critical
- **Package:** form-data 3.0.0-3.0.3 || 4.0.0-4.0.3
- **CVE:** GHSA-fjxv-7rqg-78g4
- **Impact:** Uses unsafe random function for choosing boundary, potentially predictable
- **Fix:** `npm audit fix` (updates to safe version)
- **Status:** ⚠️ REQUIRES IMMEDIATE ATTENTION

### 4. mongoose - Multiple Prototype Pollution Vulnerabilities
- **Severity:** Critical
- **Package:** mongoose <=6.13.5
- **CVEs:** 
  - GHSA-f825-f98c-gj3g (Prototype pollution via Schema.path)
  - GHSA-9m93-w8w6-76hh (Prototype Pollution)
  - GHSA-h8hf-x3f4-xwgp (Prototype Pollution in Schema Object)
  - GHSA-vg7j-7cwx-8wgw (Search injection)
  - GHSA-m7xq-9374-9rvx (Search injection)
- **Impact:** Prototype pollution can lead to arbitrary code execution, search injection can bypass security controls
- **Fix:** `npm audit fix` (updates to mongoose@6.13.6+)
- **Status:** ⚠️ REQUIRES IMMEDIATE ATTENTION
- **Note:** This is a CRITICAL dependency - core database ORM

### 5. xlsx-to-json-lc - Multiple Vulnerabilities via xlsx
- **Severity:** High (via Critical xlsx dependency)
- **Package:** xlsx-to-json-lc (depends on vulnerable xlsx)
- **Impact:** Prototype pollution, ReDoS, DoS attacks
- **Fix:** ❌ NO FIX AVAILABLE
- **Status:** ⚠️ REQUIRES ALTERNATIVE SOLUTION
- **Recommendation:** Replace with alternative library or implement custom Excel parsing

## High Severity Vulnerabilities (Priority 2)

### 6. express - Multiple Vulnerabilities
- **Severity:** High
- **Package:** express <=4.21.2
- **Dependencies:** Vulnerable versions of body-parser, cookie, path-to-regexp, qs, send, serve-static
- **CVEs:**
  - body-parser DoS (GHSA-qwcr-r2fm-qrc7)
  - path-to-regexp ReDoS (GHSA-9wv6-86v2-598j, GHSA-rhx6-c78j-4q9w)
  - qs Prototype Pollution (GHSA-hrpp-h998-j3pp, GHSA-6rw7-vpxm-498p)
  - send XSS (GHSA-m6fv-jmcg-4jfg)
- **Fix:** `npm audit fix` (updates to express@4.21.3+)
- **Status:** ⚠️ HIGH PRIORITY

### 7. jsonwebtoken - Multiple Vulnerabilities
- **Severity:** High
- **Package:** jsonwebtoken <=8.5.1
- **CVEs:**
  - GHSA-8cf7-32gw-wr33 (Unrestricted key type)
  - GHSA-hjrf-2m68-5959 (Forgeable tokens RSA to HMAC)
  - GHSA-qwph-4952-7xr6 (Signature validation bypass)
- **Impact:** Authentication bypass, token forgery
- **Fix:** `npm audit fix` (updates to jsonwebtoken@9.0.0+)
- **Status:** ⚠️ HIGH PRIORITY - AUTHENTICATION CRITICAL

### 8. sharp - libwebp CVE-2023-4863
- **Severity:** High
- **Package:** sharp <0.32.6
- **CVE:** GHSA-54xq-cgqr-rpm3
- **Impact:** Vulnerability in libwebp dependency
- **Fix:** `npm audit fix --force` (breaking change to sharp@0.34.5)
- **Status:** ⚠️ REQUIRES TESTING AFTER UPDATE

### 9. ip - SSRF and Private IP Misidentification
- **Severity:** High
- **Package:** ip (all versions)
- **CVEs:**
  - GHSA-78xj-cgh5-2h22 (Incorrectly identifies private IPs as public)
  - GHSA-2p57-rm9w-gvfp (SSRF improper categorization)
- **Fix:** ❌ NO FIX AVAILABLE
- **Status:** ⚠️ REQUIRES ALTERNATIVE SOLUTION
- **Recommendation:** Replace with alternative IP validation library or implement custom validation

### 10. braces - Uncontrolled Resource Consumption
- **Severity:** High
- **Package:** braces <3.0.3
- **CVE:** GHSA-grv7-fg5c-xmjg
- **Impact:** ReDoS, resource exhaustion
- **Fix:** `npm audit fix --force` (breaking change, updates jest to v30)
- **Status:** ⚠️ REQUIRES TESTING AFTER UPDATE

### 11. semver - Regular Expression DoS
- **Severity:** High
- **Package:** semver (multiple vulnerable ranges)
- **CVE:** GHSA-c2qf-rxjj-qqgw
- **Impact:** ReDoS attacks
- **Fix:** `npm audit fix`
- **Status:** ⚠️ HIGH PRIORITY

### 12. nodemailer - Multiple Vulnerabilities
- **Severity:** High
- **Package:** nodemailer <=7.0.10
- **CVEs:**
  - GHSA-9h6g-pr28-7cqp (ReDoS)
  - GHSA-mm7p-fcc7-pg87 (Email to unintended domain)
  - GHSA-rcmh-qjqh-p98v (DoS via recursive calls)
- **Impact:** DoS, email routing issues
- **Fix:** `npm audit fix`
- **Status:** ⚠️ HIGH PRIORITY

### 13. tar - Multiple Path Traversal Vulnerabilities
- **Severity:** High
- **Package:** tar <=7.5.7
- **CVEs:** Multiple path traversal, arbitrary file write, symlink poisoning
- **Fix:** `npm audit fix`
- **Status:** ⚠️ HIGH PRIORITY

### 14. validator - URL Validation Bypass
- **Severity:** High
- **Package:** validator <=13.15.20
- **CVEs:**
  - GHSA-9965-vmph-33xx (URL validation bypass)
  - GHSA-vghf-hv5q-vc2g (Incomplete filtering)
- **Impact:** XSS, validation bypass
- **Fix:** `npm audit fix`
- **Status:** ⚠️ HIGH PRIORITY

## Moderate Severity Vulnerabilities (Priority 3)

### 15. moment-timezone - Command Injection & Cleartext Transmission
- **Severity:** Moderate
- **Package:** moment-timezone 0.1.0-0.5.34
- **CVEs:**
  - GHSA-56x4-j7p9-fcf9 (Command injection)
  - GHSA-v78c-4p63-2j6c (Cleartext transmission)
- **Fix:** `npm audit fix`
- **Status:** ⚠️ MEDIUM PRIORITY

### 16. passport - Session Regeneration Issue
- **Severity:** Moderate
- **Package:** passport <0.6.0
- **CVE:** GHSA-v923-w3x8-wh69
- **Impact:** Session fixation vulnerability
- **Fix:** `npm audit fix`
- **Status:** ⚠️ MEDIUM PRIORITY

### 17. nunjucks - XSS via Autoescape Bypass
- **Severity:** Moderate
- **Package:** nunjucks <3.2.4
- **CVE:** GHSA-x77j-w7wf-fjmw
- **Impact:** Cross-site scripting
- **Fix:** `npm audit fix`
- **Status:** ⚠️ MEDIUM PRIORITY

### 18. Additional Moderate Vulnerabilities
- ajv - ReDoS (GHSA-2g4f-4pwh-qvx6)
- aws-sdk - Region validation issue (GHSA-j965-2qgj-vjmq)
- cookiejar - ReDoS (GHSA-h452-7996-h45h)
- js-yaml - Prototype pollution (GHSA-mh29-5h37-fv8m)
- lodash - Prototype pollution (GHSA-xxjr-mmjv-4gpg)
- tough-cookie - Prototype pollution (GHSA-72xf-g2v4-qvf3)
- word-wrap - ReDoS (GHSA-j8xg-fqg3-53r7)
- xml2js - Prototype pollution (GHSA-776f-qx25-q3cc)

## Low Severity Vulnerabilities (Priority 4)

- on-headers - HTTP response header manipulation (GHSA-76c9-3jph-rj3q)
- send - Template injection XSS (GHSA-m6fv-jmcg-4jfg)
- serve-static - Template injection XSS (GHSA-cm22-4g7w-348p)
- brace-expansion - ReDoS (GHSA-v6h2-p8h4-qcjw)
- cookie - Out of bounds characters (GHSA-pxg6-pf52-xh8x)
- decode-uri-component - DoS (GHSA-w573-4hg7-7wgq)
- dicer - HeaderParser crash (GHSA-wm7h-9275-46v2)
- cross-spawn - ReDoS (GHSA-3xgq-45jj-v275)
- min-document - Prototype pollution (GHSA-rx8g-88g5-qh64)

## Hardcoded Credentials in package.json

### ⚠️ CRITICAL SECURITY ISSUE: Embedded Access Token

**Finding:** The package.json contains hardcoded authentication tokens in git URLs:

```json
"error-handler": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/error-handler#1.2.1",
"filer": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/filer#1.4.2",
"js-utils": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/js-utils",
"mailer": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/mailer.git",
"maroon-auth": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/mongodb/maroon-auth#3.2.18",
"mongodb-plugin": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com//maroon-studios/node-modules/mongodb/mongodb-plugin#1.3.0"
```

**Token:** `maroon-token--ctMdxFEgcTZpC8pzffm`

**Impact:** 
- This token is exposed in version control
- Anyone with access to the repository can use this token to access Maroon Studios private packages
- If the repository is pushed to GitHub, this token will be publicly visible
- The token should be considered compromised

**Remediation:**
1. **IMMEDIATE:** Revoke the exposed token `maroon-token--ctMdxFEgcTZpC8pzffm`
2. Generate a new access token for the Maroon Studios repository
3. Configure npm/git to use credentials from environment variables or .npmrc (not committed)
4. Update package.json to use SSH URLs or configure authentication separately
5. Scan git history to ensure this token hasn't been committed previously
6. If found in git history, use BFG Repo-Cleaner or git filter-branch to remove it

**Alternative Solutions:**
- Use SSH keys for git authentication instead of tokens in URLs
- Use .npmrc with authentication tokens stored as environment variables
- Use npm private registry with proper authentication
- Consider hosting these packages in a private npm registry

## Recommended Actions

### Immediate Actions (Critical Priority)

1. **Revoke exposed token** in package.json git URLs
2. **Update crypto-js** to 4.2.0+ (critical password hashing weakness)
3. **Update mongoose** to 6.13.6+ (prototype pollution, search injection)
4. **Update @babel/traverse** to 7.23.2+ (arbitrary code execution)
5. **Update form-data** to safe version (unsafe random function)
6. **Update jsonwebtoken** to 9.0.0+ (authentication bypass)

### High Priority Actions

7. **Update express** and all related middleware (body-parser, qs, path-to-regexp, send)
8. **Update sharp** to 0.34.5 (test for breaking changes)
9. **Replace ip package** with alternative (no fix available)
10. **Replace xlsx-to-json-lc** with alternative (no fix available)
11. **Update nodemailer** to latest version
12. **Update validator** to latest version
13. **Update tar** to latest version

### Medium Priority Actions

14. Run `npm audit fix` to automatically fix remaining vulnerabilities
15. Run `npm audit fix --force` for breaking changes (test thoroughly)
16. Update moment-timezone, passport, nunjucks, and other moderate severity packages

### Long-term Actions

17. Implement automated dependency scanning in CI/CD pipeline
18. Set up Dependabot or Renovate for automatic dependency updates
19. Establish policy for reviewing and updating dependencies monthly
20. Consider replacing deprecated or unmaintained packages
21. Implement security scanning in pre-commit hooks

## Commands to Execute

```bash
# Step 1: Backup current package-lock.json
cp package-lock.json package-lock.json.backup

# Step 2: Fix non-breaking vulnerabilities
npm audit fix

# Step 3: Review what would be changed with force
npm audit fix --force --dry-run

# Step 4: Apply breaking changes (requires testing)
npm audit fix --force

# Step 5: Verify application still works
npm test

# Step 6: Check remaining vulnerabilities
npm audit
```

## Dependencies Requiring Manual Intervention

### No Fix Available
1. **ip** - Replace with alternative IP validation library
2. **xlsx-to-json-lc** - Replace with alternative Excel parsing library

### Breaking Changes Required
1. **sharp** - Update from 0.30.7 to 0.34.5 (major version change)
2. **jest** - Update from 26.6.3 to 30.2.0 (major version change)

## Testing Requirements After Updates

After applying security updates, the following must be tested:

1. **Authentication flows** (jsonwebtoken, passport, maroon-auth updates)
2. **Database operations** (mongoose updates)
3. **File uploads** (sharp, multer, form-data updates)
4. **API endpoints** (express, body-parser updates)
5. **Email functionality** (nodemailer updates)
6. **Excel file processing** (if xlsx-to-json-lc is replaced)
7. **IP validation** (if ip package is replaced)
8. **All unit and integration tests**

## Conclusion

The backend has significant security vulnerabilities that require immediate attention. The most critical issues are:

1. **Exposed authentication token in package.json** - Must be revoked immediately
2. **Weak cryptography** (crypto-js) - Affects password security
3. **Prototype pollution** (mongoose, multiple packages) - Can lead to code execution
4. **Authentication vulnerabilities** (jsonwebtoken) - Can lead to auth bypass

**Estimated Effort:**
- Immediate fixes: 2-4 hours
- Testing after updates: 4-8 hours
- Replacing packages with no fix: 8-16 hours
- Total: 14-28 hours

**Risk if not addressed:**
- High risk of authentication bypass
- High risk of data breach via prototype pollution
- High risk of DoS attacks
- Exposed credentials can be used to access private repositories
