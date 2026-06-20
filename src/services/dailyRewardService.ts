/**
 * Daily Surprise Reward Service
 * Handles reward generation, claiming, and Firestore persistence.
 */

import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { activatePremiumTrial, addStreakShields } from '@/services/premiumService';

// ─── Reward Type Definitions ───────────────────────────────────────────

export type RewardType =
    | 'motivation'
    | 'fact'
    | 'brain_teaser'
    | 'math_challenge'
    | 'bonus_xp'
    | 'xp_boost'
    | 'streak_protection'
    | 'challenge_ticket'
    | 'premium_trial'
    | 'legendary';

export interface RewardData {
    type: RewardType;
    title: string;
    description: string;
    content: string;           // Main display text (quote, fact, question, etc.)
    xp: number;
    coins: number;
    icon: string;              // Emoji icon for the reward card
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    // Brain teaser / math challenge specific
    answer?: string;
    options?: string[];
    correctIndex?: number;
    // XP Boost specific
    boostMultiplier?: number;
    boostDurationMinutes?: number;
}

export interface DailyRewardDoc {
    userId: string;
    date: string;              // YYYY-MM-DD (IST)
    rewardType: RewardType;
    rewardData: RewardData;
    claimedAt: Date;
    xpAwarded: number;
    coinsAwarded: number;
}

// ─── Weighted Probabilities ────────────────────────────────────────────

interface WeightedReward {
    type: RewardType;
    weight: number;   // Percentage (must sum to 100)
}

const REWARD_WEIGHTS: WeightedReward[] = [
    { type: 'motivation',         weight: 25 },
    { type: 'fact',               weight: 20 },
    { type: 'brain_teaser',       weight: 15 },
    { type: 'math_challenge',     weight: 10 },
    { type: 'bonus_xp',           weight: 10 },
    { type: 'xp_boost',           weight: 8  },
    { type: 'streak_protection',  weight: 5  },
    { type: 'challenge_ticket',   weight: 3  },
    { type: 'premium_trial',      weight: 3  },
    { type: 'legendary',          weight: 1  },
];

// ─── Content Pools ─────────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "Learning is not attained by chance, it must be sought for with ardor and attended to with diligence.", author: "Abigail Adams" },
    { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
    { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
    { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
    { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
    { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert" },
    { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
    { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
    { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
    { text: "Genius is 1% inspiration and 99% perspiration.", author: "Thomas Edison" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Your limitation — it's only your imagination.", author: "Unknown" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
];

const DAILY_FACTS = [
    { text: "The first computer programmer was Ada Lovelace, who wrote algorithms for Charles Babbage's Analytical Engine in the 1840s.", category: "Technology" },
    { text: "Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still perfectly edible.", category: "Science" },
    { text: "The Great Wall of China is not visible from space with the naked eye, contrary to popular belief.", category: "History" },
    { text: "Octopuses have three hearts, nine brains, and blue blood.", category: "Science" },
    { text: "The first website ever created is still online. It was published on August 6, 1991 by Tim Berners-Lee.", category: "Technology" },
    { text: "A group of flamingos is called a 'flamboyance'.", category: "Science" },
    { text: "The shortest war in history lasted only 38 to 45 minutes between Britain and Zanzibar on August 27, 1896.", category: "History" },
    { text: "Python programming language was named after Monty Python's Flying Circus, not the snake.", category: "Technology" },
    { text: "Water can boil and freeze at the same time. It's called the 'triple point'.", category: "Science" },
    { text: "The term 'bug' in computer science originated from an actual moth found in a Harvard Mark II computer in 1947.", category: "Technology" },
    { text: "Bananas are naturally radioactive because they contain potassium-40.", category: "Science" },
    { text: "The Eiffel Tower can grow up to 15 cm taller during summer due to thermal expansion of iron.", category: "Science" },
    { text: "The first ever email was sent by Ray Tomlinson in 1971. He doesn't remember what it said.", category: "Technology" },
    { text: "Venus is the only planet that spins clockwise. All other planets spin counter-clockwise.", category: "Science" },
    { text: "The inventor of the Pringles can, Fredric Baur, was buried in one after he passed away.", category: "History" },
    { text: "A teaspoon of neutron star material would weigh about 6 billion tons.", category: "Science" },
    { text: "The human brain uses about 20% of the body's total energy, despite being only 2% of body weight.", category: "Science" },
    { text: "The first programmable computer, the Z3, was built by Konrad Zuse in Germany in 1941.", category: "Technology" },
    { text: "Light takes 8 minutes and 20 seconds to travel from the Sun to Earth.", category: "Science" },
    { text: "The number zero was invented in India by mathematician Brahmagupta in 628 AD.", category: "Math" },
    { text: "There are more possible iterations of a game of chess than atoms in the observable universe.", category: "Math" },
    { text: "DNA in a single human cell, when uncoiled, would stretch about 2 meters long.", category: "Science" },
    { text: "The word 'algorithm' comes from the name of Persian mathematician al-Khwarizmi.", category: "Math" },
    { text: "Sound travels about 4 times faster in water than in air.", category: "Science" },
    { text: "The @ symbol was nearly extinct before Ray Tomlinson chose it for email addresses.", category: "Technology" },
    { text: "Mount Everest grows about 4mm every year due to tectonic plate movement.", category: "Science" },
    { text: "The ancient Greeks knew the Earth was round over 2,000 years before Columbus.", category: "History" },
    { text: "A bolt of lightning is 5 times hotter than the surface of the Sun.", category: "Science" },
    { text: "The word 'robot' comes from the Czech word 'robota', meaning forced labor.", category: "Technology" },
    { text: "If you shuffled a deck of cards properly, the arrangement has likely never existed before in history.", category: "Math" },
    { text: "The total weight of all ants on Earth is roughly equal to the total weight of all humans.", category: "Science" },
];

const BRAIN_TEASERS = [
    {
        question: "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?",
        answer: "An echo",
        options: ["A shadow", "An echo", "A whisper", "A cloud"],
        correctIndex: 1,
    },
    {
        question: "What has keys but no locks, space but no room, and you can enter but can't go inside?",
        answer: "A keyboard",
        options: ["A map", "A keyboard", "A house", "A book"],
        correctIndex: 1,
    },
    {
        question: "The more you take, the more you leave behind. What am I?",
        answer: "Footsteps",
        options: ["Time", "Memories", "Footsteps", "Breath"],
        correctIndex: 2,
    },
    {
        question: "What can travel around the world while staying in a corner?",
        answer: "A stamp",
        options: ["A stamp", "A spider", "The internet", "A satellite"],
        correctIndex: 0,
    },
    {
        question: "If you have it, you want to share it. If you share it, you don't have it. What is it?",
        answer: "A secret",
        options: ["Happiness", "A secret", "Money", "Knowledge"],
        correctIndex: 1,
    },
    {
        question: "What gets wetter the more it dries?",
        answer: "A towel",
        options: ["A sponge", "Rain", "A towel", "Ice"],
        correctIndex: 2,
    },
    {
        question: "I have cities, but no houses live there. I have mountains, but no trees grow. I have water, but no fish swim. What am I?",
        answer: "A map",
        options: ["A painting", "A map", "A dream", "A globe"],
        correctIndex: 1,
    },
    {
        question: "What has a head and a tail but no body?",
        answer: "A coin",
        options: ["A snake", "A coin", "A comet", "A pin"],
        correctIndex: 1,
    },
    {
        question: "I'm tall when I'm young and short when I'm old. What am I?",
        answer: "A candle",
        options: ["A tree", "A candle", "A pencil", "A shadow"],
        correctIndex: 1,
    },
    {
        question: "What has hands but can't clap?",
        answer: "A clock",
        options: ["A statue", "A clock", "A puppet", "A robot"],
        correctIndex: 1,
    },
    {
        question: "What can you break without touching it?",
        answer: "A promise",
        options: ["A promise", "Silence", "A heart", "A rule"],
        correctIndex: 0,
    },
    {
        question: "I have teeth but I can't bite. What am I?",
        answer: "A comb",
        options: ["A saw", "A comb", "A zipper", "A gear"],
        correctIndex: 1,
    },
    {
        question: "What has one eye but can't see?",
        answer: "A needle",
        options: ["A storm", "A needle", "A camera", "A keyhole"],
        correctIndex: 1,
    },
    {
        question: "What comes once in a minute, twice in a moment, but never in a thousand years?",
        answer: "The letter M",
        options: ["A heartbeat", "The letter M", "An eclipse", "A comet"],
        correctIndex: 1,
    },
    {
        question: "What can fill a room but takes up no space?",
        answer: "Light",
        options: ["Sound", "Air", "Light", "Smell"],
        correctIndex: 2,
    },
    {
        question: "I can be cracked, made, told, and played. What am I?",
        answer: "A joke",
        options: ["A code", "A joke", "A record", "An egg"],
        correctIndex: 1,
    },
    {
        question: "What begins with T, ends with T, and has T in it?",
        answer: "A teapot",
        options: ["A tent", "A toast", "A teapot", "A ticket"],
        correctIndex: 2,
    },
    {
        question: "What invention lets you look right through a wall?",
        answer: "A window",
        options: ["X-ray", "A window", "A mirror", "A telescope"],
        correctIndex: 1,
    },
    {
        question: "What goes up but never comes down?",
        answer: "Your age",
        options: ["A balloon", "Your age", "Smoke", "Temperature"],
        correctIndex: 1,
    },
    {
        question: "What has a neck but no head?",
        answer: "A bottle",
        options: ["A shirt", "A guitar", "A bottle", "A vase"],
        correctIndex: 2,
    },
    {
        question: "What word is spelled incorrectly in every dictionary?",
        answer: "Incorrectly",
        options: ["Incorrectly", "Misspelled", "Wrong", "Error"],
        correctIndex: 0,
    },
    {
        question: "I follow you everywhere but can't be caught. What am I?",
        answer: "Your shadow",
        options: ["Your shadow", "Your reflection", "Time", "A thought"],
        correctIndex: 0,
    },
    {
        question: "What has 13 hearts but no other organs?",
        answer: "A deck of cards",
        options: ["A centipede", "A deck of cards", "A hospital", "A valentine box"],
        correctIndex: 1,
    },
    {
        question: "What can you hold in your right hand but never in your left?",
        answer: "Your left elbow",
        options: ["A pen", "Your left elbow", "A secret", "Your breath"],
        correctIndex: 1,
    },
    {
        question: "What has a ring but no finger?",
        answer: "A telephone",
        options: ["A bell", "A tree", "A telephone", "Saturn"],
        correctIndex: 2,
    },
    {
        question: "What gets sharper the more you use it?",
        answer: "Your brain",
        options: ["A knife", "Your brain", "A pencil", "A saw"],
        correctIndex: 1,
    },
    {
        question: "What building has the most stories?",
        answer: "A library",
        options: ["A skyscraper", "A library", "A museum", "A hotel"],
        correctIndex: 1,
    },
    {
        question: "What runs around a yard without moving?",
        answer: "A fence",
        options: ["A dog", "A fence", "Water", "Wind"],
        correctIndex: 1,
    },
    {
        question: "What kind of band never plays music?",
        answer: "A rubber band",
        options: ["A headband", "A rubber band", "A wristband", "A bandwidth"],
        correctIndex: 1,
    },
    {
        question: "What can you catch but not throw?",
        answer: "A cold",
        options: ["A cold", "A wave", "A bus", "An idea"],
        correctIndex: 0,
    },
    {
        question: "What has words but never speaks?",
        answer: "A book",
        options: ["A sign", "A book", "A letter", "A poster"],
        correctIndex: 1,
    },
];

const MATH_CHALLENGES = [
    {
        question: "What is 15% of 200?",
        answer: "30",
        options: ["20", "25", "30", "35"],
        correctIndex: 2,
    },
    {
        question: "If x + 7 = 15, what is x?",
        answer: "8",
        options: ["6", "7", "8", "9"],
        correctIndex: 2,
    },
    {
        question: "What is the area of a rectangle with length 8 and width 5?",
        answer: "40",
        options: ["26", "40", "35", "13"],
        correctIndex: 1,
    },
    {
        question: "What is 3² + 4²?",
        answer: "25",
        options: ["12", "25", "49", "7"],
        correctIndex: 1,
    },
    {
        question: "What is the next number in the series: 2, 6, 18, 54, ...?",
        answer: "162",
        options: ["108", "162", "72", "216"],
        correctIndex: 1,
    },
    {
        question: "If a triangle has angles of 60° and 70°, what is the third angle?",
        answer: "50°",
        options: ["40°", "50°", "60°", "80°"],
        correctIndex: 1,
    },
    {
        question: "What is the value of √144?",
        answer: "12",
        options: ["11", "12", "13", "14"],
        correctIndex: 1,
    },
    {
        question: "What is 7 × 8?",
        answer: "56",
        options: ["48", "54", "56", "64"],
        correctIndex: 2,
    },
    {
        question: "If 2x = 18, what is x?",
        answer: "9",
        options: ["7", "8", "9", "10"],
        correctIndex: 2,
    },
    {
        question: "What is 1/4 + 1/4?",
        answer: "1/2",
        options: ["1/8", "1/4", "1/2", "2/4"],
        correctIndex: 2,
    },
    {
        question: "A circle has a radius of 7 cm. What is its diameter?",
        answer: "14 cm",
        options: ["7 cm", "14 cm", "21 cm", "49 cm"],
        correctIndex: 1,
    },
    {
        question: "What is 25% of 80?",
        answer: "20",
        options: ["15", "20", "25", "40"],
        correctIndex: 1,
    },
    {
        question: "What is the perimeter of a square with side 9 cm?",
        answer: "36 cm",
        options: ["18 cm", "27 cm", "36 cm", "81 cm"],
        correctIndex: 2,
    },
    {
        question: "What is 5! (5 factorial)?",
        answer: "120",
        options: ["60", "100", "120", "150"],
        correctIndex: 2,
    },
    {
        question: "What is the average of 10, 20, and 30?",
        answer: "20",
        options: ["15", "20", "25", "30"],
        correctIndex: 1,
    },
    {
        question: "If a = 3 and b = 4, what is a² + b²?",
        answer: "25",
        options: ["7", "12", "24", "25"],
        correctIndex: 3,
    },
    {
        question: "What is 0.5 × 0.5?",
        answer: "0.25",
        options: ["0.1", "0.25", "0.5", "1.0"],
        correctIndex: 1,
    },
    {
        question: "How many degrees are in a straight angle?",
        answer: "180°",
        options: ["90°", "180°", "270°", "360°"],
        correctIndex: 1,
    },
    {
        question: "What is the next prime number after 13?",
        answer: "17",
        options: ["14", "15", "16", "17"],
        correctIndex: 3,
    },
    {
        question: "If you buy 3 items at ₹45 each, what is the total cost?",
        answer: "₹135",
        options: ["₹90", "₹120", "₹135", "₹150"],
        correctIndex: 2,
    },
    {
        question: "What is the value of 2⁵?",
        answer: "32",
        options: ["16", "25", "32", "64"],
        correctIndex: 2,
    },
    {
        question: "How many faces does a cube have?",
        answer: "6",
        options: ["4", "6", "8", "12"],
        correctIndex: 1,
    },
    {
        question: "What is 3/5 as a percentage?",
        answer: "60%",
        options: ["35%", "50%", "60%", "75%"],
        correctIndex: 2,
    },
    {
        question: "What is the LCM of 4 and 6?",
        answer: "12",
        options: ["6", "8", "12", "24"],
        correctIndex: 2,
    },
    {
        question: "A train travels 120 km in 2 hours. What is its speed?",
        answer: "60 km/h",
        options: ["40 km/h", "50 km/h", "60 km/h", "80 km/h"],
        correctIndex: 2,
    },
    {
        question: "What is the HCF of 12 and 18?",
        answer: "6",
        options: ["2", "3", "6", "9"],
        correctIndex: 2,
    },
    {
        question: "What is (-3) × (-4)?",
        answer: "12",
        options: ["-12", "-7", "7", "12"],
        correctIndex: 3,
    },
    {
        question: "What fraction is equivalent to 0.75?",
        answer: "3/4",
        options: ["1/2", "2/3", "3/4", "4/5"],
        correctIndex: 2,
    },
    {
        question: "If the circumference of a circle is 44 cm, what is the radius? (π ≈ 22/7)",
        answer: "7 cm",
        options: ["7 cm", "11 cm", "14 cm", "22 cm"],
        correctIndex: 0,
    },
    {
        question: "What is the sum of the first 10 natural numbers?",
        answer: "55",
        options: ["45", "50", "55", "100"],
        correctIndex: 2,
    },
    {
        question: "What is 10³?",
        answer: "1000",
        options: ["100", "300", "1000", "10000"],
        correctIndex: 2,
    },
];

const LEGENDARY_REWARDS = [
    { title: "Scholar's Crown", description: "You've been chosen as today's Scholar! A rare honor bestowed upon dedicated learners.", bonusXP: 100 },
    { title: "Knowledge Nexus", description: "The Nexus recognizes your dedication. Your learning journey has unlocked a legendary milestone.", bonusXP: 150 },
    { title: "Infinite Curiosity", description: "Your curiosity knows no bounds. This legendary reward celebrates the learner within you.", bonusXP: 200 },
];

// ─── Helper: Get today's date string in IST ────────────────────────────

function getTodayIST(): string {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset + (now.getTimezoneOffset() * 60 * 1000));
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const day = String(istDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ─── Random Helpers ────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Deterministic date-seeded picker: uses the day of the month (1-31)
 * plus a category-specific offset to select an item from the array.
 * Since all content arrays have 31+ items, no content repeats within
 * a calendar month. The offset ensures that different categories
 * (quotes, facts, teasers, math) don't correlate to the same index.
 */
function pickByDate<T>(arr: T[], categoryOffset: number = 0): T {
    const today = getTodayIST();
    const day = parseInt(today.split('-')[2], 10); // 1-31
    const month = parseInt(today.split('-')[1], 10);
    // Combine day + month-based shift so the same day in different months picks differently
    const index = (day - 1 + categoryOffset + (month * 7)) % arr.length;
    return arr[index];
}
// ─── Core: Roll a Reward ───────────────────────────────────────────────

export function rollReward(): RewardData {
    // Weighted random selection
    const totalWeight = REWARD_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType: RewardType = 'motivation';

    for (const entry of REWARD_WEIGHTS) {
        random -= entry.weight;
        if (random <= 0) {
            selectedType = entry.type;
            break;
        }
    }

    return generateRewardData(selectedType);
}

function generateRewardData(type: RewardType): RewardData {
    switch (type) {
        case 'motivation': {
            const quote = pickByDate(MOTIVATIONAL_QUOTES, 0);
            return {
                type: 'motivation',
                title: 'Daily Motivation',
                description: 'Start your day with inspiration',
                content: `"${quote.text}" — ${quote.author}`,
                xp: 5,
                coins: 0,
                icon: 'lightbulb',
                rarity: 'common',
            };
        }

        case 'fact': {
            const fact = pickByDate(DAILY_FACTS, 5);
            return {
                type: 'fact',
                title: `Daily Fact — ${fact.category}`,
                description: 'Expand your knowledge',
                content: fact.text,
                xp: 5,
                coins: 0,
                icon: 'microscope',
                rarity: 'common',
            };
        }

        case 'brain_teaser': {
            const teaser = pickByDate(BRAIN_TEASERS, 11);
            return {
                type: 'brain_teaser',
                title: 'Brain Teaser',
                description: 'Solve this puzzle for bonus XP!',
                content: teaser.question,
                xp: 15,
                coins: 0,
                icon: 'puzzle',
                rarity: 'uncommon',
                answer: teaser.answer,
                options: teaser.options,
                correctIndex: teaser.correctIndex,
            };
        }

        case 'math_challenge': {
            const challenge = pickByDate(MATH_CHALLENGES, 17);
            return {
                type: 'math_challenge',
                title: 'Math Challenge',
                description: 'Test your math skills!',
                content: challenge.question,
                xp: 15,
                coins: 0,
                icon: 'calculator',
                rarity: 'uncommon',
                answer: challenge.answer,
                options: challenge.options,
                correctIndex: challenge.correctIndex,
            };
        }

        case 'bonus_xp': {
            const amounts = [10, 20, 30];
            const weights = [0.5, 0.35, 0.15];
            const r = Math.random();
            let cumulative = 0;
            let amount = amounts[0];
            for (let i = 0; i < amounts.length; i++) {
                cumulative += weights[i];
                if (r < cumulative) { amount = amounts[i]; break; }
            }
            return {
                type: 'bonus_xp',
                title: 'Bonus XP',
                description: `You earned ${amount} bonus XP!`,
                content: `+${amount} XP`,
                xp: amount,
                coins: 0,
                icon: 'star',
                rarity: amount >= 30 ? 'rare' : 'uncommon',
            };
        }

        case 'xp_boost': {
            return {
                type: 'xp_boost',
                title: '2X XP Boost',
                description: 'Double your XP for the next 30 minutes!',
                content: '2X XP for 30 minutes',
                xp: 10,
                coins: 0,
                icon: 'zap',
                rarity: 'rare',
                boostMultiplier: 2,
                boostDurationMinutes: 30,
            };
        }

        case 'streak_protection': {
            return {
                type: 'streak_protection',
                title: 'Streak Shield',
                description: 'Protects your streak if you miss one day.',
                content: 'Your streak is now protected for one missed day.',
                xp: 5,
                coins: 0,
                icon: 'shield',
                rarity: 'rare',
            };
        }

        case 'challenge_ticket': {
            return {
                type: 'challenge_ticket',
                title: 'Challenge Ticket',
                description: 'Unlock a special challenge!',
                content: 'You can use this ticket to access an exclusive challenge.',
                xp: 5,
                coins: 0,
                icon: 'ticket',
                rarity: 'epic',
            };
        }

        case 'premium_trial': {
            return {
                type: 'premium_trial',
                title: '24h Premium Trial',
                description: 'Enjoy all premium features for 24 hours!',
                content: 'Premium access has been activated for the next 24 hours. Enjoy bubble themes, profile frames, detailed analytics & more!',
                xp: 10,
                coins: 0,
                icon: 'crown',
                rarity: 'epic',
            };
        }

        case 'legendary': {
            const legendary = pickRandom(LEGENDARY_REWARDS);
            return {
                type: 'legendary',
                title: legendary.title,
                description: legendary.description,
                content: legendary.description,
                xp: legendary.bonusXP,
                coins: 0,
                icon: 'sparkles',
                rarity: 'legendary',
            };
        }

        default:
            return generateRewardData('motivation');
    }
}

// ─── Firestore Operations ──────────────────────────────────────────────

/**
 * Check if the user has already claimed today's reward.
 * Uses localStorage first (fast), then falls back to Firestore.
 */
export async function hasClaimedToday(userId: string): Promise<boolean> {
    const today = getTodayIST();

    // Fast path: check localStorage
    if (typeof window !== 'undefined') {
        const lastClaim = localStorage.getItem(`quizy_lastRewardClaimDate_${userId}`);
        if (lastClaim === today) return true;
    }

    // Slow path: check Firestore
    try {
        const docId = `${userId}_${today}`;
        const rewardRef = doc(db, COLLECTIONS.DAILY_REWARDS, docId);
        const snap = await getDoc(rewardRef);
        if (snap.exists()) {
            // Sync localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem(`quizy_lastRewardClaimDate_${userId}`, today);
            }
            return true;
        }
    } catch (error) {
        console.error('[DailyReward] Error checking claim status:', error);
    }

    return false;
}

/**
 * Claim today's reward — persist to Firestore and update localStorage.
 */
export async function claimDailyReward(
    userId: string,
    reward: RewardData
): Promise<void> {
    const today = getTodayIST();
    const docId = `${userId}_${today}`;

    const rewardDoc: DailyRewardDoc = {
        userId,
        date: today,
        rewardType: reward.type,
        rewardData: reward,
        claimedAt: new Date(),
        xpAwarded: reward.xp,
        coinsAwarded: reward.coins,
    };

    // Write to Firestore
    await setDoc(doc(db, COLLECTIONS.DAILY_REWARDS, docId), rewardDoc);

    // Award XP if applicable
    if (reward.xp > 0) {
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
            xp: increment(reward.xp),
        });
    }

    // Handle special reward types
    if (reward.type === 'premium_trial') {
        await activatePremiumTrial(userId, 24);
    }
    if (reward.type === 'streak_protection') {
        await addStreakShields(userId, 1);
    }

    // Update localStorage
    if (typeof window !== 'undefined') {
        localStorage.setItem(`quizy_lastRewardClaimDate_${userId}`, today);
    }
}

/**
 * Get the user's reward history (last N days).
 */
export async function getRewardHistory(userId: string, limit = 7): Promise<DailyRewardDoc[]> {
    try {
        const q = query(
            collection(db, COLLECTIONS.DAILY_REWARDS),
            where('userId', '==', userId)
        );
        const snap = await getDocs(q);
        const rewards: DailyRewardDoc[] = [];
        snap.forEach((d) => {
            const data = d.data();
            rewards.push({
                ...data,
                claimedAt: data.claimedAt?.toDate?.() || new Date(data.claimedAt),
            } as DailyRewardDoc);
        });
        // Sort by date descending and limit
        rewards.sort((a, b) => b.date.localeCompare(a.date));
        return rewards.slice(0, limit);
    } catch (error) {
        console.error('[DailyReward] Error fetching history:', error);
        return [];
    }
}
