"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Switch, Slider } from "@heroui/react";
import * as OBC from "@thatopen/components";
import { X } from "lucide-react";

interface ShadowScenePanelProps {
  components: OBC.Components;
  onClose?: () => void;
}

const ShadowScenePanel: React.FC<ShadowScenePanelProps> = ({ components, onClose }) => {
  const { t } = useTranslation();
  const world = components.get(OBC.Worlds).list.values().next().value;
  const scene = world?.scene as OBC.ShadowedScene;

  const [shadowsEnabled, setShadowsEnabled] = React.useState(scene?.shadowsEnabled || false);
  const [autoBias, setAutoBias] = React.useState(scene?.autoBias || false);
  const [bias, setBias] = React.useState(scene?.bias || 0);

  const ambientLight = scene?.ambientLights.values().next().value;
  const directionalLight = scene?.directionalLights.values().next().value;

  const [ambientIntensity, setAmbientIntensity] = React.useState(ambientLight?.intensity || 0.2);
  const [directionalIntensity, setDirectionalIntensity] = React.useState(directionalLight?.intensity || 0);
  const [ambientColor, setAmbientColor] = React.useState(ambientLight?.color.getHexString() || "808080");
  const [directionalColor, setDirectionalColor] = React.useState(directionalLight?.color.getHexString() || "ffffff");

  const [cascade, setCascade] = React.useState(1);
  const [resolution, setResolution] = React.useState(1024);

  const [directionalPosition, setDirectionalPosition] = React.useState(directionalLight?.position || { x: 0, y: 0, z: 0 });

  if (!scene || !(scene instanceof OBC.ShadowedScene)) {
    return <div>Shadow scene not available.</div>;
  }

  const handleShadowsEnabledChange = (value: boolean) => {
    scene.shadowsEnabled = value;
    setShadowsEnabled(value);
  };

  const handleAutoBiasChange = (value: boolean) => {
    scene.autoBias = value;
    setAutoBias(value);
  };

  const handleBiasChange = (value: number | number[]) => {
    const newBias = Array.isArray(value) ? value[0] : value;
    scene.bias = newBias;
    setBias(newBias);
  };

  const handleAmbientIntensityChange = (value: number | number[]) => {
    if (ambientLight) {
      const newIntensity = Array.isArray(value) ? value[0] : value;
      ambientLight.intensity = newIntensity;
      setAmbientIntensity(newIntensity);
    }
  };

  const handleDirectionalIntensityChange = (value: number | number[]) => {
    if (directionalLight) {
      const newIntensity = Array.isArray(value) ? value[0] : value;
      directionalLight.intensity = newIntensity;
      setDirectionalIntensity(newIntensity);
    }
  };

  const handleAmbientColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (ambientLight) {
      const newColor = event.target.value;
      ambientLight.color.set(newColor);
      setAmbientColor(newColor);
    }
  };

  const handleDirectionalColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (directionalLight) {
      const newColor = event.target.value;
      directionalLight.color.set(newColor);
      setDirectionalColor(newColor);
    }
  };

  const handleCascadeChange = (value: number | number[]) => {
    const newCascade = Array.isArray(value) ? value[0] : value;
    setCascade(newCascade);
    scene.setup({ shadows: { cascade: newCascade, resolution } });
  };

  const handleResolutionChange = (value: number | number[]) => {
    const newResolution = Array.isArray(value) ? value[0] : value;
    setResolution(newResolution);
    scene.setup({ shadows: { cascade, resolution: newResolution } });
  };

  const handleDirectionalPositionChange = (axis: 'x' | 'y' | 'z', value: number | number[]) => {
    if (directionalLight) {
      const newPosition = { ...directionalPosition, [axis]: Array.isArray(value) ? value[0] : value };
      directionalLight.position.set(newPosition.x, newPosition.y, newPosition.z);
      setDirectionalPosition(newPosition);
    }
  };

  return (
    <div className="flex flex-col relative h-full">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={28} />
        </button>
      )}
      <h3 className="text-xl font-semibold mb-4">{t("shadow_scene")}</h3>
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="flex items-center justify-between mb-4">
        <span>{t("shadows_enabled")}</span>
        <Switch isSelected={shadowsEnabled} onChange={() => handleShadowsEnabledChange(!shadowsEnabled)} />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span>{t("auto_bias")}</span>
        <Switch isSelected={autoBias} onChange={() => handleAutoBiasChange(!autoBias)} />
      </div>
      <div className="mb-4">
        <span>{t("bias")}</span>
        <Slider
          value={bias}
          onChange={handleBiasChange}
          minValue={-0.01}
          maxValue={0}
          step={0.0001}
          className="mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("ambient_intensity")}</span>
        <Slider
          value={ambientIntensity}
          onChange={handleAmbientIntensityChange}
          minValue={0}
          maxValue={5}
          step={0.1}
          className="mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("ambient_color")}</span>
        <input
          type="color"
          value={`#${ambientColor}`}
          onChange={handleAmbientColorChange}
          className="w-full mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("directional_intensity")}</span>
        <Slider
          value={directionalIntensity}
          onChange={handleDirectionalIntensityChange}
          minValue={0}
          maxValue={5}
          step={0.1}
          className="mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("directional_color")}</span>
        <input
          type="color"
          value={`#${directionalColor}`}
          onChange={handleDirectionalColorChange}
          className="w-full mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("cascade")}</span>
        <Slider
          value={cascade}
          onChange={handleCascadeChange}
          minValue={1}
          maxValue={4}
          step={1}
          className="mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("resolution")}</span>
        <Slider
          value={resolution}
          onChange={handleResolutionChange}
          minValue={512}
          maxValue={4096}
          step={512}
          className="mt-2"
        />
      </div>
      <div className="mb-4">
        <span>{t("directional_light_position")}</span>
        <div className="mt-2">
          <span>X</span>
          <Slider
            value={directionalPosition.x}
            onChange={(value) => handleDirectionalPositionChange('x', value)}
            minValue={-100}
            maxValue={100}
            step={1}
          />
          <span>Y</span>
          <Slider
            value={directionalPosition.y}
            onChange={(value) => handleDirectionalPositionChange('y', value)}
            minValue={-100}
            maxValue={100}
            step={1}
          />
          <span>Z</span>
          <Slider
            value={directionalPosition.z}
            onChange={(value) => handleDirectionalPositionChange('z', value)}
            minValue={-100}
            maxValue={100}
            step={1}
          />
        </div>
      </div>
      </div>
    </div>
  );
};

export default ShadowScenePanel;
