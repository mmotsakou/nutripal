/**
 * Food search routes (proxy to Open Food Facts — no API key needed)
 * GET /api/food/search?q=banana&page=1
 * GET /api/food/barcode/:barcode
 */
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const OFF_BASE = 'https://world.openfoodfacts.org';

function parseProduct(product) {
  const n = product.nutriments || {};
  return {
    barcode: product.code,
    name: product.product_name || product.product_name_en || 'Unknown',
    brand: product.brands || '',
    serving_size: product.serving_size || '100g',
    image_url: product.image_thumb_url || product.image_url || null,
    calories: n['energy-kcal_100g'] || n['energy-kcal'] || 0,
    protein: n['proteins_100g'] || n.proteins || 0,
    carbs: n['carbohydrates_100g'] || n.carbohydrates || 0,
    fat: n['fat_100g'] || n.fat || 0,
    fiber: n['fiber_100g'] || n.fiber || 0,
    sodium: n['sodium_100g'] || n.sodium || 0,
    sugar: n['sugars_100g'] || n.sugars || 0,
    categories: product.categories_tags?.slice(0, 3) || [],
  };
}

// Search by name
router.get('/search', async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q || q.length < 2) return res.status(400).json({ error: 'query too short' });

  try {
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&fields=code,product_name,product_name_en,brands,serving_size,nutriments,image_thumb_url,image_url,categories_tags`;
    const resp = await fetch(url, { timeout: 8000 });
    if (!resp.ok) throw new Error('Open Food Facts search failed');
    const data = await resp.json();

    const products = (data.products || [])
      .filter(p => p.product_name || p.product_name_en)
      .map(parseProduct);

    res.json({ products, count: data.count || products.length, page: Number(page) });
  } catch (err) {
    console.error('Food search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Barcode lookup
router.get('/barcode/:code', async (req, res) => {
  const { code } = req.params;
  if (!code) return res.status(400).json({ error: 'barcode required' });

  try {
    const url = `${OFF_BASE}/api/v0/product/${code}.json?fields=code,product_name,product_name_en,brands,serving_size,nutriments,image_thumb_url,image_url,categories_tags`;
    const resp = await fetch(url, { timeout: 8000 });
    if (!resp.ok) throw new Error('Open Food Facts lookup failed');
    const data = await resp.json();

    if (data.status === 0 || !data.product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: parseProduct(data.product) });
  } catch (err) {
    console.error('Barcode lookup error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
