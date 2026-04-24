/**
 * API Route: Send Push Notification via FCM
 * Uses Firebase Admin SDK to send REAL background push notifications
 * These work even when the PWA is closed (like Swiggy/Zomato)
 * By Nihal Pawar
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tokens, title, body: notifBody, data } = body;

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return NextResponse.json(
                { error: 'No tokens provided' },
                { status: 400 }
            );
        }

        if (!title || !notifBody) {
            return NextResponse.json(
                { error: 'Title and body are required' },
                { status: 400 }
            );
        }

        console.log(`[Quizy FCM] Sending push to ${tokens.length} devices`);
        console.log(`[Quizy FCM] Title: ${title}`);
        console.log(`[Quizy FCM] Body: ${notifBody}`);

        // Build the FCM message
        // IMPORTANT: Use `data` only (not `notification`) so the service worker
        // has full control over how the notification is displayed.
        // When `notification` is included, Android auto-displays it and
        // onBackgroundMessage doesn't fire.
        const message = {
            // Use data-only message so our service worker controls the display
            data: {
                title: title,
                body: notifBody,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: data?.tag || 'quizy-homework',
                type: data?.type || 'homework',
                url: data?.url || '/dashboard/student/homework',
                // Timestamp to ensure unique notifications
                timestamp: Date.now().toString(),
            },
        };

        // Send to each token individually to handle failures gracefully
        const results = {
            success: 0,
            failure: 0,
            errors: [] as string[],
        };

        // Use sendEachForMulticast for batch sending
        const multicastMessage = {
            ...message,
            tokens: tokens,
        };

        try {
            const response = await adminMessaging.sendEachForMulticast(multicastMessage);
            results.success = response.successCount;
            results.failure = response.failureCount;

            // Log individual failures
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorMsg = resp.error?.message || 'Unknown error';
                    results.errors.push(`Token ${idx}: ${errorMsg}`);
                    console.error(`[Quizy FCM] Failed for token ${idx}:`, errorMsg);
                }
            });
        } catch (sendError) {
            console.error('[Quizy FCM] Multicast send failed:', sendError);
            
            // Fallback: try sending individually
            for (let i = 0; i < tokens.length; i++) {
                try {
                    await adminMessaging.send({
                        ...message,
                        token: tokens[i],
                    });
                    results.success++;
                } catch (individualError) {
                    results.failure++;
                    const errMsg = individualError instanceof Error ? individualError.message : 'Unknown';
                    results.errors.push(`Token ${i}: ${errMsg}`);
                    console.error(`[Quizy FCM] Individual send failed for token ${i}:`, errMsg);
                }
            }
        }

        console.log(`[Quizy FCM] Results: ${results.success} sent, ${results.failure} failed`);

        return NextResponse.json({
            success: true,
            sent: results.success,
            failed: results.failure,
            errors: results.errors.length > 0 ? results.errors : undefined,
        });

    } catch (error) {
        console.error('[Quizy FCM] API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to send notification', details: errorMessage },
            { status: 500 }
        );
    }
}
