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
            const quote = pickRandom(MOTIVATIONAL_QUOTES);
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
            const fact = pickRandom(DAILY_FACTS);
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
            const teaser = pickRandom(BRAIN_TEASERS);
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
            const challenge = pickRandom(MATH_CHALLENGES);
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
