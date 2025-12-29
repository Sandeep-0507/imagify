import React from 'react'
import { assets } from '../assets/assets'
import { motion } from 'framer-motion'

// 🔹 ADDITION START
import { useEffect, useState } from 'react'
// 🔹 ADDITION END

const Description = () => {

    // 🔹 ADDITION START
    const images = [
        
        assets.sample_img_1,
        assets.image_2,
        assets.sample_img_2
    ]

    const [currentImage, setCurrentImage] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage(prev => (prev + 1) % images.length)
        }, 4000)

        return () => clearInterval(interval)
    }, [])
    // 🔹 ADDITION END

    return (
        <motion.div
            className="flex flex-col items-center justify-center my-24 p-6 md:px-28"
            initial={{ opacity: 0.2, y: 100 }}
            transition={{ duration: 1 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}   
        >
            <h1 className="text-3xl sm:text-4xl font-semibold mb-2">Create AI Images</h1>
            <p className="text-gray-500 mb-8">Turn your imagination into visuals</p>
            <div className="flex flex-col gap-5 md:gap-14 md:flex-row items-center">
                
                {/* 🔹 ONLY src value becomes dynamic */}
                <img src={images[currentImage]} className="w-80 xl:w-96 rounded-lg" alt="" />

                <div>
                    <h2 className="text-3xl font-medium max-w-lg mb-4">
                        Presenting the AI-Driven Text-to-Image Generator
                    </h2>
                    <p className=" text-gray-600 mb-4">
                       Turn imagination into reality with our free AI image generator. From stunning visuals to one-of-a-kind images, all it takes is a simple text description. Imagine it, type it, and watch your ideas transform into beautiful images instantly
                    </p>
                    <p className=" text-gray-600">
                        Type it. Imagine it. See it. Our powerful AI transforms text prompts into stunning, high-quality images in seconds. From realistic products to imaginative characters and unseen concepts, creativity knows no bounds.
                    </p>
                </div>
            </div>
        </motion.div>
    )
}

export default Description
