import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';

// Points of interest/sensors
const POIS = [
  { id: '1', label: 'Sensor Mengger', pos: [107.625, -6.968], type: 'sensor' },
  { id: '2', label: 'Universitas Telkom', pos: [107.631, -6.973], type: 'landmark' },
  { id: '3', label: 'Podomoro Park', pos: [107.635, -6.978], type: 'landmark' },
  { id: '4', label: 'Sensor Ciganitri', pos: [107.640, -6.974], type: 'sensor' },
  { id: '5', label: 'Pusat Bojongsoang', pos: [107.633, -6.985], type: 'landmark' },
  { id: '6', label: 'Sensor Balai Kertas', pos: [107.618, -6.980], type: 'sensor' },
];

interface CesiumMapProps {
  waterLevel: number;
  waterAlpha: number;
  riverFlow: number;
}

export function CesiumMap({ waterLevel, waterAlpha, riverFlow }: CesiumMapProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  const stateRef = useRef({ waterLevel, waterAlpha, riverFlow });
  useEffect(() => {
    stateRef.current = { waterLevel, waterAlpha, riverFlow };
  }, [waterLevel, waterAlpha, riverFlow]);

  // Use a second ref for smoothed values to make animations silky smooth
  const smoothStateRef = useRef({ waterLevel, waterAlpha, riverFlow });

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const current = smoothStateRef.current;
      const target = stateRef.current;
      // Exponential smoothing factor for super smooth interpolation
      current.waterLevel += (target.waterLevel - current.waterLevel) * 0.04;
      current.waterAlpha += (target.waterAlpha - current.waterAlpha) * 0.04;
      current.riverFlow += (target.riverFlow - current.riverFlow) * 0.04;
      frameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    // Initialize Cesium Viewer
    const viewer = new Cesium.Viewer(cesiumContainer.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      terrain: Cesium.Terrain.fromWorldTerrain(),
    });

    viewerRef.current = viewer;

    // Add global 3D buildings from OpenStreetMap
    Cesium.createOsmBuildingsAsync().then((buildings) => {
      viewer.scene.primitives.add(buildings);
    }).catch(err => console.warn('Could not load OSM Buildings:', err));

    // Remove default double-click behavior
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );

    // Initial camera view closer to Bojongsoang to see 3D buildings clearly
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(107.630, -6.985, 1200),
      orientation: {
        heading: Cesium.Math.toRadians(15.0),
        pitch: Cesium.Math.toRadians(-25.0),
        roll: 0.0,
      },
      duration: 0
    });

    // Add flood/water polygon covering the river basin
    const riverPositions = Cesium.Cartesian3.fromDegreesArray([
      107.610, -6.950,
      107.625, -6.965,
      107.632, -6.975,
      107.638, -6.982,
      107.632, -6.992,
      107.620, -6.985,
      107.605, -6.970,
    ]);

    // Create the volumetric water body
    viewer.entities.add({
      name: 'Flood Water Volume',
      polygon: {
        hierarchy: riverPositions,
        extrudedHeight: new Cesium.CallbackProperty(() => {
          // Adjust extrusion dynamically to show rising water level smoothly
          return 660 + (smoothStateRef.current.waterLevel * 35);
        }, false),
        height: 650, // Base riverbed height
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(() => {
            return Cesium.Color.fromCssColorString('#0284c7').withAlpha(smoothStateRef.current.waterAlpha);
          }, false)
        ),
      },
    });

    // Add an animated surface layer using Grid material to simulate flow ripples
    const timeRef = { time: 0 };
    viewer.entities.add({
      name: 'Flood Water Surface',
      polygon: {
        hierarchy: riverPositions,
        height: new Cesium.CallbackProperty(() => {
          return 660 + (smoothStateRef.current.waterLevel * 35) + 0.2; // Slightly above volume
        }, false),
        material: new Cesium.GridMaterialProperty({
          color: Cesium.Color.fromCssColorString('#7dd3fc').withAlpha(0.6),
          cellAlpha: 0.05,
          lineCount: new Cesium.Cartesian2(40, 40),
          lineThickness: new Cesium.Cartesian2(1.5, 1.5),
          lineOffset: new Cesium.CallbackProperty(() => {
            // Speed of flow tied to riverFlow state
            timeRef.time -= smoothStateRef.current.riverFlow * 0.00002;
            return new Cesium.Cartesian2(timeRef.time, timeRef.time * 0.5);
          }, false)
        }),
      },
    });

    // Add sensors and landmarks
    POIS.forEach(poi => {
      const isSensor = poi.type === 'sensor';
      const color = isSensor ? Cesium.Color.fromCssColorString('#1e293b') : Cesium.Color.fromCssColorString('#f97316');
      
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(poi.pos[0], poi.pos[1], 660),
        point: {
          pixelSize: 14,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: poi.label,
          font: 'bold 12pt Inter, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: color,
          outlineWidth: 5,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -15),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.2, 1.5e4, 0.5),
        }
      });
    });

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once

  return (
    <div 
      ref={cesiumContainer} 
      className="absolute inset-0 w-full h-full z-0"
    />
  );
}

