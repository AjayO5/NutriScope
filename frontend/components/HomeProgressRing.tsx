'use client'

import React from 'react'

interface HomeProgressRingProps {
    label: string
    current: number
    goal: number
    unit: string
    color: 'green' | 'blue' | 'sky'
}

export function HomeProgressRing({ label, current, goal, unit, color }: HomeProgressRingProps) {
    // 1. Calculate Percentage
    // Cap visual progress at 100%
    const safeGoal = goal || 1 // Avoid divide by zero
    const percentage = Math.round((current / safeGoal) * 100)
    const visualPercentage = Math.min(percentage, 100)

    // 2. SVG Configuration
    const radius = 50
    const strokeWidth = 8
    const normalizedRadius = radius - strokeWidth / 2
    const circumference = normalizedRadius * 2 * Math.PI
    const strokeDashoffset = circumference - (visualPercentage / 100) * circumference

    // 3. Color Logic
    const colorMap = {
        green: {
            stroke: 'text-green-500',
            bg: 'text-green-100',
            text: 'text-green-600',
        },
        blue: {
            stroke: 'text-blue-500',
            bg: 'text-blue-100',
            text: 'text-blue-600',
        },
        sky: {
            stroke: 'text-sky-400',
            bg: 'text-sky-100',
            text: 'text-sky-600',
        },
    }

    const theme = colorMap[color]

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            {/* Ring Container */}
            <div className="relative flex items-center justify-center mb-3">
                <svg
                    height={radius * 2 + 10} // Add padding
                    width={radius * 2 + 10}
                    className="transform -rotate-90"
                >
                    {/* Background Circle */}
                    <circle
                        className={`${theme.bg} stroke-current`}
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={normalizedRadius}
                        cx="50%"
                        cy="50%"
                    />
                    {/* Foreground Circle */}
                    <circle
                        className={`${theme.stroke} stroke-current transition-all duration-700 ease-out`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx="50%"
                        cy="50%"
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
                </div>
            </div>

            {/* Labels */}
            <h3 className="text-sm font-semibold text-gray-600 mb-1">{label}</h3>
            <div className={`text-xs font-medium ${theme.text}`}>
                {Math.round(current)} / {goal} {unit}
            </div>
        </div>
    )
}
