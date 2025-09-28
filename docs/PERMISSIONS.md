# Permission Scopes

These granular scopes complement the `admin` role. Any user with role `admin` automatically bypasses per-endpoint permission checks, but assigning explicit scopes lets you delegate subsets of functionality (e.g., to support or warehouse teams).

| Scope | Purpose |
| --- | --- |
| `product:create` | Create new products with the full catalog payload. |
| `product:edit` | Update products, variants, attributes, and restore soft-deleted products. |
| `product:delete` | Soft delete products. |
| `category:create` | Create catalog categories. |
| `category:edit` | Update or reorder categories; restore soft deletes. |
| `category:delete` | Soft delete categories. |
| `category:restore` | Restore soft-deleted categories. |
| `inventory:manage` | Perform stock adjustments/reconciliation. |
| `order:view` | View customer orders in support tools. |
| `order:create` | Create orders on behalf of customers. |
| `order:manage` | Modify order status/fulfillment. |
| `audit:view` | Access admin audit log endpoints. |
| `inventory:location:view` | View inventory locations (including soft-deleted). |
| `inventory:location:create` | Create new stock locations. |
| `inventory:location:edit` | Update or restore locations. |
| `inventory:location:delete` | Soft delete locations. |
| `inventory:transfer:view` | List and inspect inventory transfer orders. |
| `inventory:transfer:create` | Create transfer orders. |
| `inventory:transfer:edit` | Update transfer details or transition statuses. |
| `inventory:transfer:delete` | Cancel transfer orders. |
| `inventory:ledger:view` | Query the stock ledger audit trail. |
| `payments:events:view` | List and inspect payment provider event logs. |
| `orders:timeline:write` | Append manual timeline entries to orders. |

Grant scopes via `/api/admin/users/:id/permissions` endpoints. Combine with roles to tailor least-privilege access for operations teams.
