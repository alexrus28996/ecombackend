/**
 * Generic pagination helper for Mongoose models.
 * @param {import('mongoose').Model} Model
 * @param {{ filter?: any, sort?: any, select?: any, limit?: number, page?: number, lean?: boolean }} opts
 */
export async function paginate(Model, { filter = {}, sort = { createdAt: -1 }, select = undefined, limit = 20, page = 1, lean = true } = {}) {
  const l = Math.max(1, Number(limit) || 20);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const query = Model.find(filter).sort(sort).skip(skip).limit(l);
  if (select) query.select(select);
  if (lean) query.lean();
  const [items, total] = await Promise.all([query.exec(), Model.countDocuments(filter)]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}

