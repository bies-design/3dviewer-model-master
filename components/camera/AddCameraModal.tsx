"use client";

import React, { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useAppContext } from "@/contexts/AppContext";

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nextId: string;
}

const AddCameraModal: React.FC<AddCameraModalProps> = ({ isOpen, onClose, onSuccess, nextId }) => {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [title, setTitle] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");
  const [webrtcUrl, setWebrtcUrl] = useState("");
  const [elementName, setElementName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !hlsUrl || !webrtcUrl) {
      setToast({ message: t("please_fill_all_fields"), type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: nextId,
          title,
          hlsUrl,
          webrtcUrl,
          elementName,
        }),
      });

      if (response.ok) {
        setToast({ message: t("camera_added_successfully"), type: "success" });
        setTitle("");
        setHlsUrl("");
        setWebrtcUrl("");
        setElementName("");
        onSuccess();
        onClose();
      } else {
        throw new Error("Failed to add camera");
      }
    } catch (error) {
      console.error("Error adding camera:", error);
      setToast({ message: t("error_adding_camera"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{t("add_new_camera")}</ModalHeader>
        <ModalBody>
          <Input
            label="ID"
            value={nextId}
            disabled
            variant="bordered"
          />
          <Input
            label={t("camera_title")}
            placeholder={t("enter_camera_title")}
            value={title}
            onValueChange={setTitle}
            variant="bordered"
            autoFocus
          />
          <Input
            label="HLS URL"
            placeholder="https://.../index.m3u8"
            value={hlsUrl}
            onValueChange={setHlsUrl}
            variant="bordered"
          />
          <Input
            label="WebRTC URL"
            placeholder="https://..."
            value={webrtcUrl}
            onValueChange={setWebrtcUrl}
            variant="bordered"
          />
          <Input
            label={t("element_name")}
            placeholder={t("enter_element_name")}
            value={elementName}
            onValueChange={setElementName}
            variant="bordered"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t("cancel")}
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={loading}>
            {t("confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddCameraModal;