---
title: Self-service password reset is not sending the email
category: Identity
tags: password, sso, email, account
visibility: public
---

# Password Reset Troubleshooting

## Symptom

User requests a password reset from the login page and no email arrives
within 5 minutes.

## Checklist

1. Confirm the account is Active in the directory — disabled accounts
   silently drop the email.
2. Check the spam/quarantine folder; the reset sender domain is frequently
   new-listed by corporate filters.
3. Verify the account is not federated to SSO only — federated accounts must
   reset at the identity provider, not the local portal.
4. If none of the above resolve it, manually trigger a reset from the admin
   console and confirm the mail queue depth is not backed up.
