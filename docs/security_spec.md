# Security Specification - OPERASIONAL UMAROH

## Data Invariants
1. A `UserProfile` can only be created by the user themselves or an admin. Role escalation (to admin) via client is forbidden.
2. `Wallet` access is restricted to the owner for reading, and only `finance` role (or admin) can modify balance.
3. `PaketMaster` can only be created/modified by `operasional` or `admin`.
4. `PaketMitra` can only be created by `mitra` and must reference a valid `PaketMaster`.
5. `Booking` must reference a valid `paket` and correctly identify the `jamaah`.
6. `PendaftaranMitra` can be submitted anonymously (lead capture), but only `operasional` can validate and approve.

## The Dirty Dozen Payloads

| ID | Collection | Operation | Payload | Expected | Reason |
|----|------------|-----------|---------|----------|--------|
| D1 | users | update | `{ role: 'admin' }` | DENIED | Identity Spoofing (Role Escalation) |
| D2 | wallets | update | `{ balance: 9999999 }` | DENIED | Tiered Identity (Finance only) |
| D3 | paket_master | create | `{ id: 'junk', price: -100 }` | DENIED | Schema/Value Poisoning |
| D4 | pendaftaran_mitra | update | `{ status: 'approved' }` | DENIED | State Shortcutting (Mitra cannot approve self) |
| D5 | tracking_group | delete | `{ }` | DENIED | Terminal State / Resource Protection |
| D6 | bookings | create | `{ id: 'atk', totalHarga: 0 }` | DENIED | Resource Poisoning / Value Integrity |
| D7 | transactions | create | `{ type: 'withdraw', status: 'approved' }` | DENIED | State Injection (User can only set 'pending') |
| D8 | master_hotels | update | `{ priceQuad: 1 }` | DENIED | Resource Poisoning (Marketplace Integrity) |
| D9 | users | update | `{ email: 'other@gmail.com' }` | DENIED | Identity Integrity (Email is immutable) |
| D10| tracker_paket | create | `{ id: 'x'.repeat(2000) }` | DENIED | Denial of Wallet (ID too long) |
| D11| paket_mitra | create | `{ komisiSponsor: 100000000 }` | DENIED | Value Boundary Violation |
| D12| vendor_services| update | `{ statusPembayaran: 'Lunas' }` | DENIED | Role/Permission Violation (Non-Ops) |

## Test Runner
The tests will be implemented in `firestore.rules.test.ts` using the Firebase Rules Unit Testing library (if available) or conceptually verified.
