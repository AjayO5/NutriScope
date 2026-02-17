import React from 'react'

export function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <div className="h-8 w-1/4 bg-gray-200 rounded"></div>
                <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Card Skeleton */}
                <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl"></div>
                {/* Side Card Skeleton */}
                <div className="lg:col-span-1 h-64 bg-gray-200 rounded-xl"></div>
            </div>

            {/* Bottom Card Skeleton */}
            <div className="h-40 bg-gray-200 rounded-xl"></div>
        </div>
    )
}

export function ListSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"></div>
            ))}
        </div>
    )
}

export function FormSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-1/3 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i}>
                        <div className="h-4 w-1/4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-10 w-full bg-gray-100 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ErrorState({ message = "Something went wrong. Please refresh." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-red-50 text-red-500 rounded-full p-3 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error</h3>
            <p className="text-gray-500 mb-4">{message}</p>
            <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                Refresh Page
            </button>
        </div>
    )
}
