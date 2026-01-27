"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardBody, Divider, Switch, Button, Tooltip } from "@heroui/react";
import Hls from "hls.js";
import { useAppContext } from "@/contexts/AppContext";
import { MapPin } from "lucide-react";

interface CameraPlayerProps {
  hlsUrl: string;
  webrtcUrl: string;
  title?: string;
  elementName?: string;
  isMinimized?: boolean;
  isAlarm?: boolean;
  onMinimizeToggle?: () => void;
  onLocate?: (elementName: string) => void;
}

const CameraPlayer: React.FC<CameraPlayerProps> = ({
  hlsUrl,
  webrtcUrl,
  title,
  elementName,
  isMinimized = false,
  isAlarm = false,
  onMinimizeToggle,
  onLocate
}) => {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLowLatency, setIsLowLatency] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const startWebRTC = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (video) {
          video.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("WebRTC State:", pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          handleWebRTCFailure();
        }
      };

      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whepUrl = webrtcUrl.endsWith("/") ? `${webrtcUrl}whep` : `${webrtcUrl}/whep`;
      
      console.log("Connecting to WHEP URL:", whepUrl);
      const response = await fetch(whepUrl, {
        method: "POST",
        body: offer.sdp,
        headers: { "Content-Type": "application/sdp" },
        mode: 'cors',
      }).catch(err => {
        console.error("Fetch API Error (Possible CORS or Network issue):", err);
        throw err;
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("WHEP Server Error Response:", errorText);
        throw new Error(`WHEP request failed with status ${response.status}`);
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));

      clearCurrentTimeout();
      timeoutRef.current = setTimeout(() => {
        if (pc.connectionState !== "connected" && isLowLatency) {
          handleWebRTCFailure();
        }
      }, 20000);

    } catch (error) {
      console.error("WebRTC Error:", error);
      handleWebRTCFailure();
    }
  };

  const handleWebRTCFailure = () => {
    setIsLowLatency((prev) => {
      if (prev) {
        setToast({ message: t("webrtc_failed_switching_to_hls"), type: "error" });
        return false;
      }
      return prev;
    });
  };

  const stopWebRTC = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isLowLatency) {
      startWebRTC();
      return () => {
        stopWebRTC();
        clearCurrentTimeout();
      };
    } else {
      const handleHLSFailure = () => {
        if (!isLowLatency) {
          setToast({ message: t("hls_failed_switching_to_webrtc"), type: "error" });
          setIsLowLatency(true);
        }
      };

      clearCurrentTimeout();
      timeoutRef.current = setTimeout(() => {
        if (video.readyState < 2) {
          handleHLSFailure();
        }
      }, 20000);

      if (hlsUrl.endsWith(".m3u8")) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = hlsUrl;
        } else if (Hls.isSupported()) {
          const hls = new Hls({
            manifestLoadingTimeOut: 200000,
            manifestLoadingMaxRetry: 20,
            manifestLoadingRetryDelay: 1000,
            fragLoadingTimeOut: 200000,
            fragLoadingMaxRetry: 20,
            fragLoadingRetryDelay: 1000,
            levelLoadingTimeOut: 200000,
            xhrSetup: (xhr) => {
              xhr.withCredentials = false;
            },
          });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              handleHLSFailure();
            }
          });

          return () => {
            hls.destroy();
            video.src = "";
            clearCurrentTimeout();
          };
        }
      } else {
        video.src = hlsUrl;
      }
    }
  }, [isLowLatency, hlsUrl, webrtcUrl, mounted, isMinimized]);

  if (!mounted) {
    return <div className="w-full h-full bg-black" />;
  }

  return (
    <Card
      className={`relative w-full rounded-none border-none shadow-none bg-black group transition-all duration-300 ${
        isMinimized ? "h-[48px]" : "h-full"
      }`}
    >
      {isAlarm && (
        <div className="absolute inset-0 border-4 border-red-500 z-50 pointer-events-none animate-[pulse_0.8s_cubic-bezier(0.4,0,0.6,1)_infinite] shadow-[inset_0_0_40px_rgba(239,68,68,0.6)]" />
      )}
      <div className={`absolute top-0 left-0 right-0 z-10 p-2 bg-black/60 flex justify-between items-center transition-transform ${
        isMinimized ? "translate-y-0" : "translate-y-[-100%] group-hover:translate-y-0"
      }`}>
        <div className="flex flex-col min-w-0 flex-1 mr-2">
          <p className="text-tiny font-bold text-white truncate">{title || t("live_stream")}</p>
          <p className="text-[10px] text-zinc-400">{isLowLatency ? "WebRTC" : "HLS"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isMinimized && (
            <>
              {elementName && onLocate && (
                <Tooltip content={t("locate")}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="text-white min-w-6 w-6 h-6"
                    onClick={() => onLocate(elementName)}
                  >
                    <MapPin size={14} />
                  </Button>
                </Tooltip>
              )}
              <div className="flex items-center gap-2 scale-75 origin-right">
                <span className="text-tiny text-white whitespace-nowrap">{t("low_latency_mode")}</span>
                <Switch
                  size="sm"
                  isSelected={isLowLatency}
                  onValueChange={setIsLowLatency}
                />
              </div>
            </>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            className="text-white min-w-6 w-6 h-6"
            onClick={onMinimizeToggle}
          >
            {isMinimized ? (
              <svg fill="none" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3H21V9M9 21H3V15M21 3L14 10M3 21L10 14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
            ) : (
              <svg fill="none" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 14H10V20M20 10H14V4M10 14L3 21M14 10L21 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
              </svg>
            )}
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <CardBody className="p-0 overflow-hidden bg-black flex items-center justify-center h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          controls
          autoPlay
          muted
          playsInline
        >
          {t("no_camera_found")}
        </video>
        </CardBody>
      )}
    </Card>
  );
};

export default CameraPlayer;