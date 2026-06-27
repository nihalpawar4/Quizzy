export default function PremiumLoading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
            <div className="w-full max-w-4xl px-4 space-y-6">
                {/* Header skeleton */}
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                    <div className="h-8 w-56 mx-auto rounded-xl bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                    <div className="h-4 w-72 mx-auto rounded-lg bg-gray-200/60 dark:bg-gray-800/60 animate-pulse" />
                </div>

                {/* Tier cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-72 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}
