import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: any) {
                    cookiesToSet.forEach(({ name, value, options }: any) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }: any) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // 1. Not Authenticated
    // if (!user && !path.startsWith('/auth')) {
    //     return NextResponse.redirect(new URL('/login', request.url))
    // }

    // 2. Authenticated
    if (user) {
        // If user is authenticated and tries to access /auth, redirect to home
        // if (path.startsWith('/auth')) {
        //     return NextResponse.redirect(new URL('/', request.url))
        // }

        // Check if profile exists
        // const { data: profile } = await supabase
        //     .from('profiles')
        //     .select('id')
        //     .eq('id', user.id)
        //     .single()

        // if (profile) {
        //     // If profile exists, prevent access to /onboarding
        //     if (path.startsWith('/onboarding')) {
        //         return NextResponse.redirect(new URL('/', request.url))
        //     }
        // } else {
        //     // If profile does NOT exist, force /onboarding
        //     if (!path.startsWith('/onboarding')) {
        //         return NextResponse.redirect(new URL('/onboarding', request.url))
        //     }
        // }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
