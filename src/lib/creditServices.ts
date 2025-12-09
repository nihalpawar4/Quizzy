/**
 * Credit Economy Services
 * All credit/coin-related operations for the gamified economy
 */

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch,
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './constants';
import type {
    CreditWallet,
    CreditTransaction,
    TransactionType,
    UserBadge,
    BadgeType,
    PremiumTest,
    User
} from '@/types';
import { CREDIT_CONSTANTS } from '@/types';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get current Monday's date string (start of the week)
 */
export function getCurrentWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

/**
 * Get next Monday's date
 */
export function getNextMondayDate(): Date {
    const now = new Date();
    const day = now.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday;
}

/**
 * Check if it's time for weekly reset (Monday 00:00)
 */
export function shouldResetWeekly(wallet: CreditWallet): boolean {
    const currentWeekStart = getCurrentWeekStart();
    return wallet.weekStartDate !== currentWeekStart;
}

/**
 * Check if student should get weekly allowance
 */
export function shouldGiveAllowance(wallet: CreditWallet): boolean {
    const currentWeekStart = getCurrentWeekStart();
    return wallet.lastAllowanceDate !== currentWeekStart;
}

// ==================== WALLET OPERATIONS ====================

/**
 * Get or create a wallet for a student
 */
export async function getOrCreateWallet(user: User): Promise<CreditWallet> {
    if (user.role !== 'student') {
        throw new Error('Only students can have wallets');
    }

    const walletRef = doc(db, COLLECTIONS.WALLETS, user.uid);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
        const data = walletSnap.data();
        let wallet: CreditWallet = {
            id: walletSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            glowUnlockedUntil: data.glowUnlockedUntil?.toDate() || undefined
        } as CreditWallet;

        // Check for weekly reset
        if (shouldResetWeekly(wallet)) {
            wallet = await performWeeklyReset(wallet);
        }

        // Check for weekly allowance
        if (shouldGiveAllowance(wallet)) {
            wallet = await giveWeeklyAllowance(wallet);
        }

        return wallet;
    }

    // Create new wallet
    const currentWeekStart = getCurrentWeekStart();
    const newWallet: Omit<CreditWallet, 'id'> = {
        studentId: user.uid,
        studentName: user.name,
        studentClass: user.studentClass || 0,
        balance: CREDIT_CONSTANTS.WEEKLY_ALLOWANCE,
        weeklySpent: 0,
        weekStartDate: currentWeekStart,
        lastAllowanceDate: currentWeekStart,
        hasGlowStatus: false,
        totalEarned: CREDIT_CONSTANTS.WEEKLY_ALLOWANCE,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // Use setDoc with merge to prevent race conditions
    await setDoc(walletRef, {
        ...newWallet,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    }, { merge: true });

    // Check if welcome bonus transaction already exists before creating
    const existingTxQuery = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('studentId', '==', user.uid),
        where('type', '==', 'allowance'),
        where('description', '==', 'Welcome bonus! Your first weekly allowance.'),
        limit(1)
    );
    const existingTx = await getDocs(existingTxQuery);

    // Only record initial allowance if no welcome bonus exists
    if (existingTx.empty) {
        await recordTransaction({
            studentId: user.uid,
            studentName: user.name,
            type: 'allowance',
            amount: CREDIT_CONSTANTS.WEEKLY_ALLOWANCE,
            balance: CREDIT_CONSTANTS.WEEKLY_ALLOWANCE,
            description: 'Welcome bonus! Your first weekly allowance.',
            countsForReward: false
        });
    }

    return { id: user.uid, ...newWallet };
}

/**
 * Get wallet by student ID
 */
export async function getWalletByStudentId(studentId: string): Promise<CreditWallet | null> {
    const walletRef = doc(db, COLLECTIONS.WALLETS, studentId);
    const walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) return null;

    const data = walletSnap.data();
    return {
        id: walletSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        glowUnlockedUntil: data.glowUnlockedUntil?.toDate() || undefined
    } as CreditWallet;
}

/**
 * Get all wallets (for teacher dashboard)
 */
export async function getAllWallets(): Promise<CreditWallet[]> {
    const walletsRef = collection(db, COLLECTIONS.WALLETS);
    const q = query(walletsRef, orderBy('studentName', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            glowUnlockedUntil: data.glowUnlockedUntil?.toDate() || undefined
        } as CreditWallet;
    });
}

/**
 * Perform weekly reset for a wallet
 */
async function performWeeklyReset(wallet: CreditWallet): Promise<CreditWallet> {
    const currentWeekStart = getCurrentWeekStart();
    const nextMonday = getNextMondayDate();

    // Check if student earned glow status last week
    const earnedGlow = wallet.weeklySpent >= CREDIT_CONSTANTS.GLOW_THRESHOLD;

    const updates: Partial<CreditWallet> = {
        weeklySpent: 0,
        weekStartDate: currentWeekStart,
        hasGlowStatus: earnedGlow,
        glowUnlockedUntil: earnedGlow ? nextMonday : undefined,
        updatedAt: new Date()
    };

    const walletRef = doc(db, COLLECTIONS.WALLETS, wallet.id);
    await updateDoc(walletRef, {
        ...updates,
        updatedAt: Timestamp.now(),
        glowUnlockedUntil: earnedGlow ? Timestamp.fromDate(nextMonday) : null
    });

    // Award weekly champion badge if they spent enough
    if (earnedGlow) {
        await awardBadge(wallet.studentId, wallet.studentName, 'weekly_champion',
            '🏆 Weekly Champion - You spent over 40 coins and earned glow status!');
    }

    return { ...wallet, ...updates };
}

/**
 * Give weekly allowance to a student
 */
async function giveWeeklyAllowance(wallet: CreditWallet): Promise<CreditWallet> {
    const currentWeekStart = getCurrentWeekStart();
    const newBalance = wallet.balance + CREDIT_CONSTANTS.WEEKLY_ALLOWANCE;

    const walletRef = doc(db, COLLECTIONS.WALLETS, wallet.id);
    await updateDoc(walletRef, {
        balance: newBalance,
        lastAllowanceDate: currentWeekStart,
        totalEarned: wallet.totalEarned + CREDIT_CONSTANTS.WEEKLY_ALLOWANCE,
        updatedAt: Timestamp.now()
    });

    // Record transaction
    await recordTransaction({
        studentId: wallet.studentId,
        studentName: wallet.studentName,
        type: 'allowance',
        amount: CREDIT_CONSTANTS.WEEKLY_ALLOWANCE,
        balance: newBalance,
        description: 'Weekly allowance received! 🎉',
        countsForReward: false
    });

    return {
        ...wallet,
        balance: newBalance,
        lastAllowanceDate: currentWeekStart,
        totalEarned: wallet.totalEarned + CREDIT_CONSTANTS.WEEKLY_ALLOWANCE
    };
}

/**
 * Deduct coins for a test attempt
 */
export async function deductCoinsForTest(
    studentId: string,
    studentName: string,
    testId: string,
    testTitle: string,
    coinCost: number,
    isPremiumTest: boolean = false
): Promise<{ success: boolean; newBalance: number; message: string }> {
    const wallet = await getWalletByStudentId(studentId);

    if (!wallet) {
        return { success: false, newBalance: 0, message: 'Wallet not found. Please refresh the page.' };
    }

    if (wallet.balance < coinCost) {
        return {
            success: false,
            newBalance: wallet.balance,
            message: `Insufficient coins! You need ${coinCost} coins but have ${wallet.balance}.`
        };
    }

    const newBalance = wallet.balance - coinCost;
    const newWeeklySpent = wallet.weeklySpent + (isPremiumTest ? 0 : coinCost); // Premium tests don't count for rewards

    const walletRef = doc(db, COLLECTIONS.WALLETS, studentId);
    await updateDoc(walletRef, {
        balance: newBalance,
        weeklySpent: newWeeklySpent,
        totalSpent: wallet.totalSpent + coinCost,
        updatedAt: Timestamp.now()
    });

    // Record transaction
    await recordTransaction({
        studentId,
        studentName,
        type: isPremiumTest ? 'premium_test' : 'test_attempt',
        amount: -coinCost,
        balance: newBalance,
        description: `${isPremiumTest ? 'Premium test' : 'Test'}: ${testTitle}`,
        testId,
        testTitle,
        countsForReward: !isPremiumTest
    });

    // Check if student just crossed the glow threshold
    if (!isPremiumTest && newWeeklySpent >= CREDIT_CONSTANTS.GLOW_THRESHOLD &&
        wallet.weeklySpent < CREDIT_CONSTANTS.GLOW_THRESHOLD) {
        // They just crossed the threshold - they'll get glow next week!
    }

    return {
        success: true,
        newBalance,
        message: `${coinCost} coins deducted. New balance: ${newBalance} coins.`
    };
}

/**
 * Grant bonus coins to a student (teacher action)
 */
export async function grantBonusCoins(
    studentId: string,
    amount: number,
    reason: string,
    teacherId: string,
    teacherName: string
): Promise<{ success: boolean; newBalance: number; message: string }> {
    const wallet = await getWalletByStudentId(studentId);

    if (!wallet) {
        return { success: false, newBalance: 0, message: 'Student wallet not found.' };
    }

    const newBalance = wallet.balance + amount;

    const walletRef = doc(db, COLLECTIONS.WALLETS, studentId);
    await updateDoc(walletRef, {
        balance: newBalance,
        totalEarned: wallet.totalEarned + amount,
        updatedAt: Timestamp.now()
    });

    // Record transaction
    await recordTransaction({
        studentId,
        studentName: wallet.studentName,
        type: 'bonus',
        amount,
        balance: newBalance,
        description: `Bonus from ${teacherName}: ${reason}`,
        awardedBy: teacherId,
        awardedByName: teacherName,
        countsForReward: false
    });

    return {
        success: true,
        newBalance,
        message: `Successfully granted ${amount} coins to ${wallet.studentName}!`
    };
}

// ==================== TRANSACTION OPERATIONS ====================

/**
 * Record a transaction
 */
async function recordTransaction(transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): Promise<string> {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const docRef = await addDoc(transactionsRef, {
        ...transaction,
        createdAt: Timestamp.now()
    });
    return docRef.id;
}

/**
 * Get transactions for a student
 */
export async function getStudentTransactions(studentId: string, limitCount: number = 50): Promise<CreditTransaction[]> {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(
        transactionsRef,
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as CreditTransaction[];
}

/**
 * Get all transactions (for teacher dashboard)
 */
export async function getAllTransactions(limitCount: number = 100): Promise<CreditTransaction[]> {
    const transactionsRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as CreditTransaction[];
}

// ==================== BADGE OPERATIONS ====================

/**
 * Award a badge to a student
 */
export async function awardBadge(
    studentId: string,
    studentName: string,
    badgeType: BadgeType,
    reason?: string,
    teacherId?: string,
    teacherName?: string
): Promise<string> {
    const badgeInfo = getBadgeInfo(badgeType);
    const currentWeekStart = getCurrentWeekStart();

    const userBadgesRef = collection(db, COLLECTIONS.USER_BADGES);

    // Check if badge was already earned this week (for weekly badges)
    if (badgeType === 'weekly_champion') {
        const existingQuery = query(
            userBadgesRef,
            where('studentId', '==', studentId),
            where('badgeType', '==', badgeType),
            where('weekEarned', '==', currentWeekStart)
        );
        const existing = await getDocs(existingQuery);
        if (!existing.empty) {
            return existing.docs[0].id; // Already has this badge this week
        }
    }

    const docRef = await addDoc(userBadgesRef, {
        studentId,
        studentName,
        badgeType,
        badgeName: badgeInfo.name,
        badgeIcon: badgeInfo.icon,
        badgeColor: badgeInfo.color,
        badgeRarity: badgeInfo.rarity,
        awardedBy: teacherId || null,
        awardedByName: teacherName || null,
        awardReason: reason || badgeInfo.description,
        earnedAt: Timestamp.now(),
        weekEarned: currentWeekStart
    });

    return docRef.id;
}

/**
 * Get badge info by type
 */
function getBadgeInfo(type: BadgeType): { name: string; icon: string; color: string; rarity: 'common' | 'rare' | 'epic' | 'legendary'; description: string } {
    const badges: Record<BadgeType, { name: string; icon: string; color: string; rarity: 'common' | 'rare' | 'epic' | 'legendary'; description: string }> = {
        weekly_champion: {
            name: 'Weekly Champion',
            icon: '🏆',
            color: 'from-yellow-400 to-amber-500',
            rarity: 'rare',
            description: 'Spent 40+ coins in a week and earned glow status!'
        },
        perfect_score: {
            name: 'Perfect Score',
            icon: '💯',
            color: 'from-green-400 to-emerald-500',
            rarity: 'epic',
            description: 'Achieved 100% on a test!'
        },
        streak_master: {
            name: 'Streak Master',
            icon: '🔥',
            color: 'from-orange-400 to-red-500',
            rarity: 'rare',
            description: 'Maintained a 7+ day streak!'
        },
        speed_demon: {
            name: 'Speed Demon',
            icon: '⚡',
            color: 'from-blue-400 to-indigo-500',
            rarity: 'epic',
            description: 'Completed a test in under 5 minutes with 80%+ score!'
        },
        consistency_king: {
            name: 'Consistency King',
            icon: '👑',
            color: 'from-purple-400 to-violet-500',
            rarity: 'legendary',
            description: 'Completed tests for 3 weeks in a row!'
        },
        top_performer: {
            name: 'Top Performer',
            icon: '⭐',
            color: 'from-pink-400 to-rose-500',
            rarity: 'legendary',
            description: 'Ranked #1 in class leaderboard!'
        },
        rising_star: {
            name: 'Rising Star',
            icon: '🌟',
            color: 'from-cyan-400 to-teal-500',
            rarity: 'rare',
            description: 'Improved score by 20%+ from last test!'
        },
        knowledge_seeker: {
            name: 'Knowledge Seeker',
            icon: '📚',
            color: 'from-indigo-400 to-blue-500',
            rarity: 'common',
            description: 'Read all study notes in a week!'
        },
        custom: {
            name: 'Special Achievement',
            icon: '🎖️',
            color: 'from-gray-400 to-slate-500',
            rarity: 'rare',
            description: 'Special recognition from teacher!'
        }
    };
    return badges[type];
}

/**
 * Get all badges for a student
 */
export async function getStudentBadges(studentId: string): Promise<UserBadge[]> {
    const badgesRef = collection(db, COLLECTIONS.USER_BADGES);
    const q = query(
        badgesRef,
        where('studentId', '==', studentId),
        orderBy('earnedAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        earnedAt: doc.data().earnedAt?.toDate() || new Date()
    })) as UserBadge[];
}

/**
 * Award custom badge (teacher action)
 */
export async function awardCustomBadge(
    studentId: string,
    studentName: string,
    badgeName: string,
    badgeIcon: string,
    reason: string,
    teacherId: string,
    teacherName: string
): Promise<string> {
    const currentWeekStart = getCurrentWeekStart();

    const userBadgesRef = collection(db, COLLECTIONS.USER_BADGES);
    const docRef = await addDoc(userBadgesRef, {
        studentId,
        studentName,
        badgeType: 'custom',
        badgeName,
        badgeIcon,
        badgeColor: 'from-indigo-400 to-purple-500',
        badgeRarity: 'rare',
        awardedBy: teacherId,
        awardedByName: teacherName,
        awardReason: reason,
        earnedAt: Timestamp.now(),
        weekEarned: currentWeekStart
    });

    return docRef.id;
}

// ==================== PREMIUM TEST OPERATIONS ====================

/**
 * Create a premium test
 */
export async function createPremiumTest(test: Omit<PremiumTest, 'id' | 'createdAt' | 'totalAttempts'>): Promise<string> {
    const testsRef = collection(db, COLLECTIONS.PREMIUM_TESTS);
    const docRef = await addDoc(testsRef, {
        ...test,
        totalAttempts: 0,
        createdAt: Timestamp.now()
    });
    return docRef.id;
}

/**
 * Get premium tests by class
 */
export async function getPremiumTestsByClass(studentClass: number): Promise<PremiumTest[]> {
    const testsRef = collection(db, COLLECTIONS.PREMIUM_TESTS);
    const q = query(
        testsRef,
        where('targetClass', '==', studentClass),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as PremiumTest[];
}

/**
 * Get all premium tests (for teacher dashboard)
 */
export async function getAllPremiumTests(): Promise<PremiumTest[]> {
    const testsRef = collection(db, COLLECTIONS.PREMIUM_TESTS);
    const q = query(testsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as PremiumTest[];
}

/**
 * Update premium test
 */
export async function updatePremiumTest(testId: string, updates: Partial<PremiumTest>): Promise<void> {
    const testRef = doc(db, COLLECTIONS.PREMIUM_TESTS, testId);
    await updateDoc(testRef, updates);
}

/**
 * Delete premium test
 */
export async function deletePremiumTest(testId: string): Promise<void> {
    const testRef = doc(db, COLLECTIONS.PREMIUM_TESTS, testId);
    await deleteDoc(testRef);
}

/**
 * Increment premium test attempts
 */
export async function incrementPremiumTestAttempts(testId: string): Promise<void> {
    const testRef = doc(db, COLLECTIONS.PREMIUM_TESTS, testId);
    const testSnap = await getDoc(testRef);

    if (testSnap.exists()) {
        const currentAttempts = testSnap.data().totalAttempts || 0;
        await updateDoc(testRef, {
            totalAttempts: currentAttempts + 1
        });
    }
}

/**
 * Get premium test by ID
 */
export async function getPremiumTestById(testId: string): Promise<PremiumTest | null> {
    const testRef = doc(db, COLLECTIONS.PREMIUM_TESTS, testId);
    const testSnap = await getDoc(testRef);

    if (!testSnap.exists()) return null;

    const data = testSnap.data();
    return {
        id: testSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
    } as PremiumTest;
}

// ==================== CHECK FUNCTIONS ====================

/**
 * Check if student can afford a test
 */
export async function canAffordTest(studentId: string, coinCost: number): Promise<boolean> {
    const wallet = await getWalletByStudentId(studentId);
    return wallet !== null && wallet.balance >= coinCost;
}

/**
 * Check if student has glow status
 */
export async function hasGlowStatus(studentId: string): Promise<boolean> {
    const wallet = await getWalletByStudentId(studentId);
    if (!wallet) return false;

    if (wallet.glowUnlockedUntil) {
        return new Date() < wallet.glowUnlockedUntil;
    }

    return wallet.hasGlowStatus;
}

/**
 * Get student's progress toward glow status
 */
export async function getGlowProgress(studentId: string): Promise<{ spent: number; threshold: number; percentage: number; hasGlow: boolean }> {
    const wallet = await getWalletByStudentId(studentId);

    if (!wallet) {
        return { spent: 0, threshold: CREDIT_CONSTANTS.GLOW_THRESHOLD, percentage: 0, hasGlow: false };
    }

    const percentage = Math.min(100, Math.round((wallet.weeklySpent / CREDIT_CONSTANTS.GLOW_THRESHOLD) * 100));
    const hasGlow = wallet.hasGlowStatus || (wallet.glowUnlockedUntil ? new Date() < wallet.glowUnlockedUntil : false);

    return {
        spent: wallet.weeklySpent,
        threshold: CREDIT_CONSTANTS.GLOW_THRESHOLD,
        percentage,
        hasGlow
    };
}

// ==================== APP SETTINGS ====================

export interface AppSettings {
    creditEconomyEnabled: boolean;
    updatedAt: Date;
    updatedBy?: string;
}

/**
 * Get app settings
 */
export async function getAppSettings(): Promise<AppSettings> {
    const settingsRef = doc(db, COLLECTIONS.APP_SETTINGS, 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
        // Create default settings
        const defaultSettings: AppSettings = {
            creditEconomyEnabled: true, // Enabled by default
            updatedAt: new Date()
        };
        await setDoc(settingsRef, {
            ...defaultSettings,
            updatedAt: Timestamp.now()
        });
        return defaultSettings;
    }

    const data = settingsSnap.data();
    return {
        creditEconomyEnabled: data.creditEconomyEnabled ?? true,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        updatedBy: data.updatedBy
    };
}

/**
 * Toggle credit economy feature
 */
export async function toggleCreditEconomy(enabled: boolean, teacherId?: string): Promise<void> {
    const settingsRef = doc(db, COLLECTIONS.APP_SETTINGS, 'main');
    await setDoc(settingsRef, {
        creditEconomyEnabled: enabled,
        updatedAt: Timestamp.now(),
        updatedBy: teacherId || null
    }, { merge: true });
}

// ==================== TRANSACTION MANAGEMENT ====================

/**
 * Delete a single transaction
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
    const txRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
    await deleteDoc(txRef);
}

/**
 * Delete all transactions for a student
 */
export async function deleteAllStudentTransactions(studentId: string): Promise<number> {
    const txQuery = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(txQuery);

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    return snapshot.size;
}

/**
 * Delete all transactions (global clear)
 */
export async function deleteAllTransactions(): Promise<number> {
    const txRef = collection(db, COLLECTIONS.TRANSACTIONS);
    const snapshot = await getDocs(txRef);

    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    let deleted = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = snapshot.docs.slice(i, i + batchSize);
        chunk.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        deleted += chunk.length;
    }

    return deleted;
}

/**
 * Delete a student's wallet and all related credit economy data
 */
export async function deleteStudentWalletAndData(studentId: string): Promise<{ wallet: boolean; transactions: number; badges: number }> {
    const result = { wallet: false, transactions: 0, badges: 0 };

    // Delete wallet
    const walletRef = doc(db, COLLECTIONS.WALLETS, studentId);
    const walletSnap = await getDoc(walletRef);
    if (walletSnap.exists()) {
        await deleteDoc(walletRef);
        result.wallet = true;
    }

    // Delete all transactions
    result.transactions = await deleteAllStudentTransactions(studentId);

    // Delete all user badges
    const badgesQuery = query(
        collection(db, COLLECTIONS.USER_BADGES),
        where('userId', '==', studentId)
    );
    const badgesSnapshot = await getDocs(badgesQuery);
    if (badgesSnapshot.size > 0) {
        const batch = writeBatch(db);
        badgesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        result.badges = badgesSnapshot.size;
    }

    return result;
}

/**
 * Get credit economy statistics
 */
export async function getCreditEconomyStats(): Promise<{
    totalWallets: number;
    studentsWithGlow: number;
    totalCoinsSpent: number;
    premiumTestsCount: number;
}> {
    const [walletsSnapshot, premiumTestsSnapshot] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.WALLETS)),
        getDocs(collection(db, COLLECTIONS.PREMIUM_TESTS))
    ]);

    let studentsWithGlow = 0;
    let totalCoinsSpent = 0;

    walletsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.hasGlowStatus || (data.glowUnlockedUntil && data.glowUnlockedUntil.toDate() > new Date())) {
            studentsWithGlow++;
        }
        totalCoinsSpent += data.totalSpent || 0;
    });

    return {
        totalWallets: walletsSnapshot.size,
        studentsWithGlow,
        totalCoinsSpent,
        premiumTestsCount: premiumTestsSnapshot.size
    };
}

export { getBadgeInfo };

