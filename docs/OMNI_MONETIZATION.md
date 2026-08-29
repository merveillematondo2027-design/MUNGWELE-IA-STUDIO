# MUNGWELE IA STUDIO — Omni / Veo monetization guardrails

This document records provider cost assumptions and pricing rules used by the application. Provider prices must be revalidated before production launch and whenever Google/OpenAI pricing changes.

## Google video models

- `gemini-omni-1.1-flash` is the preferred GA Omni video model.
- `gemini-omni-flash-preview` must not be the production default because Google announced deprecation for 2026-09-30.
- Veo 3.1 family remains available as a selectable provider.

## Cost protection policy

MUNGWELE must never debit a fixed credit amount that can fall below estimated provider cost.

For each generation, the server calculates an estimated provider cost from model, duration and resolution, then applies:

1. provider cost,
2. payment/operations reserve,
3. target gross margin,
4. minimum credit floor.

If provider pricing is unknown or stale, the generation is blocked for paid users rather than silently sold at a loss.

## Refund policy

Credits are reserved before provider submission and finalized only after a successful provider response. Failed provider jobs are refunded automatically. Provider invoices remain the source of truth for actual external cost.

## Reference-image policy

The UI may accept multiple reference images, but the server must enforce the exact limit supported by the selected model/task. For Omni, image-to-video and reference-to-video requests must use the Interactions API input format rather than sending unsupported `inlineData` payloads to a Veo model.
