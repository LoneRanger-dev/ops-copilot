---
title: What does error code E-4471 mean?
category: Application Errors
tags: error code, e-4471, application
visibility: public
---

# Error Code E-4471

E-4471 is raised by the internal API gateway when a request carries an
authentication token that has already expired at the time it reaches the
gateway (as opposed to expiring in transit). It is most commonly seen after
a client has been idle for longer than the access-token lifetime (1 hour)
without triggering a silent refresh.

## Fix

Have the user sign out and back in. If the error recurs within minutes of
signing in, the client clock is likely skewed by more than 5 minutes from
the server — check NTP sync on the client device.
