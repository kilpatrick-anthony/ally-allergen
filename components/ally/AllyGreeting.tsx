'use client'

import { motion } from 'framer-motion'

export default function AllyGreeting() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-6 mb-8 text-white shadow-lg"
    >
      <div className="flex items-center space-x-4">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
          className="text-4xl"
        >
          👋
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold">Hi! I'm Ally</h2>
          <p className="opacity-90 mt-1">Your friendly allergy assistant. Tap allergens on the left to see safe options!</p>
        </div>
      </div>
    </motion.div>
  )
}