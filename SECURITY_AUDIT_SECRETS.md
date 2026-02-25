# Backend Hardcoded Credentials and Secrets Audit Report

**Date:** 2026-02-25  
**Scope:** pms-server source code and configuration files  
**Methodology:** Pattern-based scanning for credentials, API keys, tokens, and secrets  

## Executive Summary

The security scan identified **3 categories of security concerns**:

1. **CRITICAL:** Hardcoded authentication token in package.json (git URLs)
2. **MEDIUM:** Hardcoded default email addresses in configuration
3. **LOW:** Test/sample email addresses in meta configuration

**Overall Assessment:** The codebase follows good practices by using environment variables for sensitive configuration. However, the exposed token in package.json is a critical security issue that must be addressed immediately.

## Critical Findings

### 1. Exposed Authentication Token in package.json

**Severity:** CRITICAL  
**Location:** `pms-server/package.json`  
**Finding:** Hardcoded authentication token embedded in git URLs

**Affected Dependencies:**
```json
{
  "error-handler": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/error-handler#1.2.1",
  "filer": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/filer#1.4.2",
  "js-utils": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/js-utils",
  "mailer": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/mailer.git",
  "maroon-auth": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com/maroon-studios/node-modules/mongodb/maroon-auth#3.2.18",
  "mongodb-plugin": "git+https://generic:maroon-token--ctMdxFEgcTZpC8pzffm@repo.maroonstudios.com//maroon-studios/node-modules/mongodb/mongodb-plugin#1.3.0"
}
```

**Exposed Token:** `maroon-token--ctMdxFEgcTZpC8pzffm`

**Impact:**
- ⚠️ Token is visible to anyone with access to the repository
- ⚠️ Token grants access to Maroon Studios private npm packages
- ⚠️ If repository is pushed to GitHub, token becomes publicly accessible
- ⚠️ Token should be considered compromised and must be revoked
- ⚠️ Attackers could use this token to access or modify private packages

**Risk Level:** CRITICAL - Immediate action required

**Remediation Steps:**

1. **IMMEDIATE - Revoke the exposed token:**
   - Log into Maroon Studios repository management
   - Revoke token: `maroon-token--ctMdxFEgcTZpC8pzffm`
   - Generate a new token with appropriate permissions

2. **Configure npm authentication properly:**

   **Option A: Use .npmrc with environment variable (RECOMMENDED)**
   
   Create `.npmrc` in project root (DO NOT COMMIT):
   ```
   @maroon-studios:registry=https://repo.maroonstudios.com/
   //repo.maroonstudios.com/:_authToken=${MAROON_NPM_TOKEN}
   ```
   
   Update package.json to use scoped packages:
   ```json
   {
     "error-handler": "@maroon-studios/error-handler@1.2.1",
     "filer": "@maroon-studios/filer@1.4.2",
     "js-utils": "@maroon-studios/js-utils@latest",
     "mailer": "@maroon-studios/mailer@latest",
     "maroon-auth": "@maroon-studios/maroon-auth@3.2.18",
     "mongodb-plugin": "@maroon-studios/mongodb-plugin@1.3.0"
   }
   ```
   
   Set environment variable:
   ```bash
   export MAROON_NPM_TOKEN="new-token-here"
   ```

   **Option B: Use SSH keys (RECOMMENDED for git URLs)**
   
   Update package.json to use SSH URLs:
   ```json
   {
     "error-handler": "git+ssh://git@repo.maroonstudios.com/maroon-studios/node-modules/error-handler#1.2.1",
     "filer": "git+ssh://git@repo.maroonstudios.com/maroon-studios/node-modules/filer#1.4.2"
   }
   ```
   
   Configure SSH key authentication on the server.

   **Option C: Use .netrc file (Alternative)**
   
   Create `~/.netrc` file with restricted permissions:
   ```
   machine repo.maroonstudios.com
   login generic
   password new-token-here
   ```
   
   Set permissions:
   ```bash
   chmod 600 ~/.netrc
   ```

3. **Clean git history:**
   
   Check if token exists in git history:
   ```bash
   git log -p | grep "maroon-token--ctMdxFEgcTZpC8pzffm"
   ```
   
   If found, use BFG Repo-Cleaner to remove:
   ```bash
   # Install BFG
   brew install bfg  # macOS
   
   # Clone a fresh copy
   git clone --mirror git@github.com:your-org/pms-server.git
   
   # Remove the token from all commits
   cd pms-server.git
   bfg --replace-text passwords.txt  # Create passwords.txt with the token
   
   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # Force push (WARNING: This rewrites history)
   git push --force
   ```

4. **Update .gitignore:**
   
   Ensure these files are excluded:
   ```
   .npmrc
   .netrc
   .env
   .env.local
   .env.production
   *.pem
   *.key
   ```

5. **Document the process:**
   - Update README.md with npm authentication setup instructions
   - Document environment variable requirements
   - Add to deployment documentation

## Medium Severity Findings

### 2. Hardcoded Default Email Addresses

**Severity:** MEDIUM  
**Location:** `pms-server/src/config/index.js`  
**Finding:** Default email addresses hardcoded in configuration

**Affected Configuration:**
```javascript
// Line 70
user: process.env.SMTP_AUTH_USER || 'devops@maroonstudios.com',

// Line 81
email: "devops@maroonstudios.com",

// Line 107
smokeTest: {
    email: 'jason.obrero@maroonstudios.com'
}
```

**Impact:**
- ⚠️ Exposes internal email addresses
- ⚠️ Could be used for phishing or social engineering
- ⚠️ Default SMTP user might be used if environment variable is not set
- ⚠️ Smoke test emails might be sent to wrong address in production

**Risk Level:** MEDIUM - Should be addressed before production deployment

**Remediation:**

1. **Remove default email from SMTP configuration:**
   ```javascript
   // Before
   user: process.env.SMTP_AUTH_USER || 'devops@maroonstudios.com',
   
   // After
   user: process.env.SMTP_AUTH_USER,
   ```
   
   Add validation to ensure SMTP_AUTH_USER is set:
   ```javascript
   if (!process.env.SMTP_AUTH_USER) {
       throw new Error('SMTP_AUTH_USER environment variable is required');
   }
   ```

2. **Move organization email to environment variable:**
   ```javascript
   // Before
   email: "devops@maroonstudios.com",
   
   // After
   email: process.env.ORGANIZATION_EMAIL || "noreply@example.com",
   ```

3. **Move smoke test email to environment variable:**
   ```javascript
   // Before
   smokeTest: {
       email: 'jason.obrero@maroonstudios.com'
   }
   
   // After
   smokeTest: {
       email: process.env.SMOKE_TEST_EMAIL
   }
   ```

4. **Update backend.env.example:**
   ```bash
   # Organization email for system notifications
   ORGANIZATION_EMAIL=noreply@yourdomain.com
   
   # Smoke test recipient email
   SMOKE_TEST_EMAIL=test@yourdomain.com
   ```

## Low Severity Findings

### 3. Test/Sample Email Addresses in Meta Configuration

**Severity:** LOW  
**Location:** `pms-server/src/config/meta.js`  
**Finding:** Sample email addresses in default user configurations

**Affected Configuration:**
```javascript
email: 'guest@sample.com'
email: 'accountingOfficer@mail.com'
email: 'budgetOfficer@mail.com'
email: 'cashier@mail.com'
email: 'director@mail.com'
email: 'hrOfficer@mail.com'
email: 'inventoryOfficer@mail.com'
email: 'procurementOfficer@mail.com'
email: 'projectLeader@mail.com'
email: 'user@mail.com'
email: 'super@mail.com'
email: 'fadChief@mail.com'
```

**Impact:**
- ℹ️ These appear to be test/sample data for default user roles
- ℹ️ Low risk as they use generic domains (@sample.com, @mail.com)
- ℹ️ Should not be used in production

**Risk Level:** LOW - Informational

**Recommendation:**
- Document that these are sample values for development/testing only
- Ensure production deployment doesn't use these default users
- Consider using a more obvious test domain like @example.com
- Add comments indicating these are test data

## Positive Findings (Good Security Practices)

### ✅ Environment Variable Usage

The codebase correctly uses environment variables for sensitive configuration:

1. **Database Credentials:**
   ```javascript
   dbURL: process.env.MONGO_URI,
   authURL: process.env.AUTH_DB_URI,
   ```

2. **Application Secrets:**
   ```javascript
   secret: process.env.APP_SECRET,
   cookieMaxAge: process.env.COOKIE_MAX_AGE,
   ```

3. **SMTP Credentials:**
   ```javascript
   clientId: process.env.SMTP_AUTH_CLIENTID,
   clientSecret: process.env.SMTP_AUTH_CLIENTSECRET,
   refreshToken: process.env.SMTP_AUTH_REFRESHTOKEN,
   ```

4. **Cloud Storage:**
   ```javascript
   gcsKeyFilepath: process.env.GCS_KEY_FILEPATH,
   gcsBucket: process.env.GCS_BUCKET
   ```

### ✅ No Hardcoded Passwords

Scan found no hardcoded passwords in the source code.

### ✅ No Hardcoded Database Connection Strings

No MongoDB connection strings with embedded credentials found in source code.

### ✅ No Hardcoded AWS Credentials

No AWS access keys or secret keys found in source code.

### ✅ No Hardcoded Google Cloud Credentials

No GCS service account keys or credentials found in source code.

### ✅ Environment Template Provided

The `backend.env.example` file provides a good template for required environment variables without exposing actual secrets.

## Scan Coverage

### Patterns Searched

1. **API Keys and Tokens:**
   - `api_key`, `apikey`, `api_secret`, `token`, `bearer`, `authorization`

2. **Passwords:**
   - `password = "..."`, `pwd = "..."`

3. **Database Connection Strings:**
   - `mongodb://`, `mongodb+srv://`

4. **AWS Credentials:**
   - `AKIA[0-9A-Z]{16}`, `aws_access`, `aws_secret`

5. **Google Cloud Credentials:**
   - `private_key`, `client_email`, `project_id`, `service_account`

6. **Generic Secrets:**
   - `secret = "..."`, `key = "..."`

7. **Email Addresses:**
   - Standard email regex pattern

### Files Scanned

- All JavaScript files in `pms-server/src/**/*.js`
- Configuration files: `pms-server/src/config/index.js`, `pms-server/src/config/meta.js`
- Application entry point: `pms-server/app.js`
- Package configuration: `pms-server/package.json`
- Environment template: `backend.env.example`

## Recommendations

### Immediate Actions (Critical Priority)

1. ✅ **Revoke exposed token** `maroon-token--ctMdxFEgcTZpC8pzffm`
2. ✅ **Generate new token** for Maroon Studios repository access
3. ✅ **Update package.json** to use secure authentication method
4. ✅ **Clean git history** if token exists in previous commits
5. ✅ **Update .gitignore** to prevent future credential commits

### High Priority Actions

6. ✅ **Remove default email addresses** from configuration
7. ✅ **Add environment variable validation** for required secrets
8. ✅ **Update backend.env.example** with new required variables
9. ✅ **Document authentication setup** in README.md

### Medium Priority Actions

10. ✅ **Implement pre-commit hooks** to scan for secrets (e.g., git-secrets, detect-secrets)
11. ✅ **Set up secret scanning** in GitHub repository settings
12. ✅ **Configure Dependabot** for security updates
13. ✅ **Add security scanning** to CI/CD pipeline

### Long-term Actions

14. ✅ **Migrate to AWS Secrets Manager** for production secrets
15. ✅ **Implement secret rotation** policy
16. ✅ **Conduct regular security audits** (quarterly)
17. ✅ **Train team** on secure coding practices
18. ✅ **Document incident response** procedures

## Tools for Ongoing Security

### Recommended Tools

1. **git-secrets** - Prevents committing secrets to git
   ```bash
   brew install git-secrets
   git secrets --install
   git secrets --register-aws
   ```

2. **detect-secrets** - Scans for secrets in codebase
   ```bash
   pip install detect-secrets
   detect-secrets scan > .secrets.baseline
   ```

3. **truffleHog** - Searches git history for secrets
   ```bash
   pip install truffleHog
   truffleHog --regex --entropy=False .
   ```

4. **GitHub Secret Scanning** - Automatic scanning in GitHub
   - Enable in repository settings
   - Automatically detects common secret patterns

5. **Snyk** - Dependency and secret scanning
   ```bash
   npm install -g snyk
   snyk auth
   snyk test
   ```

## Compliance Checklist

- [x] No hardcoded passwords in source code
- [x] No hardcoded database credentials in source code
- [x] No hardcoded API keys in source code (except package.json issue)
- [x] Environment variables used for sensitive configuration
- [x] Environment template provided without secrets
- [ ] **CRITICAL:** Token in package.json must be removed
- [ ] Default email addresses should be removed
- [ ] Git history should be cleaned of secrets
- [ ] Pre-commit hooks should be configured
- [ ] Secret scanning should be enabled

## Conclusion

The PMIS backend codebase demonstrates good security practices by using environment variables for most sensitive configuration. However, the **critical issue of the exposed authentication token in package.json must be addressed immediately** before the repository is pushed to GitHub or any external version control system.

**Priority Actions:**
1. Revoke and replace the exposed token (CRITICAL)
2. Update package.json authentication method (CRITICAL)
3. Clean git history (HIGH)
4. Remove default email addresses (MEDIUM)
5. Implement ongoing secret scanning (MEDIUM)

**Estimated Effort:**
- Token remediation: 2-4 hours
- Git history cleaning: 1-2 hours
- Configuration updates: 1-2 hours
- Documentation: 1-2 hours
- Total: 5-10 hours

**Risk if not addressed:**
- Exposed token could be used to access or modify private packages
- Potential supply chain attack vector
- Compliance violations
- Reputational damage
