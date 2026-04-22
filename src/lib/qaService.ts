/**
 * Q&A Forum Service — Firebase operations
 * Two-collection architecture: pending_questions → approved_questions
 * Answers stored as subcollection: approved_questions/{qId}/answers/{aId}
 */

import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  query, where, orderBy, limit, Timestamp, arrayUnion, arrayRemove,
  increment, setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ==================== TYPES ====================

export interface PendingQuestion {
  id: string;
  description: string;
  tags: string[];
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher' | 'anonymous';
  userClass?: number;
  createdAt: Date;
  status: 'pending';
}

export interface ApprovedQuestion {
  id: string;
  description: string;
  tags: string[];
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher' | 'anonymous';
  userClass?: number;
  createdAt: Date;
  status: 'approved';
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  answerCount: number;
  approvedBy: string;
  approvedAt: Date;
}

export interface Answer {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher' | 'anonymous';
  createdAt: Date;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
}

// ==================== SUBMIT QUESTION ====================

export async function submitQuestion(data: {
  description: string;
  tags: string[];
  userId?: string;
  userName?: string;
  userRole?: 'student' | 'teacher' | 'anonymous';
  userClass?: number;
}): Promise<string> {
  const role = data.userRole || 'anonymous';
  const name = data.userName?.trim() || 'Anonymous';
  const uid = data.userId || 'anon_' + Date.now();

  // Teachers auto-approve; everyone else goes to pending
  if (role === 'teacher' && data.userId) {
    const docRef = await addDoc(collection(db, 'approved_questions'), {
      description: data.description.trim(),
      tags: data.tags,
      userId: uid,
      userName: name,
      userRole: role,
      createdAt: Timestamp.now(),
      status: 'approved',
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      answerCount: 0,
      approvedBy: data.userId,
      approvedAt: Timestamp.now(),
    });
    return docRef.id;
  }

  const docRef = await addDoc(collection(db, 'pending_questions'), {
    description: data.description.trim(),
    tags: data.tags,
    userId: uid,
    userName: name,
    userRole: role,
    ...(data.userClass ? { userClass: data.userClass } : {}),
    createdAt: Timestamp.now(),
    status: 'pending',
  });
  return docRef.id;
}

// Delete an approved question (teacher only)
export async function deleteApprovedQuestion(questionId: string): Promise<void> {
  await deleteDoc(doc(db, 'approved_questions', questionId));
}

// ==================== MODERATION (TEACHER) ====================

export async function getPendingQuestions(): Promise<PendingQuestion[]> {
  const q = query(
    collection(db, 'pending_questions'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || new Date(),
  })) as PendingQuestion[];
}

export async function approveQuestion(
  pendingId: string,
  teacherId: string
): Promise<void> {
  const pendingRef = doc(db, 'pending_questions', pendingId);
  const snap = await getDoc(pendingRef);
  if (!snap.exists()) return;

  const data = snap.data();
  // Move to approved_questions
  await setDoc(doc(db, 'approved_questions', pendingId), {
    ...data,
    status: 'approved',
    likes: 0,
    dislikes: 0,
    likedBy: [],
    dislikedBy: [],
    answerCount: 0,
    approvedBy: teacherId,
    approvedAt: Timestamp.now(),
  });

  // Delete from pending
  await deleteDoc(pendingRef);
}

export async function rejectQuestion(pendingId: string): Promise<void> {
  await deleteDoc(doc(db, 'pending_questions', pendingId));
}

// ==================== APPROVED QUESTIONS (PUBLIC) ====================

export async function getApprovedQuestions(
  pageSize: number = 10
): Promise<ApprovedQuestion[]> {
  const q = query(
    collection(db, 'approved_questions'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || new Date(),
    approvedAt: d.data().approvedAt?.toDate?.() || new Date(),
  })) as ApprovedQuestion[];
}

// ==================== QUESTION VOTES ====================

export async function toggleQuestionLike(questionId: string, userId: string): Promise<void> {
  const ref = doc(db, 'approved_questions', questionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const alreadyLiked = (data.likedBy || []).includes(userId);
  const alreadyDisliked = (data.dislikedBy || []).includes(userId);

  if (alreadyLiked) {
    await updateDoc(ref, { likedBy: arrayRemove(userId), likes: increment(-1) });
  } else {
    const updates: Record<string, unknown> = { likedBy: arrayUnion(userId), likes: increment(1) };
    if (alreadyDisliked) {
      updates.dislikedBy = arrayRemove(userId);
      updates.dislikes = increment(-1);
    }
    await updateDoc(ref, updates);
  }
}

export async function toggleQuestionDislike(questionId: string, userId: string): Promise<void> {
  const ref = doc(db, 'approved_questions', questionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const alreadyDisliked = (data.dislikedBy || []).includes(userId);
  const alreadyLiked = (data.likedBy || []).includes(userId);

  if (alreadyDisliked) {
    await updateDoc(ref, { dislikedBy: arrayRemove(userId), dislikes: increment(-1) });
  } else {
    const updates: Record<string, unknown> = { dislikedBy: arrayUnion(userId), dislikes: increment(1) };
    if (alreadyLiked) {
      updates.likedBy = arrayRemove(userId);
      updates.likes = increment(-1);
    }
    await updateDoc(ref, updates);
  }
}

// ==================== ANSWERS (SUBCOLLECTION) ====================

export async function getAnswers(questionId: string): Promise<Answer[]> {
  const q = query(
    collection(db, 'approved_questions', questionId, 'answers'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() || new Date(),
  })) as Answer[];
}

export async function submitAnswer(data: {
  questionId: string;
  text: string;
  userId?: string;
  userName?: string;
  userRole?: 'student' | 'teacher' | 'anonymous';
}): Promise<string> {
  const name = data.userName?.trim() || 'Anonymous';
  const uid = data.userId || 'anon_' + Date.now();
  const role = data.userRole || 'anonymous';

  const docRef = await addDoc(
    collection(db, 'approved_questions', data.questionId, 'answers'),
    {
      text: data.text.trim(),
      userId: uid,
      userName: name,
      userRole: role,
      createdAt: Timestamp.now(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
    }
  );
  // Increment answer count on the question
  await updateDoc(doc(db, 'approved_questions', data.questionId), {
    answerCount: increment(1),
  });
  return docRef.id;
}

export async function toggleAnswerLike(
  questionId: string, answerId: string, userId: string
): Promise<void> {
  const ref = doc(db, 'approved_questions', questionId, 'answers', answerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const alreadyLiked = (data.likedBy || []).includes(userId);
  const alreadyDisliked = (data.dislikedBy || []).includes(userId);

  if (alreadyLiked) {
    await updateDoc(ref, { likedBy: arrayRemove(userId), likes: increment(-1) });
  } else {
    const updates: Record<string, unknown> = { likedBy: arrayUnion(userId), likes: increment(1) };
    if (alreadyDisliked) {
      updates.dislikedBy = arrayRemove(userId);
      updates.dislikes = increment(-1);
    }
    await updateDoc(ref, updates);
  }
}

export async function toggleAnswerDislike(
  questionId: string, answerId: string, userId: string
): Promise<void> {
  const ref = doc(db, 'approved_questions', questionId, 'answers', answerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const alreadyDisliked = (data.dislikedBy || []).includes(userId);
  const alreadyLiked = (data.likedBy || []).includes(userId);

  if (alreadyDisliked) {
    await updateDoc(ref, { dislikedBy: arrayRemove(userId), dislikes: increment(-1) });
  } else {
    const updates: Record<string, unknown> = { dislikedBy: arrayUnion(userId), dislikes: increment(1) };
    if (alreadyLiked) {
      updates.likedBy = arrayRemove(userId);
      updates.likes = increment(-1);
    }
    await updateDoc(ref, updates);
  }
}
