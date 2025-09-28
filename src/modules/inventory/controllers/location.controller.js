import {
  createLocation,
  listLocations,
  updateLocation,
  softDeleteLocation,
  getLocationById,
  restoreLocation
} from '../services/location.service.js';

export async function createLocationController(req, res) {
  const payload = req.validated?.body ?? req.body;
  const doc = await createLocation(payload);
  res.status(201).json({ location: doc });
}

export async function listLocationsController(req, res) {
  const { type, active, region, country, page, limit, state } = req.validated?.query ?? req.query;
  const response = await listLocations({
    type,
    active:
      typeof active === 'undefined'
        ? undefined
        : active === 'true' || active === true || active === 1 || active === '1',
    region,
    country,
    page,
    limit,
    state
  });
  res.json(response);
}

export async function updateLocationController(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const updates = req.validated?.body ?? req.body;
  const doc = await updateLocation(id, updates);
  res.json({ location: doc });
}

export async function deleteLocationController(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const result = await softDeleteLocation(id);
  res.json(result);
}

export async function getLocationController(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const doc = await getLocationById(id, { includeDeleted: true });
  if (!doc) {
    return res.status(404).json({ error: { message: 'Location not found' } });
  }
  res.json({ location: doc });
}

export async function restoreLocationController(req, res) {
  const id = req.validated?.params?.id ?? req.params.id;
  const location = await restoreLocation(id);
  res.json({ location });
}
