import Image from 'next/image'
import Link from 'next/link'
import africanAiLogo from '@public/african_ai_horizontal.png'
import React, { useEffect } from 'react'
import { useOrg } from '../Contexts/OrgContext'
import { useTranslation } from 'react-i18next'

function Watermark() {
    const { t } = useTranslation()
    const org = useOrg() as any

    useEffect(() => {
    }
        , [org]);

    if (org?.config?.config?.general?.watermark) {
        return (
            <div className='fixed bottom-8 right-8'>
                <Link href={`https://www.learnhouse.app/?source=in-app`} className="flex items-center cursor-pointer bg-white/80 backdrop-blur-lg text-gray-700 rounded-2xl p-2 light-shadow text-xs px-5 font-semibold space-x-2">
                    <p>Made with African AI Network</p>
                    <Image unoptimized src={africanAiLogo} alt="logo" quality={100} width={120} />
                </Link>
            </div>
        )
    }
    return null
}

export default Watermark