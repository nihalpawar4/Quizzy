export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
            {/* Sidebar skeleton */}
            <div className="hidden lg:block w-[260px] flex-shrink-0 bg-white/60 dark:bg-gray-950/60 border-r border-gray-200/40 dark:border-gray-800/40">
                <div className="p-5 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                        <div className="h-5 w-20 rounded-lg bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                                <div className="h-4 rounded-lg bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" style={{ width: `${70 + i * 10}px` }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main content skeleton */}
            <div className="flex-1 p-4 lg:p-6">
                {/* Top bar skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <div className="h-7 w-48 rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                    <div className="flex gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                        <div className="w-10 h-10 rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                        <div className="w-9 h-9 rounded-full bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                    </div>
                </div>

                {/* Stats row skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 animate-pulse" />
                    ))}
                </div>

                {/* Cards skeleton */}
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}
