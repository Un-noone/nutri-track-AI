import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nutritrack';
const JWT_SECRET = process.env.JWT_SECRET || 'nutritrack-secret-key';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

let db;
const client = new MongoClient(MONGODB_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db('nutritrack');
    console.log('Connected to MongoDB');

    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Initialize Gemini
let genAI;
let model;

function initGemini() {
  if (!GOOGLE_API_KEY) {
    console.warn('Warning: GOOGLE_API_KEY not set. Food parsing will not work.');
    return;
  }
  genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  console.log('Gemini AI initialized');
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// System prompt for food parsing
const FOOD_PARSING_PROMPT = `You are a nutrition expert AI assistant. Your task is to extract food items from user input (text or image).

For each food item, provide:
- name: The food item name
- quantity: Numeric amount (estimate if not specified)
- unit: Unit of measurement (serving, cup, oz, g, piece, etc.)
- calories: Estimated calories
- protein_g: Estimated protein in grams
- carbs_g: Estimated carbohydrates in grams
- fat_g: Estimated fat in grams
- confidence: Your confidence level (0.0 to 1.0)

Also determine the meal type based on context or time:
- "Breakfast" (morning foods, breakfast items)
- "Lunch" (midday, lunch items)
- "Dinner" (evening, dinner items)
- "Snack" (snacks, small items)

Return ONLY valid JSON in this exact format:
{
  "meal_label": "Breakfast|Lunch|Dinner|Snack",
  "items": [
    {
      "name": "food name",
      "quantity": 1,
      "unit": "serving",
      "calories": 200,
      "protein_g": 10,
      "carbs_g": 25,
      "fat_g": 8,
      "confidence": 0.85
    }
  ]
}`;

// Parse food from text
async function parseFoodFromText(text, datetime) {
  if (!model) {
    throw new Error('Gemini AI not initialized. Please set GOOGLE_API_KEY.');
  }

  const timeContext = datetime ? `Current time: ${datetime}` : '';
  const prompt = `${FOOD_PARSING_PROMPT}\n\n${timeContext}\n\nUser input: "${text}"`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

// Parse food from image
async function parseFoodFromImage(imageBase64, mimeType = 'image/jpeg') {
  if (!model) {
    throw new Error('Gemini AI not initialized. Please set GOOGLE_API_KEY.');
  }

  const prompt = `${FOOD_PARSING_PROMPT}\n\nAnalyze this food image and identify all food items visible.`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: mimeType
    }
  };

  const result = await model.generateContent([prompt, imagePart]);
  const response = result.response.text();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      email,
      password_hash: passwordHash,
      name,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create default goals
    await db.collection('user_goals').insertOne({
      user_id: result.insertedId,
      calories: 2000,
      protein_g: 50,
      carbs_g: 250,
      fat_g: 65,
      updated_at: new Date()
    });

    // Create default settings
    await db.collection('user_settings').insertOne({
      user_id: result.insertedId,
      theme: 'light',
      unit_system: 'metric',
      updated_at: new Date()
    });

    // Generate token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        email,
        name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString(), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password_hash: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== FOOD PARSING ROUTES ====================

// Parse food from text
app.post('/api/parse-food-log', authenticateToken, async (req, res) => {
  try {
    const { text, datetime, timezone } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const parsed = await parseFoodFromText(text, datetime);

    // Calculate totals
    const totals = parsed.items.reduce((acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein_g: acc.protein_g + (item.protein_g || 0),
      carbs_g: acc.carbs_g + (item.carbs_g || 0),
      fat_g: acc.fat_g + (item.fat_g || 0)
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    res.json({
      meal_label: parsed.meal_label,
      items: parsed.items.map(item => ({
        ...item,
        source: 'text',
        nutrients_total: {
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g
        }
      })),
      totals
    });
  } catch (error) {
    console.error('Parse food error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse food log' });
  }
});

// Analyze food from image
app.post('/api/analyze-food-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    let imageBase64;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.image_base64) {
      imageBase64 = req.body.image_base64;
      mimeType = req.body.mime_type || 'image/jpeg';
    } else {
      return res.status(400).json({ error: 'Image is required' });
    }

    const parsed = await parseFoodFromImage(imageBase64, mimeType);

    // Calculate totals
    const totals = parsed.items.reduce((acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein_g: acc.protein_g + (item.protein_g || 0),
      carbs_g: acc.carbs_g + (item.carbs_g || 0),
      fat_g: acc.fat_g + (item.fat_g || 0)
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    res.json({
      meal_label: parsed.meal_label,
      items: parsed.items.map(item => ({
        ...item,
        source: 'image',
        nutrients_total: {
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g
        }
      })),
      totals
    });
  } catch (error) {
    console.error('Analyze image error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze food image' });
  }
});

// ==================== ENTRIES ROUTES ====================

// Get all entries for user
app.get('/api/entries', authenticateToken, async (req, res) => {
  try {
    const entries = await db.collection('food_entries')
      .find({ user_id: new ObjectId(req.user.userId) })
      .sort({ logged_at: -1 })
      .toArray();

    res.json(entries.map(entry => ({
      id: entry._id.toString(),
      logged_at: entry.logged_at,
      raw_text: entry.raw_text,
      meal_label: entry.meal_label,
      items: entry.items,
      totals: entry.totals,
      image_base64: entry.image_base64
    })));
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to get entries' });
  }
});

// Create entry
app.post('/api/entries', authenticateToken, async (req, res) => {
  try {
    const { logged_at, raw_text, meal_label, items, totals, image_base64 } = req.body;

    const entry = {
      user_id: new ObjectId(req.user.userId),
      logged_at: new Date(logged_at),
      raw_text,
      meal_label,
      items,
      totals,
      image_base64,
      created_at: new Date()
    };

    const result = await db.collection('food_entries').insertOne(entry);

    res.status(201).json({
      id: result.insertedId.toString(),
      ...entry,
      user_id: undefined
    });
  } catch (error) {
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Delete entry
app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.collection('food_entries').deleteOne({
      _id: new ObjectId(req.params.id),
      user_id: new ObjectId(req.user.userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ==================== GOALS ROUTES ====================

// Get user goals
app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    let goals = await db.collection('user_goals').findOne({
      user_id: new ObjectId(req.user.userId)
    });

    if (!goals) {
      // Create default goals
      const defaultGoals = {
        user_id: new ObjectId(req.user.userId),
        calories: 2000,
        protein_g: 50,
        carbs_g: 250,
        fat_g: 65,
        updated_at: new Date()
      };
      await db.collection('user_goals').insertOne(defaultGoals);
      goals = defaultGoals;
    }

    res.json({
      calories: goals.calories,
      protein_g: goals.protein_g,
      carbs_g: goals.carbs_g,
      fat_g: goals.fat_g
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to get goals' });
  }
});

// Update user goals
app.put('/api/goals', authenticateToken, async (req, res) => {
  try {
    const { calories, protein_g, carbs_g, fat_g } = req.body;

    await db.collection('user_goals').updateOne(
      { user_id: new ObjectId(req.user.userId) },
      {
        $set: {
          calories,
          protein_g,
          carbs_g,
          fat_g,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ calories, protein_g, carbs_g, fat_g });
  } catch (error) {
    console.error('Update goals error:', error);
    res.status(500).json({ error: 'Failed to update goals' });
  }
});

// ==================== SETTINGS ROUTES ====================

// Get user settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    let settings = await db.collection('user_settings').findOne({
      user_id: new ObjectId(req.user.userId)
    });

    if (!settings) {
      const defaultSettings = {
        user_id: new ObjectId(req.user.userId),
        theme: 'light',
        unit_system: 'metric',
        updated_at: new Date()
      };
      await db.collection('user_settings').insertOne(defaultSettings);
      settings = defaultSettings;
    }

    res.json({
      theme: settings.theme,
      unit_system: settings.unit_system
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update user settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { theme, unit_system } = req.body;

    await db.collection('user_settings').updateOne(
      { user_id: new ObjectId(req.user.userId) },
      {
        $set: {
          theme,
          unit_system,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ theme, unit_system });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gemini: !!model,
    mongodb: !!db
  });
});

// Start server
async function start() {
  await connectDB();
  initGemini();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
