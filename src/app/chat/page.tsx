'use client';

/**
 * Chat Page - Real-Time Messaging
 * WhatsApp-like chat interface with Quizy theme
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { ChatList, ChatWindow, NewChatModal } from '@/components/chat';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
        setCurrentChat,
        sendMessage,
        startTyping,
        stopTyping,
        deleteChat,
        clearChatHistory,
        startNewChat,
        getParticipantPresence,
        isUserTyping,
        availableTeachers,
        availableStudents,
        loadAvailableUsers
    } = useChat();

    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    // Check for mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    // Loading state
    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-[#1650EB] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Get the other participant ID for current chat
    const otherParticipantId = currentChat?.participants.find(id => id !== user.uid);
    const otherParticipantPresence = otherParticipantId ? getParticipantPresence(otherParticipantId) : null;
    const isOtherTyping = otherParticipantId && currentChat
        ? isUserTyping(otherParticipantId, currentChat.id)
        : false;

    // Handle start new chat
    const handleStartNewChat = async (participantId: string, participantName: string, participantClass?: number) => {
        try {
            await startNewChat(participantId, participantName, participantClass);
            setShowNewChatModal(false);
        } catch (error) {
            console.error('Error starting new chat:', error);
            alert('Failed to start chat. Please try again.');
        }
    };

    // Handle send message wrapper
    const handleSendMessage = async (text: string) => {
        try {
            await sendMessage(text);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // Mobile: Show only chat window when a chat is selected
    if (isMobileView && currentChat) {
        return (
            <div
                className="bg-gray-50 dark:bg-gray-950 fixed inset-0 flex flex-col"
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
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header with Back Button - Mobile */}
            <div className="lg:hidden border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-[#1650EB] to-[#6095DB]">
                <div className="flex items-center gap-3 p-4">
                    <Link
                        href="/dashboard"
                        className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-bold text-white">Messages</h1>
                </div>
            </div>

            <div className="flex h-[calc(100vh-65px)] lg:h-screen">
                {/* Chat List - Sidebar */}
                <div className={`
                    ${isMobileView ? 'w-full' : 'w-80 lg:w-96'}
                    border-r border-gray-200 dark:border-gray-800 flex-shrink-0
                `}>
                    <ChatList
                        chats={chats}
                        currentUserId={user.uid}
                        currentUserRole={user.role}
                        currentChatId={currentChat?.id}
                        presenceMap={presenceMap}
                        onSelectChat={setCurrentChat}
                        onDeleteChat={deleteChat}
                        onNewChat={() => setShowNewChatModal(true)}
                        isLoading={isLoading}
                    />
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
                                />
                            </div>
                        ) : (
                            // Empty state
                            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-8 text-center">
                                <div className="w-24 h-24 rounded-full bg-[#1650EB]/10 flex items-center justify-center mb-6">
                                    <MessageCircle className="w-12 h-12 text-[#1650EB]" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    Your Messages
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                                    Select a conversation from the sidebar to start chatting, or start a new conversation.
                                </p>
                                <button
                                    onClick={() => setShowNewChatModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-[#1650EB] to-[#6095DB] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-[#1650EB]/30 transition-all duration-200"
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
