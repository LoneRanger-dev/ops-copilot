---
title: VPN connection repeatedly drops on Windows clients
category: Network
tags: vpn, network, windows, connectivity
visibility: public
---

# VPN Troubleshooting

## Symptom

The corporate VPN client disconnects every 10-15 minutes, especially on Wi-Fi.

## Root Cause

The default idle-timeout policy (900s) combined with power-saving on the
wireless adapter suspends the network interface, which the VPN client
interprets as a dropped link.

## Resolution

1. Disable "Allow the computer to turn off this device to save power" on the
   Wi-Fi adapter (Device Manager > Network adapters > Properties > Power
   Management).
2. Set the VPN client keep-alive interval to 60s in Settings > Advanced.
3. If split tunnelling is enabled, confirm the internal DNS suffix is in the
   tunnelled route list.
4. Escalate to network engineering only if the drop persists on a wired
   connection.
