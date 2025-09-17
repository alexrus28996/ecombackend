/**
 * Generic pagination helper for Mongoose models.
 * @param {import('mongoose').Model} Model
 * @param {{ filter?: any, sort?: any, select?: any, limit?: number, page?: number, lean?: boolean, populate?: any }} opts
 */
export async function paginate(Model, { filter = {}, sort = { createdAt: -1 }, select = undefined, limit = 20, page = 1, lean = true, populate = undefined } = {}) {
  const l = Math.max(1, Number(limit) || 20);
  const p = Math.max(1, Number(page) || 1);
  const skip = (p - 1) * l;
  const query = Model.find(filter).sort(sort).skip(skip).limit(l);
  if (select) query.select(select);
  if (populate) {
    if (Array.isArray(populate)) populate.forEach((p) => query.populate(p));
    else query.populate(populate);
  }
  if (lean) query.lean();
  const [items, total] = await Promise.all([query.exec(), Model.countDocuments(filter)]);
  return { items, total, page: p, pages: Math.ceil(total / l || 1) };
}
