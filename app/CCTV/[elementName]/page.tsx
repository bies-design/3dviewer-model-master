'use client';

import CameraPlayer from '@/components/camera/CameraPlayer';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const CCTV = () => {
    const params = useParams();
    const {elementName} = params;

    const [camera, setCamera] = useState<any>("");

    const fetchCamera = async() => {
        try{
            const response = await fetch(`api/cameras?elementName=${elementName}`)
            const cameraData = response.json();
            setCamera(cameraData);

        }catch (error) {
            console.error("無法開啟相機視窗:", error);
        }
    }

    useEffect(()=>{
        fetchCamera();
    },[])
    return (
        <div>
            <CameraPlayer
                hlsUrl={camera.hlsUrl}
                webrtcUrl={camera.webrtcUrl}
                title={camera.title}
                elementName={camera.elementName}
                isMinimized={true}
            />
        </div>
    );
}

export default CCTV;