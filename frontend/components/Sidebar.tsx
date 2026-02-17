'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline'

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()

    // Hide sidebar on auth and onboarding pages
    if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding') || pathname === '/login') {
        return null
    }

    const navItems = [
        { name: 'Home', href: '/' },
        { name: 'Food Log', href: '/food-log' },
        { name: 'Analytics', href: '/analytics' },
        { name: 'Profile', href: '/profile' },
    ]

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            router.replace('/login')
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return (
        <aside className="w-64 border-r border-gray-200 bg-green-50/30 hidden md:flex flex-col">
            <div className="h-16 flex items-center px-6 border-b border-gray-200/50">
                <h1 className="text-xl font-bold text-green-600">NutriScope</h1>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                                ? 'bg-green-100 text-green-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-gray-200/50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
                    Logout
                </button>
                <div className="px-4 py-2 mt-2">
                    <p className="text-xs text-center text-gray-400">v0.1.0</p>
                </div>
            </div>
        </aside>
    )
}
