---
title: Resetting an expired VPN client certificate
category: Network
tags: vpn, certificate, network, security
visibility: internal
---

# VPN Certificate Renewal

## Symptom

The VPN client refuses to connect and shows "certificate expired" or
"certificate not trusted" immediately after entering credentials.

## Resolution

1. Confirm the certificate's expiry date in the client's connection
   properties — client certificates are valid for 12 months and do not
   renew automatically.
2. Have the user request a new certificate from the self-service portal;
   approval is automatic for active employees.
3. Import the new certificate and restart the VPN client — a partial restart
   sometimes leaves the old certificate cached.
4. If the new certificate is still rejected, the device's system clock may
   be wrong; certificate validation fails when the clock is outside the
   certificate's validity window.
