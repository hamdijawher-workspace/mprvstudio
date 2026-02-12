export const CATEGORY_DEFS = [
  { id: "grooming", label: "Grooming", tone: "#d9d5c9" },
  { id: "tech", label: "Tech", tone: "#d3d6cf" },
  { id: "fitness", label: "Fitness", tone: "#d6d0c4" },
  { id: "food", label: "Food", tone: "#d8d2c6" },
  { id: "home-decor", label: "Home Decor", tone: "#d2d0c8" },
  { id: "phone-apps", label: "Phone Apps", tone: "#d4d6cf" },
  { id: "phone-cases", label: "Phone Cases", tone: "#d7d4cb" },
  { id: "clothes", label: "Clothes", tone: "#d3d0c7" },
  { id: "watches", label: "Watches", tone: "#cecbbf" }
];

export const CATEGORY_SEEDS = {
  grooming: [
    "Precision Safety Razor",
    "Featherweight Trimmer",
    "Cedar Beard Oil",
    "Daily Hydration Gel",
    "Charcoal Face Cleanser",
    "Balanced Shampoo Bar",
    "Matte Styling Cream",
    "Silk Edge Brush",
    "Aftershave Calm Mist",
    "Daily SPF Moisturizer",
    "Stainless Nail Kit",
    "Travel Groom Pouch"
  ],
  tech: [
    "Foldable USB-C Hub",
    "Ultra-Wide Desk Monitor",
    "Low-Latency Earbuds",
    "Mechanical 75 Keyboard",
    "Noise-Control Headset",
    "Portable NVMe Drive",
    "GaN Fast Charger",
    "MagSafe Battery Dock",
    "Compact Smart Speaker",
    "4K Streaming Stick",
    "Air Quality Sensor",
    "Ergonomic Vertical Mouse"
  ],
  fitness: [
    "Adjustable Kettlebell",
    "Grip-Tuned Resistance Bands",
    "Compact Foam Roller",
    "Core Balance Disc",
    "Breathable Gym Duffle",
    "Speed Rope Pro",
    "Recovery Massage Gun",
    "Hydration Tracking Bottle",
    "Trail Performance Cap",
    "Mobility Loop Set",
    "Stability Training Mat",
    "Post-Workout Recovery Kit"
  ],
  food: [
    "Single-Origin Pour Over Set",
    "Cold Brew Carafe",
    "Precision Grinder",
    "Airtight Pantry Canisters",
    "Chef Carbon Knife",
    "Low-Smoke Grill Pan",
    "Sea Salt Flake Trio",
    "Morning Protein Blend",
    "All-Day Electrolyte Mix",
    "Minimal Meal Prep Box",
    "Organic Olive Pair",
    "Cast Iron Mini Dutch Oven"
  ],
  "home-decor": [
    "Walnut Entry Shelf",
    "Linen Throw Blanket",
    "Brushed Steel Floor Lamp",
    "Acoustic Panel Set",
    "Ceramic Table Vessel",
    "Stone Texture Planter",
    "Modular Book Stand",
    "Sculpted Mirror Tray",
    "Matte Black Wall Hooks",
    "Woven Lounge Rug",
    "Stackable Storage Crates",
    "Ambient Candle Diffuser"
  ],
  "phone-apps": [
    "Focus Sprint Planner",
    "Budget Pulse Tracker",
    "Habit Grid Coach",
    "Meal Prep Assistant",
    "Deep Work Timer",
    "Strength Logbook",
    "Inbox Zero Shortcut",
    "Photo Backup Vault",
    "Travel Itinerary Builder",
    "Sleep Rhythm Coach",
    "Language Daily Deck",
    "Reading Queue Manager"
  ],
  "phone-cases": [
    "Slim Armor Case",
    "Soft Touch Grip Case",
    "Kevlar Weave Shield",
    "Clear Matte Protector",
    "Magnetic Wallet Case",
    "Drop-Test Bumper",
    "Carbon Fiber Snap Case",
    "Leather Fold Case",
    "Dual-Layer Trail Case",
    "Anti-Yellow Crystal Case",
    "Camera Guard Case",
    "Eco Biopolymer Case"
  ],
  clothes: [
    "Heavyweight White Tee",
    "Straight Utility Chino",
    "Merino Everyday Crew",
    "Packable Wind Jacket",
    "Relaxed Oxford Shirt",
    "Travel Cargo Pant",
    "Structured Overshirt",
    "Performance Knit Polo",
    "Wool Blend Hoodie",
    "Lightweight Rain Shell",
    "Rib Tank Layer",
    "Minimal Court Sneaker"
  ],
  watches: [
    "Field Watch 38",
    "Chronograph Steel",
    "Solar Everyday Watch",
    "GMT Traveler",
    "Titanium Diver",
    "Rectangular Dress Watch",
    "Pilot Automatic",
    "Mesh Strap Quartz",
    "Minimal Mono Dial",
    "Dual Time Sport Watch",
    "Sapphire Tool Watch",
    "Classic Leather Watch"
  ]
};

export const PRICE_BANDS = {
  grooming: [14, 130],
  tech: [39, 749],
  fitness: [18, 320],
  food: [10, 220],
  "home-decor": [16, 280],
  "phone-apps": [3, 45],
  "phone-cases": [12, 95],
  clothes: [24, 280],
  watches: [90, 950]
};

export const BRAND_POOLS = {
  grooming: ["Aesop", "Muhle", "Baxter", "Henson"],
  tech: ["Sony", "Keychron", "Anker", "Belkin"],
  fitness: ["Rogue", "Hyperice", "Therabody", "Nike"],
  food: ["Fellow", "Misen", "Graza", "Stagg"],
  "home-decor": ["Hay", "Muuto", "Ferm Living", "Menu"],
  "phone-apps": ["Notion", "Calm", "Reeder", "Todoist"],
  "phone-cases": ["Nomad", "Caudabe", "Spigen", "Mous"],
  clothes: ["COS", "Aime Leon Dore", "Norse Projects", "Uniqlo"],
  watches: ["Seiko", "Hamilton", "Tissot", "Baltic"]
};

export const CATEGORY_AUDIENCE = {
  grooming: {
    whoFor: "People who want reliable daily grooming with minimal steps.",
    whoNotFor: "Anyone looking for salon-grade or highly specialized routines."
  },
  tech: {
    whoFor: "People optimizing desk performance and daily workflow speed.",
    whoNotFor: "Users who prioritize niche pro-only features over simplicity."
  },
  fitness: {
    whoFor: "People building a compact, repeatable home or travel training setup.",
    whoNotFor: "Athletes needing full-size commercial gym equipment."
  },
  food: {
    whoFor: "People who want practical kitchen utility without clutter.",
    whoNotFor: "Home chefs seeking full professional kitchen complexity."
  },
  "home-decor": {
    whoFor: "People refining calm, durable spaces with fewer better pieces.",
    whoNotFor: "Anyone redecorating around fast-trend statement items."
  },
  "phone-apps": {
    whoFor: "People who want focused daily utility from a small app stack.",
    whoNotFor: "Power users needing broad app ecosystems and deep integrations."
  },
  "phone-cases": {
    whoFor: "People who want clean protection and dependable grip every day.",
    whoNotFor: "Users prioritizing novelty materials over proven protection."
  },
  clothes: {
    whoFor: "People building repeatable outfits with versatile staples.",
    whoNotFor: "Shoppers looking for trend-first seasonal statement pieces."
  },
  watches: {
    whoFor: "People who want an everyday watch rotation with clear roles.",
    whoNotFor: "Collectors optimizing for rare complications or speculation."
  }
};

export const CATEGORY_IMAGE_QUERIES = {
  grooming: "grooming,flatlay,bathroom,product",
  tech: "technology,desk,workspace,product",
  fitness: "fitness,gym,training,gear",
  food: "kitchen,cooking,food,tools",
  "home-decor": "interior,home,decor,minimal",
  "phone-apps": "smartphone,app,mobile,screen",
  "phone-cases": "phone,case,accessory,product",
  clothes: "fashion,clothing,minimal,outfit",
  watches: "watch,timepiece,wrist,product"
};
