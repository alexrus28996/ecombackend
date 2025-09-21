import { config } from './index.js';

export const pickingConfig = {
  defaultStrategy: config.PICKING_DEFAULT_STRATEGY || 'PRIORITY_PROXIMITY_AVAILABILITY',
  weights: {
    priority: Number(config.PICKING_PRIORITY_WEIGHT ?? 0.6),
    distance: Number(config.PICKING_DISTANCE_WEIGHT ?? 0.2),
    handlingCost: Number(config.PICKING_HANDLING_COST_WEIGHT ?? 0.1),
    age: Number(config.PICKING_AGE_WEIGHT ?? 0.1)
  },
  allowSplit: Boolean(config.PICKING_ALLOW_SPLIT)
};
