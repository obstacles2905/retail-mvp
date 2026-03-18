
# Skill: B2B Negotiation Workflow & State Machine

**Context:** The core B2B negotiation logic (Offers, Counter-offers, Roles) is the heart of "RetailProcure" and is already partially or fully implemented.
**Purpose:** Prevent new features from violating the established business logic and state machine.

## The Immutable Rules of Negotiation

1. **Role Boundaries (CRITICAL):**
   - `BUYER`: Can see all offers for an SKU. Can initiate a `COUNTER_OFFER`. Can `ACCEPT` or `REJECT`.
   - `VENDOR`: Can ONLY see their own offers. Can create a `NEW` offer. Can reply to a counter-offer.

2. **The Turn System (`current_turn`):**
   - Any new feature that modifies an Offer's price or status MUST check `current_turn`.
   - If `current_turn === BUYER`, the Vendor cannot perform any mutation, and vice versa.
   - A successful negotiation action must always flip the `current_turn` to the other party (unless the status is finalized to `ACCEPTED`/`REJECTED`).

3. **State Machine Integrity:**
   - Valid transitions: `NEW` -> `COUNTER_OFFER`, `COUNTER_OFFER` -> `COUNTER_OFFER`, ANY -> `ACCEPTED`, ANY -> `REJECTED`.
   - DO NOT allow modifying the price of an `ACCEPTED` or `REJECTED` offer.

4. **Audit Trail Requirement:**
   - If a new feature automatically changes a price or status, it MUST create a corresponding `OfferHistory` record in the same database transaction.