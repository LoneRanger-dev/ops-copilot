---
title: Handling a suspected phishing email report
category: Security
tags: phishing, security, email, incident
visibility: restricted
---

# Phishing Report Handling

## When a user reports a suspicious email

1. Do not click any links or open attachments from the reported message.
2. Confirm the sender domain against the known-safe sender list; a close
   lookalike domain (e.g. `micros0ft.com`) is the most common indicator.
3. Search the mail system for other recipients of the same message and
   quarantine all copies before notifying anyone who already opened it.
4. If a user reports having entered credentials on a linked page, force a
   password reset and revoke all active sessions for that account
   immediately — do not wait for a full investigation to complete this
   step.
5. Log the incident in the security tracker with the sender, subject, and
   affected recipient count for the monthly security report.
