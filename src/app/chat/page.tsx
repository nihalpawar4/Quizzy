'use client';

/**
 * Chat Page — Premium 2026 Messaging Experience
 * Glass sidebar + premium chat window
 * Linear/Arc/Discord inspired
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { ChatList, ChatWindow, NewChatModal } from '@/components/chat';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import MotivationalLoader from '@/components/ui/MotivationalLoader';

export default function ChatPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const {
        chats,
        currentChat,
        messages,
        presenceMap,
        isLoading,
        isSending,
        replyingTo,
        setCurrentChat,
        sendMessage,
        startTyping,
        stopTyping,
        deleteChat,
        clearChatHistory,
        startNewChat,
        pinChat,
        unpinChat,
        setReplyingTo,
        deleteMessage,
        deleteMessageForEveryone,
        getParticipantPresence,
        isUserTyping,
        availableTeachers,
        availableStudents,
        loadAvailableUsers
    } = useChat();

    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0c1025] flex items-center justify-center">
                <MotivationalLoader />
            </div>
        );
    }

    const otherParticipantId = currentChat?.participants.find(id => id !== user.uid);
    const otherParticipantPresence = otherParticipantId ? getParticipantPresence(otherParticipantId) : null;
    const isOtherTyping = otherParticipantId && currentChat
        ? isUserTyping(otherParticipantId, currentChat.id)
        : false;

    const handleStartNewChat = async (participantId: string, participantName: string, participantClass?: number) => {
        try {
            await startNewChat(participantId, participantName, participantClass);
            setShowNewChatModal(false);
        } catch (error) {
            console.error('Error starting new chat:', error);
            alert('Failed to start chat. Please try again.');
        }
    };

    const handleSendMessage = async (text: string, replyTo?: { id: string; text: string; senderName: string }) => {
        try {
            await sendMessage(text, replyTo);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Mobile: Show only chat window when a chat is selected
    if (isMobileView && currentChat) {
        return (
            <div
                className="bg-gray-50 dark:bg-[#0c1025] fixed inset-0 flex flex-col"
                style={{ height: '100dvh' }}
            >
                <ChatWindow
                    chat={currentChat}
                    messages={messages}
                    currentUserId={user.uid}
                    currentUserRole={user.role}
                    presence={otherParticipantPresence}
                    isTyping={isOtherTyping}
                    isSending={isSending}
                    onSendMessage={handleSendMessage}
                    onTyping={startTyping}
                    onStopTyping={stopTyping}
                    onBack={() => setCurrentChat(null)}
                    onClearHistory={() => clearChatHistory(currentChat.id)}
                    replyingTo={replyingTo}
                    onSetReplyingTo={setReplyingTo}
                    onDeleteMessage={deleteMessage}
                    onDeleteMessageForEveryone={deleteMessageForEveryone}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0c1025]">
            <div className="flex h-screen">
                {/* Chat List - Sidebar */}
                <div className={`
                    ${isMobileView ? 'w-full' : 'w-80 lg:w-96'}
                    border-r border-gray-200/60 dark:border-white/5 flex-shrink-0 flex flex-col
                `}>
                    <div className="flex-1 min-h-0">
                        <ChatList
                            chats={chats}
                            currentUserId={user.uid}
                            currentUserRole={user.role}
                            currentChatId={currentChat?.id}
                            presenceMap={presenceMap}
                            onSelectChat={setCurrentChat}
                            onDeleteChat={deleteChat}
                            onNewChat={() => setShowNewChatModal(true)}
                            onPinChat={pinChat}
                            onUnpinChat={unpinChat}
                            isLoading={isLoading}
                        />
                    </div>
                </div>

                {/* Chat Window - Main Area (Desktop) */}
                {!isMobileView && (
                    <div className="flex-1 flex">
                        {currentChat ? (
                            <div className="flex-1">
                                <ChatWindow
                                    chat={currentChat}
                                    messages={messages}
                                    currentUserId={user.uid}
                                    currentUserRole={user.role}
                                    presence={otherParticipantPresence}
                                    isTyping={isOtherTyping}
                                    isSending={isSending}
                                    onSendMessage={handleSendMessage}
                                    onTyping={startTyping}
                                    onStopTyping={stopTyping}
                                    onBack={() => setCurrentChat(null)}
                                    onClearHistory={() => clearChatHistory(currentChat.id)}
                                    replyingTo={replyingTo}
                                    onSetReplyingTo={setReplyingTo}
                                    onDeleteMessage={deleteMessage}
                                    onDeleteMessageForEveryone={deleteMessageForEveryone}
                                />
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0c1025] p-8 text-center">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1650EB]/10 to-[#6095DB]/10 dark:from-[#1650EB]/15 dark:to-blue-500/15 flex items-center justify-center mb-6">
                                    <svg className="w-12 h-12 text-[#6095DB]" viewBox="0 0 48 48" fill="none">
                                        <path d="M8 8h32a4 4 0 014 4v18a4 4 0 01-4 4H18l-10 8V12a4 4 0 014-4z" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" strokeLinejoin="round"/>
                                        <circle cx="18" cy="21" r="2" fill="currentColor" opacity="0.6"/>
                                        <circle cx="24" cy="21" r="2" fill="currentColor" opacity="0.6"/>
                                        <circle cx="30" cy="21" r="2" fill="currentColor" opacity="0.6"/>
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    Your Messages
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                                    Select a conversation from the sidebar to start chatting, or start a new conversation.
                                </p>
                                <button
                                    onClick={() => setShowNewChatModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#1650EB]/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Start New Chat
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
                currentUserRole={user.role}
                availableTeachers={availableTeachers}
                availableStudents={availableStudents}
                presenceMap={presenceMap}
                onStartChat={handleStartNewChat}
                onLoadUsers={loadAvailableUsers}
            />
        </div>
    );
}
