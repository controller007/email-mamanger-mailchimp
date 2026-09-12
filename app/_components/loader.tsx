"use client"

import NextTopLoader from "nextjs-toploader"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function Loader() {
    const [showOverlay, setShowOverlay] = useState(false)

    // Listen for NProgress events directly
    useEffect(() => {
        // Function to handle when loading starts
        const handleStart = () => {
            setShowOverlay(true)
        }

        // Function to handle when loading completes
        const handleDone = () => {
            // Small delay before hiding overlay to make transition smoother
            setTimeout(() => {
                setShowOverlay(false)
            }, 200)
        }

        // Add event listeners to the window object
        window.addEventListener("nprogress:start", handleStart)
        window.addEventListener("nprogress:done", handleDone)

        // Clean up event listeners
        return () => {
            window.removeEventListener("nprogress:start", handleStart)
            window.removeEventListener("nprogress:done", handleDone)
        }
    }, [])

    return (
        <>
            <NextTopLoader
                color="blue"
                initialPosition={0.08}
                crawlSpeed={200}
                height={3}
                crawl={true}
                showSpinner={false}
                easing="ease"
                speed={200}
                shadow="0 0 10px blue,0 0 5px #10b981"
                zIndex={1051} // Ensure loader is above overlay
            />

            <AnimatePresence>
                {showOverlay && (
                    <motion.div
                        className="fixed top-0 left-0 right-0 bottom-0 w-full h-screen bg-black/40 z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
