import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'NutriScope',
    description: 'AI-Powered Nutrition Tracking',
}

import { GoalProvider } from '@/context/GoalContext'
import AuthGuard from '@/components/AuthGuard'

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className="h-full">
            <body className={`${inter.className} flex h-screen overflow-hidden bg-gray-50`}>
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <GoalProvider>
                            <AuthGuard>
                                {children}
                            </AuthGuard>
                        </GoalProvider>
                    </div>
                </main>
            </body>
        </html>
    )
}
