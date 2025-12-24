import { FoodItem, UnitSystem } from '../types';

const METRIC_WEIGHTS = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'mg', 'milligram', 'milligrams'];
const IMPERIAL_WEIGHTS = ['oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds'];

const METRIC_VOLUMES = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'];
const IMPERIAL_VOLUMES = ['fl oz', 'fluid ounce', 'fluid ounces', 'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'];

export const convertFoodItem = (item: FoodItem, system: UnitSystem): FoodItem => {
  const { quantity, unit } = item;
  
  if (!unit) return item;

  const normalizedUnit = unit.toLowerCase().trim();

  // Helper to round for display
  const round = (val: number) => parseFloat(val.toFixed(1));

  if (system === 'metric') {
    // Convert TO Metric
    
    // Check if currently Imperial Weight
    if (IMPERIAL_WEIGHTS.includes(normalizedUnit)) {
      let grams = 0;
      if (['oz', 'ounce', 'ounces'].includes(normalizedUnit)) grams = quantity * 28.3495;
      if (['lb', 'lbs', 'pound', 'pounds'].includes(normalizedUnit)) grams = quantity * 453.592;
      
      // If result is very large (>= 1000g), use kg
      if (grams >= 1000) {
        return { ...item, quantity: round(grams / 1000), unit: 'kg' };
      }
      return { ...item, quantity: Math.round(grams), unit: 'g' };
    }

    // Check if currently Imperial Volume
    if (IMPERIAL_VOLUMES.includes(normalizedUnit)) {
       let ml = 0;
       if (['fl oz', 'fluid ounce', 'fluid ounces'].includes(normalizedUnit)) ml = quantity * 29.5735;
       if (['cup', 'cups'].includes(normalizedUnit)) ml = quantity * 236.588;
       if (['tbsp', 'tablespoon', 'tablespoons'].includes(normalizedUnit)) ml = quantity * 14.7868;
       if (['tsp', 'teaspoon', 'teaspoons'].includes(normalizedUnit)) ml = quantity * 4.92892;
       if (['pint', 'pints'].includes(normalizedUnit)) ml = quantity * 473.176;
       if (['quart', 'quarts'].includes(normalizedUnit)) ml = quantity * 946.353;
       if (['gallon', 'gallons'].includes(normalizedUnit)) ml = quantity * 3785.41;
       
       // If result is large, use liters
       if (ml >= 1000) {
         return { ...item, quantity: round(ml / 1000), unit: 'l' };
       }
       return { ...item, quantity: Math.round(ml), unit: 'ml' };
    }

  } else {
    // Convert TO Imperial

    // Check if currently Metric Weight
    if (METRIC_WEIGHTS.includes(normalizedUnit)) {
       let oz = 0;
       if (['g', 'gram', 'grams'].includes(normalizedUnit)) oz = quantity * 0.035274;
       if (['kg', 'kilogram', 'kilograms'].includes(normalizedUnit)) oz = quantity * 35.274;
       if (['mg', 'milligram', 'milligrams'].includes(normalizedUnit)) oz = quantity * 0.000035274;

       // If oz is large (>= 16), use lbs
       if (oz >= 16) {
         return { ...item, quantity: round(oz / 16), unit: 'lbs' };
       }
       // If very small, keep 2 decimals
       if (oz < 1) {
          return { ...item, quantity: parseFloat(oz.toFixed(2)), unit: 'oz' };
       }
       return { ...item, quantity: round(oz), unit: 'oz' };
    }

    // Check if currently Metric Volume
    if (METRIC_VOLUMES.includes(normalizedUnit)) {
       let floz = 0;
       if (['ml', 'milliliter', 'milliliters'].includes(normalizedUnit)) floz = quantity * 0.033814;
       if (['l', 'liter', 'liters'].includes(normalizedUnit)) floz = quantity * 33.814;
       
       return { ...item, quantity: round(floz), unit: 'fl oz' };
    }
  }

  // Return original if no conversion matched (e.g., "slice", "piece", or already in correct system)
  return item;
}