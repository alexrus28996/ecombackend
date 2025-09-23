import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { Category } from '../models/Category.js';
import { HttpError, normalizeError } from '../utils/errorHandler.js';

const { CATEGORIES_HARD_DELETE } = config;

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function formatCategoryResponse(category) {
  const doc = category.toObject({ versionKey: false });
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    status: doc.status,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

async function ensureCategoryAvailable(id) {
  const category = await Category.findOne({ _id: id, deletedAt: null });
  if (!category) {
    throw new HttpError(404, 'Category not found');
  }
  return category;
}

export async function createCategory(req, res, next) {
  try {
    const { name, description, status } = req.body;
    if (!name || typeof name !== 'string') {
      throw new HttpError(400, 'Category name is required');
    }

    const normalizedName = name.trim();
    const slug = slugify(normalizedName);
    if (!slug) {
      throw new HttpError(400, 'Category name results in an invalid slug');
    }

    const duplicate = await Category.findOne({
      deletedAt: null,
      $or: [{ slug }, { name: normalizedName }]
    });
    if (duplicate) {
      if (duplicate.slug === slug) {
        throw new HttpError(409, 'Category slug already exists');
      }
      throw new HttpError(409, 'Category name already exists');
    }

    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      throw new HttpError(400, 'Status must be active or inactive');
    }

    const payload = {
      name: normalizedName,
      slug,
      description: description ? String(description).trim() : undefined,
      status: status === 'inactive' ? 'inactive' : 'active',
      isActive: status !== 'inactive',
      deletedAt: null
    };

    const category = await Category.create(payload);
    res.status(201).json({ data: formatCategoryResponse(category) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, 'Invalid category id');
    }

    const category = await ensureCategoryAvailable(id);
    const { name, description, status } = req.body;

    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        throw new HttpError(400, 'Category name must be a non-empty string');
      }
      const normalizedName = name.trim();
      if (normalizedName !== category.name) {
        const nextSlug = slugify(normalizedName);
        if (!nextSlug) {
          throw new HttpError(400, 'Category name results in an invalid slug');
        }
        const duplicate = await Category.findOne({
          _id: { $ne: id },
          deletedAt: null,
          $or: [{ slug: nextSlug }, { name: normalizedName }]
        });
        if (duplicate) {
          if (duplicate.slug === nextSlug) {
            throw new HttpError(409, 'Category slug already exists');
          }
          throw new HttpError(409, 'Category name already exists');
        }
        category.name = normalizedName;
        category.slug = nextSlug;
      }
    }

    if (description !== undefined) {
      category.description = description ? String(description).trim() : undefined;
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        throw new HttpError(400, 'Status must be active or inactive');
      }
      category.status = status;
      category.isActive = status === 'active';
    }

    await category.save();
    res.json({ data: formatCategoryResponse(category) });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, 'Invalid category id');
    }

    if (CATEGORIES_HARD_DELETE) {
      const category = await Category.findByIdAndDelete(id);
      if (!category) {
        throw new HttpError(404, 'Category not found');
      }
    } else {
      const category = await ensureCategoryAvailable(id);
      category.status = 'inactive';
      category.isActive = false;
      category.deletedAt = new Date();
      await category.save();
    }

    res.status(204).send();
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function getCategories(req, res, next) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = { deletedAt: null };
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        throw new HttpError(400, 'Invalid status filter');
      }
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Category.countDocuments(filter)
    ]);

    res.json({
      data: items.map(formatCategoryResponse),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 0,
        limit: limitNum
      }
    });
  } catch (error) {
    next(normalizeError(error));
  }
}

export async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(400, 'Invalid category id');
    }

    const category = await ensureCategoryAvailable(id);
    res.json({ data: formatCategoryResponse(category) });
  } catch (error) {
    next(normalizeError(error));
  }
}
