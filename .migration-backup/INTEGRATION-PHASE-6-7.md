# Phase 6 + 7 Integration Guide

**Status**: APIs ready. Hooks available in `lib/hooks.ts`. Awaiting integration into BO panels.

---

## Phase 6 — Parrainage Conversion Hook

**Location**: Called when order statut → "livre"

### What happens:
- Client passes their first delivered order
- `/api/portal/referrals/convert` is triggered with `commandeId`
- Parrain's wallet gets credited (typically 50 MAD)
- Client's wallet gets credited (typically 30 MAD)
- Referral flips from `pending` → `converti`

### Where to integrate:

1. **BOCommandesUnifiees.tsx** — When setting `cmd.statut = "livre"` after order delivery:
   ```typescript
   import { onOrderStatusChange } from "@/lib/hooks"

   // In the status update handler:
   cmd.statut = "livre"
   onOrderStatusChange(cmd.id, "livre")  // Triggers both P6 + P7
   ```

2. **Mobile (MobileLogistique.tsx)** — When livreur confirms delivery:
   ```typescript
   import { triggerParrainageConvert } from "@/lib/hooks"

   // After confirming delivery:
   triggerParrainageConvert(orderId)
   ```

### API Endpoint
- `POST /api/portal/referrals/convert`
- Body: `{ commandeId: string }`
- Returns: `{ ok, referralId, parrain: {...}, filleul: {...} }`
- **Idempotent** — safe to call multiple times

---

## Phase 7 — Realtime Tracking Hook

**Location**: Called whenever order statut changes (all transitions)

### What happens:
- Order statut is mapped to pipeline step (recue → preparation → chargement → route → livree)
- Update is POSTed to `/api/portal/tracking`
- Client portal `<TrackingTab>` receives Realtime notification
- Client sees live progress updates

### Where to integrate:

1. **BOCommandesUnifiees.tsx** — When updating order:
   ```typescript
   import { triggerTrackingUpdate } from "@/lib/hooks"

   // Any time statut changes:
   triggerTrackingUpdate(cmd.id, newStatut, {
     chauffeur: cmd.livreur?.nom,  // optional
     eta: cmd.eta,                  // optional
     gpsLat: cmd.gps?.lat,          // optional
     gpsLng: cmd.gps?.lng,          // optional
     position: "Casablanca Centre"  // optional
   })
   ```

2. **MobileLogistique.tsx** — When livreur updates location:
   ```typescript
   import { triggerTrackingUpdate } from "@/lib/hooks"

   // On each GPS ping or status update:
   triggerTrackingUpdate(orderId, order.statut, {
     gpsLat: currentGPS.lat,
     gpsLng: currentGPS.lng,
     position: reverseGeocode(currentGPS)  // optional
   })
   ```

### Unified helper:
```typescript
import { onOrderStatusChange } from "@/lib/hooks"

// Call this once — handles both P6 + P7:
onOrderStatusChange(commandeId, newStatut, optionalTrackingData)
```

### API Endpoint
- `POST /api/portal/tracking`
- Body: `{ commandeId, etape, chauffeur?, eta?, gpsLat?, gpsLng?, position? }`
- Returns: `{ ok, id, etape, pipeline }`
- **Idempotent** — updates same tracking row per commandeId

---

## Testing

### Manual test (Phase 6):
1. Create client with referral code (`?parrain=VITA-XXXXXX`)
2. Place an order
3. Change status to "livre"
4. Check `fl_referrals` → should flip to `converti`
5. Check `fl_wallet_transactions` → should show +50 MAD for parrain, +30 MAD for client

### Manual test (Phase 7):
1. Place an order
2. Change status (any transition)
3. Open client portal → Tracking tab
4. Watch the pipeline progress bar update in real-time
5. (Requires Supabase Realtime enabled on `fl_tracking` and `fl_commandes`)

---

## Notes

- **Supabase Realtime**: Phase 7 requires RLS to be configured correctly. Test in dashboard.
- **Wallet V1 vs V2**: Both use `fl_wallet_transactions` JSONB table (V2 schema). No breaking changes.
- **No breaking changes**: These hooks are purely additive—existing order workflows unaffected.
