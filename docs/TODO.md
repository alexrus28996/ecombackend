# Project Roadmap & TODOs

This list now tracks future enhancements beyond the production-ready baseline.

## Future Enhancements
- **Multi-carrier shipping providers**: integrate rate shopping and label purchase flows for UPS/FedEx alongside the existing manual shipment model.
- **Webhook retry scheduler**: persist outbound Stripe/Cloudinary webhook failures and replay with exponential backoff.
- **Advanced RBAC**: group permissions into assignable roles, add audit trails for grants, and surface per-endpoint scopes in documentation.
- **Audit log retention policies**: add configurable retention windows plus export-to-S3 jobs for long-term compliance storage.
- **Inventory reconciliation tooling**: schedule variance reports comparing StockLedger totals against physical counts and highlight drift beyond configurable thresholds.

## Completed
- Admin audit logs, inventory locations/transfers/ledger endpoints, payment event audit APIs, and manual order timeline writes.
- Product & category soft delete/restore support with extended catalog fields (vendor, taxClass, weight/dimensions, SEO metadata).
