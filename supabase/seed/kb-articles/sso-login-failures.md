---
title: Troubleshooting failed Single Sign-On (SSO) logins
category: Identity
tags: sso, saml, oidc, login, identity
visibility: internal
---

# SSO Login Failures

## Symptom

A user attempting to sign in via the corporate SSO provider is redirected
back to the login page with a generic error, or the identity provider shows
an error before ever reaching the application.

## Diagnosis

1. Determine which side raised the error — check whether the browser ever
   reached the identity provider's login page. If not, the issue is local
   application routing (a misconfigured redirect URI), not the identity
   provider itself.
2. If the identity provider shows the error, check its own audit log for
   the exact SAML/OIDC error code — "assertion expired" almost always means
   clock skew between the identity provider and this application's server,
   not a credentials problem.
3. Confirm the user's account is not disabled or unlicensed for this
   application in the identity provider's admin console — this produces a
   near-identical symptom to a genuine configuration bug.
4. For a newly onboarded user, allow up to 15 minutes for directory
   synchronisation to propagate before escalating.
