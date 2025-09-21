import { createLocation, listLocations, updateLocation, softDeleteLocation, getLocationById } from '../services/location.service.js';

export async function createLocationController(req, res) {
  const doc = await createLocation(req.body);
  res.status(201).json(doc);
}

export async function listLocationsController(req, res) {
  const { type, active, region, country, page, limit } = req.query;
  const response = await listLocations({
    type,
    active: typeof active === 'undefined' ? undefined : active === 'true' || active === true,
    region,
    country,
    page,
    limit
  });
  res.json(response);
}

export async function updateLocationController(req, res) {
  const doc = await updateLocation(req.params.id, req.body);
  res.json(doc);
}

export async function deleteLocationController(req, res) {
  const result = await softDeleteLocation(req.params.id);
  res.json(result);
}

export async function getLocationController(req, res) {
  const doc = await getLocationById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: { message: 'Location not found' } });
  }
  res.json(doc);
}
