'use client';

import CameraPlayer from '@/components/camera/CameraPlayer';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const CCTV = () => {
    const params = useParams();
    const {elementName} = params;

    const [camera, setCamera] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCamera = async () => {
            try {
                const response = await fetch(`/api/cameras?elementName=${elementName}`);
                const data = await response.json();
                if (data && data.length > 0) {
                    setCamera(data[0]);
                }
            } catch (error) {
                console.error("API Error:", error);
            } finally {
                setLoading(false);
            }
        };
        if (elementName) fetchCamera();
    }, [elementName]);

    if (loading) return <div className="bg-black text-white h-screen flex items-center justify-center">Loading...</div>;

    if (!camera || (!camera.hlsUrl && !camera.webrtcUrl)) {
        return <div className="bg-black text-white h-screen flex items-center justify-center">找不到相機資料</div>;
    }
    
    return (
        <div className='borde-4 w-full h-full'>
            <CameraPlayer
                hlsUrl={camera.hlsUrl}
                webrtcUrl={camera.webrtcUrl}
                title={camera.title}
                elementName={camera.elementName}
            />
        </div>
    );
}

export default CCTV;