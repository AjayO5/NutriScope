'use client'

import { useEffect, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

interface HydrationRingProps {
    consumed: number
    goal: number
}

export default function HydrationRing({ consumed, goal }: HydrationRingProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const remaining = Math.max(0, goal - consumed)
    const percentage = goal > 0 ? Math.round((consumed / goal) * 100) : 0

    const data = {
        labels: ['Consumed', 'Remaining'],
        datasets: [
            {
                data: [consumed, remaining],
                backgroundColor: [
                    '#3B82F6',
                    '#F3F4F6', // Using gray-100 for lighter empty state
                ],
                borderWidth: 0,
                cutout: '75%',
            },
        ],
    }

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                enabled: false,
            },
        },
        maintainAspectRatio: false,
    }

    if (!mounted) return <div className="h-48 w-48 mx-auto" /> // Placeholder to prevent layout shift

    return (
        <div className="relative h-48 w-48 mx-auto">
            <Doughnut data={data} options={options} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
                </div>
            </div>
        </div>
    )
}
