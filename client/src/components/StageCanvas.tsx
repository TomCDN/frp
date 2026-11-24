import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Group, Layer, Line, Rect, Circle, Text, Arrow, Stage as KonvaStage } from 'react-konva';
import type Konva from 'konva';
import type { Stage as StageModel, StageElement } from '../types';
import { elementColor, elementText, LAYER_ORDER } from '../lib/stageGeometry';
import { measureLabelWidth, placeLabels, type LabelPlacement } from '../lib/stageLabels';

export interface StageCanvasProps {
  stage: StageModel;
  elements: StageElement[];
  /** Scale factor (px per cm). */
  scale: number;
  width: number;
  height: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (id: string, patch: Partial<StageElement>) => void;
  /** Dragging is disabled in read-only views. */
  editable?: boolean;
  /** Show camera direction arrows. */
  showCameraDirections?: boolean;
  /** Draw a grid. */
  showGrid?: boolean;
  /** Extra elements drawn on top (e.g. cue placements preview). */
  overlay?: ReactNode;
  stageRef?: RefObject<Konva.Stage>;
}

/**
 * Renders the stage from above.
 *
 * The stage origin (0,0) is the top-left corner of the playable area; the
 * backdrop ("upstage") is drawn above it.
 */
export function StageCanvas({
  stage,
  elements,
  scale,
  width,
  height,
  selectedId,
  onSelect,
  onChange,
  editable = false,
  showCameraDirections = true,
  showGrid = true,
  overlay,
  stageRef,
}: StageCanvasProps) {
  const layerRef = useRef<Konva.Layer>(null);

  const stageWidth = stage.widthCm * scale;
  const stageHeight = stage.heightCm * scale;
  // Centre the stage inside the available viewport.
  const offsetX = Math.max(0, (width - stageWidth) / 2);
  const offsetY = Math.max(0, (height - stageHeight) / 2);

  const ordered = useMemo(() => {
    const byLayer = new Map<string, StageElement[]>();
    for (const element of elements) {
      if (!element.visible) continue;
      const list = byLayer.get(element.layer) ?? [];
      list.push(element);
      byLayer.set(element.layer, list);
    }
    const result: StageElement[] = [];
    for (const layer of LAYER_ORDER) {
      result.push(...(byLayer.get(layer) ?? []));
    }
    // Elements on unknown layers still render.
    for (const [layer, list] of byLayer) {
      if (!LAYER_ORDER.includes(layer as never)) result.push(...list);
    }
    return result;
  }, [elements]);

  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: Array<{ points: number[]; stroke: string; strokeWidth: number }> = [];
    const step = 100 * scale; // 1 m grid
    for (let x = 0; x <= stageWidth; x += step) {
      lines.push({
        points: [offsetX + x, offsetY, offsetX + x, offsetY + stageHeight],
        stroke: '#1e293b',
        strokeWidth: 1,
      });
    }
    for (let y = 0; y <= stageHeight; y += step) {
      lines.push({
        points: [offsetX, offsetY + y, offsetX + stageWidth, offsetY + y],
        stroke: '#1e293b',
        strokeWidth: 1,
      });
    }
    return lines;
  }, [showGrid, stageWidth, stageHeight, scale, offsetX, offsetY]);

  return (
    <>
      <KonvaStage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={(event) => {
          if (event.target === event.target.getStage()) onSelect?.(null);
        }}
        onTouchStart={(event) => {
          if (event.target === event.target.getStage()) onSelect?.(null);
        }}
      >
        <Layer ref={layerRef}>
          {/* Proscenium / upstage backdrop */}
          <Rect
            x={offsetX}
            y={Math.max(0, offsetY - 26)}
            width={stageWidth}
            height={26}
            fill="#0d1520"
            stroke="#1e293b"
            strokeWidth={1}
            cornerRadius={3}
          />
          <Text
            x={offsetX}
            y={Math.max(0, offsetY - 22)}
            width={stageWidth}
            text="ACHTERGROND (UPSTAGE)"
            fontSize={9}
            letterSpacing={1.5}
            fill="#475569"
            align="center"
          />

          {/* Stage floor */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={stageWidth}
            height={stageHeight}
            fill="#0b0f16"
            stroke="#334155"
            strokeWidth={1.5}
          />

          {gridLines.map((line, index) => (
            <Line key={index} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} />
          ))}

          {/* Front edge marker */}
          <Line
            points={[offsetX, offsetY + stageHeight, offsetX + stageWidth, offsetY + stageHeight]}
            stroke="#475569"
            strokeWidth={2}
          />
          <Text
            x={offsetX}
            y={offsetY + stageHeight + 6}
            width={stageWidth}
            text="VOORSTE RAND (AUDIENCE)"
            fontSize={9}
            letterSpacing={1.5}
            fill="#475569"
            align="center"
          />

          {ordered.map((element) => (
            <ElementNode
              key={element.id}
              element={element}
              scale={scale}
              offsetX={offsetX}
              offsetY={offsetY}
              selected={element.id === selectedId}
              editable={editable}
              showCameraDirections={showCameraDirections}
              onSelect={() => onSelect?.(element.id)}
              onChange={(patch) => onChange?.(element.id, patch)}
            />
          ))}

          {overlay}
        </Layer>
      </KonvaStage>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Individual element rendering                                         */
/* ------------------------------------------------------------------ */

interface ElementNodeProps {
  element: StageElement;
  scale: number;
  offsetX: number;
  offsetY: number;
  selected: boolean;
  editable: boolean;
  showCameraDirections: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<StageElement>) => void;
}

function ElementNode({
  element,
  scale,
  offsetX,
  offsetY,
  selected,
  editable,
  showCameraDirections,
  onSelect,
  onChange,
}: ElementNodeProps) {
  const color = elementColor(element);
  const w = element.width * scale;
  const h = element.height * scale;
  // Elements are stored by their centre point; the group is positioned so that
  // all children can be drawn relative to (0, 0).
  const x = offsetX + element.x * scale;
  const y = offsetY + element.y * scale;

  const draggable = editable && !element.locked;
  const common = {
    x,
    y,
    rotation: element.rotation,
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
      if (!editable) return;
      const node = event.target;
      onChange({
        x: Math.round((node.x() - offsetX) / scale),
        y: Math.round((node.y() - offsetY) / scale),
      });
    },
  };

  // For shapes that are drawn from a corner, shift by half the size so the
  // stored centre point stays the anchor.
  const centred = {
    ...common,
    x: x - w / 2,
    y: y - h / 2,
  };

  const isPerson = element.type === 'person' || element.type === 'group';
  const isCamera = element.type === 'camera';

  if (isCamera) {
    const direction = Number(element.props?.direction ?? 270);
    const angle = (direction * Math.PI) / 180;
    const arrowLength = 42;
    const radius = Math.max(w, h) / 2;
    // The group is positioned at (x, y); children are drawn relative to it.
    const cameraNumber = String(element.props?.cameraNumber ?? element.name ?? 'C');
    return (
      <Group {...common}>
        {showCameraDirections ? (
          <Arrow
            points={[
              -Math.cos(angle) * arrowLength,
              -Math.sin(angle) * arrowLength,
              0,
              0,
            ]}
            stroke={color}
            fill={color}
            strokeWidth={2}
            pointerLength={7}
            pointerWidth={7}
            opacity={0.85}
            listening={false}
          />
        ) : null}
        <Circle x={0} y={0} radius={radius} fill={color} opacity={0.95} />
        <Text
          x={-radius}
          y={-radius * 0.4}
          width={radius * 2}
          text={cameraNumber}
          fontSize={Math.max(9, Math.min(16, radius * 0.95))}
          fontStyle="bold"
          fill="#0b0f16"
          align="center"
          listening={false}
        />
        {selected ? (
          <Circle
            x={0}
            y={0}
            radius={radius + 5}
            stroke="#60a5fa"
            strokeWidth={2}
            dash={[4, 3]}
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  if (isPerson) {
    const count = Number(element.props?.count ?? 1);
    const isGroup = element.type === 'group';
    const radius = Math.min(w, h) / 2;
    const labelWidth = Math.max(120, w);
    return (
      <Group {...(isGroup ? centred : common)}>
        {isGroup ? (
          <>
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              cornerRadius={Math.min(16, h / 3)}
              fill={color}
              opacity={0.22}
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray={[5, 4]}
            />
            {Array.from({ length: Math.min(count, 24) }).map((_, index) => {
              const cols = Math.min(count, 8);
              const rows = Math.ceil(Math.min(count, 24) / cols);
              const col = index % cols;
              const row = Math.floor(index / cols);
              const cellW = w / cols;
              const cellH = h / Math.max(rows, 1);
              return (
                <Circle
                  key={index}
                  x={cellW * (col + 0.5)}
                  y={cellH * (row + 0.5)}
                  radius={Math.min(cellW, cellH) * 0.34}
                  fill={color}
                  opacity={0.9}
                />
              );
            })}
            {count > 24 ? (
              <Text
                x={0}
                y={h / 2 - 6}
                width={w}
                text={`${count}`}
                fontSize={Math.min(14, h * 0.5)}
                fontStyle="bold"
                fill="#0b0f16"
                align="center"
                listening={false}
              />
            ) : null}
          </>
        ) : (
          <Circle x={0} y={0} radius={radius} fill={color} opacity={0.92} />
        )}

        {selected ? (
          isGroup ? (
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              cornerRadius={Math.min(16, h / 3)}
              stroke="#60a5fa"
              strokeWidth={2}
              dash={[4, 3]}
              listening={false}
            />
          ) : (
            <Circle
              x={0}
              y={0}
              radius={radius + 6}
              stroke="#60a5fa"
              strokeWidth={2}
              dash={[4, 3]}
              listening={false}
            />
          )
        ) : null}

        <Text
          x={isGroup ? 0 : -labelWidth / 2}
          y={isGroup ? h + 4 : radius + 4}
          width={labelWidth}
          text={element.name || 'Naamloos'}
          fontSize={11}
          fill="#e4e9f0"
          align="center"
          listening={false}
        />
      </Group>
    );
  }

  if (element.type === 'label') {
    return (
      <Group {...centred}>
        <Rect x={0} y={0} width={w} height={h} fill="transparent" />
        <Text
          x={0}
          y={h / 2 - 7}
          width={w}
          text={elementText(element)}
          fontSize={Math.max(9, Math.min(18, h * 0.5))}
          fontStyle="bold"
          fill={color}
          align="center"
          listening={false}
        />
        {selected ? (
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            stroke="#60a5fa"
            strokeWidth={2}
            dash={[4, 3]}
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  if (element.type === 'marker') {
    const radius = Math.max(w, h) / 2;
    return (
      <Group {...common}>
        <Circle x={0} y={0} radius={radius} stroke={color} strokeWidth={2} fill="transparent" />
        <Text
          x={-radius}
          y={-radius * 0.6}
          width={radius * 2}
          text={String(element.props?.symbol ?? 'X')}
          fontSize={radius * 0.9}
          fontStyle="bold"
          fill={color}
          align="center"
          listening={false}
        />
        {selected ? (
          <Circle
            x={0}
            y={0}
            radius={radius + 6}
            stroke="#60a5fa"
            strokeWidth={2}
            dash={[4, 3]}
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  if (element.type === 'light') {
    const radius = Math.max(w, h) / 2;
    return (
      <Group {...common}>
        <Circle x={0} y={0} radius={radius} fill={color} opacity={0.35} />
        <Circle x={0} y={0} radius={radius * 0.6} fill={color} opacity={0.9} />
        <Line
          points={[0, 0, 0, radius * 1.4]}
          stroke={color}
          strokeWidth={1.5}
          opacity={0.6}
          listening={false}
        />
        {selected ? (
          <Circle
            x={0}
            y={0}
            radius={radius + 6}
            stroke="#60a5fa"
            strokeWidth={2}
            dash={[4, 3]}
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  if (element.type === 'instrument' || element.type === 'microphone') {
    const radius = Math.max(w, h) / 2;
    return (
      <Group {...centred}>
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          cornerRadius={Math.min(8, radius * 0.4)}
          fill={color}
          opacity={0.55}
          stroke={color}
          strokeWidth={1.5}
        />
        {selected ? (
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            cornerRadius={Math.min(8, radius * 0.4)}
            stroke="#60a5fa"
            strokeWidth={2}
            dash={[4, 3]}
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  // Scenery shapes: floor, platform, backdrop, stairs, door, table, chair
  const isFloor = element.type === 'floor';
  const isBackdrop = element.type === 'backdrop';
  return (
    <Group {...centred}>
      <Rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={color}
        opacity={isFloor ? 0.25 : isBackdrop ? 0.6 : 0.5}
        stroke={color}
        strokeWidth={isFloor || isBackdrop ? 1 : 1.5}
        cornerRadius={element.type === 'stairs' ? 2 : 4}
        dash={isFloor ? [6, 4] : undefined}
      />
      {element.type === 'stairs' ? (
        Array.from({ length: Number(element.props?.steps ?? 4) }).map((_, index) => (
          <Line
            key={index}
            points={[
              0,
              (h / Number(element.props?.steps ?? 4)) * index,
              w,
              (h / Number(element.props?.steps ?? 4)) * index,
            ]}
            stroke={color}
            strokeWidth={1}
            opacity={0.7}
            listening={false}
          />
        ))
      ) : null}
      {element.name ? (
        <Text
          x={0}
          y={h / 2 - 6}
          width={w}
          text={element.name}
          fontSize={10}
          fill="#cbd5e1"
          align="center"
          listening={false}
        />
      ) : null}
      {selected ? (
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          cornerRadius={4}
          stroke="#60a5fa"
          strokeWidth={2}
          dash={[4, 3]}
          listening={false}
        />
      ) : null}
    </Group>
  );
}
