// Seeds ~30 invented student profiles for local demo/testing of the swipe
// stack. Deterministic and safe to re-run: each profile is generated from a
// seeded PRNG keyed by index and upserted against a fixed, index-based email,
// so re-running always updates the same 30 rows instead of creating new
// ones. Photos are placeholders (randomuser.me portraits + picsum lifestyle
// shots) since no real photo storage is configured for fake accounts.
//
// Usage: npm run seed

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FIRST_NAMES_F = [
  "Alice", "Sofia", "Emma", "Lea", "Marie", "Anna", "Chiara", "Elena",
  "Nora", "Julia", "Camille", "Ines", "Klara", "Zofia", "Maja", "Freya",
];
const FIRST_NAMES_M = [
  "Lucas", "Mateo", "Felix", "Noah", "Leon", "Marco", "Antoine", "Jonas",
  "Viktor", "Adam", "Erik", "Diego", "Milan", "Theo", "Oskar", "Rafael",
];
const LAST_NAMES = [
  "Muller", "Dubois", "Rossi", "Novak", "Andersen", "Kowalski", "Garcia",
  "Fischer", "Bernard", "Conti", "Larsen", "Kovac", "Silva", "Weber",
  "Moreau", "Nowak", "Berg", "Lombardi", "Petit", "Hansen", "Schmidt",
  "Costa", "Wojcik", "Meyer", "Laurent", "Rasmussen", "Bianchi", "Braun",
  "Simon", "Zielinski",
];

const SCHOOLS = [
  ["Sciences Po", "Paris"],
  ["Sorbonne Universite", "Paris"],
  ["Universitat Pompeu Fabra", "Barcelona"],
  ["Bocconi University", "Milan"],
  ["University of Amsterdam", "Amsterdam"],
  ["University of Vienna", "Vienna"],
  ["ETH Zurich", "Zürich"],
  ["LMU Munich", "Munich"],
  ["Charles University", "Prague"],
  ["Universidade de Lisboa", "Lisbon"],
  ["University of Copenhagen", "Copenhagen"],
  ["Trinity College Dublin", "Dublin"],
  ["Stockholm University", "Stockholm"],
  ["Sapienza University of Rome", "Rome"],
  ["Universidad Complutense de Madrid", "Madrid"],
  ["Corvinus University", "Budapest"],
  ["University of Warsaw", "Warsaw"],
  ["KU Leuven", "Leuven"],
  ["University of Edinburgh", "Edinburgh"],
  ["Utrecht University", "Utrecht"],
  ["EPFL", "Lausanne"],
  ["TU Berlin", "Berlin"],
  ["FU Berlin", "Berlin"],
  ["Humboldt-Universitat zu Berlin", "Berlin"],
  ["Universitat Leipzig", "Leipzig"],
];

const PROGRAMS = [
  "Computer Science", "Economics", "Architecture", "Law", "Psychology",
  "Business Administration", "Mechanical Engineering", "Political Science",
  "Biology", "Graphic Design", "Medicine", "International Relations",
  "Data Science", "Marketing", "Philosophy", "Environmental Science", "Physics",
];

const YEAR_OF_STUDY_OPTIONS = ["1st year", "2nd year", "3rd year", "Master's", "PhD"];
// Weighted so most flats fit 1-2 people, with a long tail up to a group of 5.
const ACCOMMODATES_WEIGHTED = [1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 5];
const SMOKER_OPTIONS = ["No", "Occasionally", "Yes", "Prefer not to say"];
const PETS_OPTIONS = ["No pets", "Have a pet", "Open to pets", "Prefer not to say"];

const DATE_RANGES = [
  ["2026-09-01", "2026-12-20"],
  ["2027-01-10", "2027-06-15"],
  ["2026-09-01", "2027-06-15"],
  ["2026-06-01", "2026-08-31"],
  ["2026-10-01", "2027-02-01"],
];

const PROMPT_ANSWERS = {
  "My flat in three words": ["Cozy, bright, central", "Small but mighty", "Quiet, sunny, walkable", "Chaotic but charming", "Minimalist and calm"],
  "The neighborhood is known for...": ["The best bakery on the block", "A Sunday flea market", "Cheap eats and loud bars", "Quiet parks and cyclists", "Street art everywhere"],
  "You'll love this place if...": ["You like plants and natural light", "You want to walk everywhere", "You're a night owl near the nightlife", "You need a quiet place to study", "You love cooking in a real kitchen"],
  "My ideal swap partner...": ["Waters my plants and doesn't judge my mess", "Leaves the place better than they found it", "Actually uses the balcony", "Is chill about noise on weekends", "Loves cooking as much as I do"],
  "Non-negotiable for whoever stays here...": ["No smoking inside", "Take care of my cactus collection", "Recycle properly, please", "Keep the piano in tune", "No parties past midnight"],
  "Best local spot near me": ["The corner cafe with the good croissants", "A tiny wine bar two streets over", "The park by the river", "A record shop that never closes on time", "The market on Saturday mornings"],
  "What I'll miss most while I'm away": ["My balcony coffee ritual", "The view from my window", "My favorite bakery downstairs", "Sunday markets", "My neighbors' cat"],
  "A tip for surviving my city": ["Buy the monthly transit pass immediately", "Avoid the tourist restaurants near the center", "Bring an umbrella, always", "Learn five words of the local language", "The trams run late on weekends"],
  "My flatmates would describe me as...": ["Tidy but a chaotic cook", "Quiet until you get to know me", "The unofficial group chef", "Always up for a coffee run", "Suspiciously good at plant care"],
  "Green flag in a swap": ["Sends photos before and after", "Communicates clearly about house rules", "Actually reads the whole listing", "Offers to water my plants", "Is upfront about their schedule"],
  "Red flag in a swap (don't @ me)": ["Ghosts after the first message", "Wants to sublet to a third person", "Never mentions pets until the last minute", "Ignores the house rules doc", "Ambiguous about exact dates"],
  "Sundays in my city look like...": ["Market run then a long nap", "Brunch that turns into the whole afternoon", "A slow walk along the river", "Laundry and a good podcast", "Second-hand shopping with friends"],
  "The one thing you must bring": ["Slippers, the floors get cold", "A reusable coffee cup", "An adapter for the sockets", "A good rain jacket", "Patience for the elevator"],
  "Ask me about my flat's...": ["Slightly temperamental shower", "Excellent natural light", "Surprisingly loud pigeons", "Very reliable wifi", "Tiny but perfect kitchen"],
  "Why I'm doing a flat swap": ["Cheaper than a sublet, and I get a real home", "Wanted to actually live somewhere new, not just visit", "My program has a mandatory exchange semester", "Looking for an adventure without breaking the bank", "Tired of hostels, want a proper kitchen again"],
};

const PROMPT_KEYS = Object.keys(PROMPT_ANSWERS);

const SELF_DESCRIPTIONS = [
  "Tidy, easygoing, and mostly out during the day between classes and the library. I keep to myself but happy to chat over coffee.",
  "Social but respectful of shared space. I cook a lot, host the occasional small dinner, and clean up after myself.",
  "Quiet and low-key. I spend most evenings studying or at the gym, so the flat stays calm and tidy.",
  "Early riser, night owl's nightmare, but I'm considerate about noise and always up for showing a swap partner around.",
  "Laid-back and flexible. I travel light, don't throw parties, and treat every place like it's my own.",
];

const FLAT_DESCRIPTIONS = [
  "Bright, quiet apartment a short walk from campus, with a proper kitchen and fast wifi. Great for focused studying.",
  "Cozy place in a lively neighborhood, cafes and a park right outside, five minutes from the metro.",
  "Modern flat with all the basics covered: washing machine, dishwasher, good natural light all day.",
  "Small but well-located studio-style setup, walking distance to most things, very easy to get around from.",
  "Spacious shared flat with a big common area, ideal if you want to actually meet people while you're here.",
];

// Deterministic PRNG (mulberry32), seeded per-profile by index, so re-running
// this script always regenerates the exact same 30 profiles (upserted by a
// fixed, index-based email) instead of spawning new random duplicates on
// every run.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN(rng, arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

const AGE_RANGE_BY_YEAR = {
  "1st year": [18, 20],
  "2nd year": [19, 21],
  "3rd year": [20, 23],
  "Master's": [22, 26],
  PhD: [24, 30],
};

function randomAgeFor(rng, yearOfStudy) {
  const [min, max] = AGE_RANGE_BY_YEAR[yearOfStudy];
  return min + Math.floor(rng() * (max - min + 1));
}

// Per-day price in cents, loosely correlated with group size (bigger flats
// ask a higher daily rate), plus some spread so mutual matches sometimes
// produce a fairness-difference gap once multiplied out over the stay length.
function randomPricePerDayCentsFor(rng, accommodates) {
  const baseEuros = 15 + accommodates * 10;
  const varianceEuros = Math.floor(rng() * 20) - 10;
  return Math.max(10, baseEuros + varianceEuros) * 100;
}

function buildProfile(index) {
  const rng = mulberry32(index + 1000);
  const isFemale = index % 2 === 0;
  const firstName = pick(rng, isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
  const lastName = pick(rng, LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const [university, homeCity] = pick(rng, SCHOOLS);
  const [availableFrom, availableTo] = pick(rng, DATE_RANGES);
  const yearOfStudy = pick(rng, YEAR_OF_STUDY_OPTIONS);

  const promptQuestions = pickN(rng, PROMPT_KEYS, 3);
  const prompts = promptQuestions.map((question) => ({
    question,
    answer: pick(rng, PROMPT_ANSWERS[question]),
  }));

  const accommodates = pick(rng, ACCOMMODATES_WEIGHTED);

  const selfDescription = pick(rng, SELF_DESCRIPTIONS);
  const flatDescription = pick(rng, FLAT_DESCRIPTIONS);

  // 2 required photos of the person, 4 required photos of the flat.
  const portraitIndex = 10 + (index % 80);
  const portraitIndex2 = 10 + ((index + 37) % 80);
  const gender = isFemale ? "women" : "men";
  const selfPhotoUrls = [
    `https://randomuser.me/api/portraits/${gender}/${portraitIndex}.jpg`,
    `https://randomuser.me/api/portraits/${gender}/${portraitIndex2}.jpg`,
  ];
  const flatPhotoUrls = [1, 2, 3, 4].map(
    (n) => `https://picsum.photos/seed/${encodeURIComponent(name)}-flat${n}/600/800`
  );

  return {
    // Purely index-based (not derived from the generated name) so the upsert
    // key stays stable even if the name/word lists above are edited later.
    email: `demo-student-${index}@demo.studswap`,
    name,
    age: randomAgeFor(rng, yearOfStudy),
    university,
    program: pick(rng, PROGRAMS),
    yearOfStudy,
    homeCity,
    availableFrom: new Date(availableFrom),
    availableTo: new Date(availableTo),
    accommodates,
    pricePerDayCents: randomPricePerDayCentsFor(rng, accommodates),
    smoker: pick(rng, SMOKER_OPTIONS),
    pets: pick(rng, PETS_OPTIONS),
    selfPhotoUrls: JSON.stringify(selfPhotoUrls),
    flatPhotoUrls: JSON.stringify(flatPhotoUrls),
    selfDescription,
    flatDescription,
    prompts: JSON.stringify(prompts),
  };
}

async function main() {
  const count = 30;
  for (let i = 0; i < count; i++) {
    const { email, ...profileData } = buildProfile(i);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, emailVerified: new Date() },
      update: {},
    });
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profileData },
      update: profileData,
    });
  }
  console.log(`Seeded ${count} demo profiles.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
