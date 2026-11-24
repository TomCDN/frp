import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Group, Layer, Line, Rect, Circle, Text, Arrow, Stage as KonvaStage } from 'react-konva';
import type Konva from 'konva';
import type { Stage as StageModel, StageElement } from '../types';
import { elementColor, LAYER_ORDER } from '../lib/stageGeometry';
import { elementLabel, placeLabels, type LabelPlacement } from '../lib/stageLabels';
import { STAGE_COLORS } from '../lib/stagePalette';

/** Height of the band that marks the upstage (back) edge of the stage. */
const UPSTAGE_BAND = 26;

/** Width of the red wings (coulisses) on both sides of the stage. */
const COULISSE_WIDTH = 14;

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
  /** Draw a cone showing what every camera sees. */
  showCameraViews?: boolean;
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
  showCameraViews = false,
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

  const labelOffsets = useMemo(() => {
    const placements: LabelPlacement[] = [];
    for (const element of ordered) {
      const label = elementLabel(element, scale, offsetX, offsetY);
      if (!label) continue;
      placements.push({ id: element.id, ...label });
    }
    return placeLabels(placements, { minY: 0, maxY: height });
  }, [ordered, scale, offsetX, offsetY, height]);

  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: Array<{ points: number[]; stroke: string; strokeWidth: number }> = [];
    const step = 100 * scale; // 1 m grid
    for (let x = 0; x <= stageWidth; x += step) {
      lines.push({
        points: [offsetX + x, offsetY, offsetX + x, offsetY + stageHeight],
        stroke: STAGE_COLORS.floorGrid,
        strokeWidth: 1,
      });
    }
    for (let y = 0; y <= stageHeight; y += step) {
      lines.push({
        points: [offsetX, offsetY + y, offsetX + stageWidth, offsetY + y],
        stroke: STAGE_COLORS.floorGrid,
        strokeWidth: 1,
      });
    }
    return lines;
  }, [showGrid, stageWidth, stageHeight, scale, offsetX, offsetY]);

  // Konva cannot draw on a canvas without width or height, so wait until the
  // container has been measured.
  if (width <= 0 || height <= 0) return null;

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
          {/* Proscenium / upstage backdrop. The band is only drawn when there is
              room above the stage, so it never covers the stage itself. */}
          <Rect
            x={offsetX}
            y={offsetY - UPSTAGE_BAND}
            width={stageWidth}
            height={UPSTAGE_BAND}
            fill={STAGE_COLORS.upstage}
            stroke={STAGE_COLORS.outline}
            strokeWidth={1}
            cornerRadius={3}
          />
          {offsetY >= UPSTAGE_BAND ? (
            <Text
              x={offsetX}
              y={offsetY - UPSTAGE_BAND + 4}
              width={stageWidth}
              text="PODIUM (ACHTER)"
              fontSize={11}
              letterSpacing={1.5}
              fill={STAGE_COLORS.textMuted}
              align="center"
            />
          ) : null}

          {/* Stage floor */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={stageWidth}
            height={stageHeight}
            fill={STAGE_COLORS.floor}
            stroke={STAGE_COLORS.outline}
            strokeWidth={1.5}
          />

          {gridLines.map((line, index) => (
            <Line key={index} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} />
          ))}

          {/* Front edge marker */}
          <Line
            points={[offsetX, offsetY + stageHeight, offsetX + stageWidth, offsetY + stageHeight]}
            stroke={STAGE_COLORS.frontEdge}
            strokeWidth={3}
          />
          <Text
            x={offsetX}
            y={offsetY + stageHeight + 6}
            width={stageWidth}
            text="VOORSTE RAND (PUBLIEK)"
            fontSize={9}
            letterSpacing={1.5}
            fill={STAGE_COLORS.textMuted}
            align="center"
          />

          {/* The coulisses, the red wings on both sides of the stage. */}
          <Rect
            x={offsetX - COULISSE_WIDTH}
            y={offsetY}
            width={COULISSE_WIDTH}
            height={stageHeight}
            fill={STAGE_COLORS.coulisse}
            opacity={0.85}
            listening={false}
          />
          <Rect
            x={offsetX + stageWidth}
            y={offsetY}
            width={COULISSE_WIDTH}
            height={stageHeight}
            fill={STAGE_COLORS.coulisse}
            opacity={0.85}
            listening={false}
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
              showCameraViews={showCameraViews}
              labelOffset={labelOffsets.get(element.id)}
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
  showCameraViews: boolean;
  /** Vertical shift that keeps the label readable. */
  labelOffset?: { dx: number; dy: number };
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
  showCameraViews,
  labelOffset,
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

  /**
   * Converts the position of a dragged node back to the centre point that is
   * stored for the element. Shapes that are drawn from their top left corner
   * (the `centred` variant below) have to be corrected by half their size.
   *
   * The position is read from the group itself (`currentTarget`), not from the
   * shape that was clicked: the children are drawn relative to the group, so
   * their own coordinates say nothing about where the element is.
   */
  const storePosition = (node: Konva.Node, fromCorner: boolean) => ({
    x: Math.round(((node.x() + (fromCorner ? w / 2 : 0)) - offsetX) / scale),
    y: Math.round(((node.y() + (fromCorner ? h / 2 : 0)) - offsetY) / scale),
  });

  const common = {
    x,
    y,
    rotation: element.rotation,
    draggable,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
      if (!editable) return;
      onChange(storePosition(event.currentTarget, false));
    },
  };

  // For shapes that are drawn from a corner, shift by half the size so the
  // stored centre point stays the anchor.
  const centred = {
    ...common,
    x: x - w / 2,
    y: y - h / 2,
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
      if (!editable) return;
      onChange(storePosition(event.currentTarget, true));
    },
  };

  const isPerson = element.type === 'person' || element.type === 'group';
  const isCamera = element.type === 'camera';

  /**
   * A transparent shape that catches the pointer for the whole element.
   *
   * The visible shapes are drawn with `listening={false}`, so they never
   * receive pointer events themselves. Without this hit area the group would
   * have nothing to grab and the element could not be selected or dragged.
   */
  const hitArea = (fromCorner: boolean) => (
    <Rect
      x={fromCorner ? 0 : -w / 2}
      y={fromCorner ? 0 : -h / 2}
      width={Math.max(w, 12)}
      height={Math.max(h, 12)}
      fill="transparent"
      listening
    />
  );

  if (isCamera) {
    const direction = Number(element.props?.direction ?? 270);
    const angle = (direction * Math.PI) / 180;
    const arrowLength = 42;
    const radius = Math.max(w, h) / 2;
    // The group is positioned at (x, y); children are drawn relative to it.
    const cameraNumber = String(element.props?.cameraNumber ?? element.name ?? 'C');
    return (
      <Group {...common}>
        {hitArea(false)}
        {showCameraViews ? (
          <Line
            points={[
              0,
              0,
              Math.cos(angle - 0.4) * 170,
              Math.sin(angle - 0.4) * 170,
              Math.cos(angle + 0.4) * 170,
              Math.sin(angle + 0.4) * 170,
            ]}
            closed
            fill={color}
            opacity={0.13}
            listening={false}
          />
        ) : null}
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
        <Circle x={0} y={0} radius={radius} fill={color} opacity={0.95} listening={false} />
        <Text
          x={-radius}
          y={-radius * 0.4}
          width={radius * 2}
          text={cameraNumber}
          fontSize={Math.max(9, Math.min(16, radius * 0.95))}
          fontStyle="bold"
          fill={STAGE_COLORS.text}
          align="center"
          listening={false}
        />
        {selected ? (
          <Circle
            x={0}
            y={0}
            radius={radius + 5}
            stroke={STAGE_COLORS.selection}
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
    const label = elementLabel(element, scale, offsetX, offsetY);
    const labelWidth = label ? label.halfWidth * 2 : 0;
    // The group is drawn from its top left corner, so its label is centred on
    // the middle of the group instead of on its anchor point.
    const labelX = isGroup ? w / 2 - labelWidth / 2 : -labelWidth / 2;
    return (
      <Group {...(isGroup ? centred : common)}>
        {hitArea(isGroup)}
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
              listening={false}
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
                  listening={false}
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
                fill={STAGE_COLORS.text}
                align="center"
                listening={false}
              />
            ) : null}
          </>
        ) : (
          <Circle x={0} y={0} radius={radius} fill={color} opacity={0.92} listening={false} />
        )}

        {selected ? (
          isGroup ? (
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              cornerRadius={Math.min(16, h / 3)}
              stroke={STAGE_COLORS.selection}
              strokeWidth={2}
              dash={[4, 3]}
              listening={false}
            />
          ) : (
            <Circle
              x={0}
              y={0}
              radius={radius + 6}
              stroke={STAGE_COLORS.selection}
              strokeWidth={2}
              dash={[4, 3]}
              listening={false}
            />
          )
        ) : null}

        {label ? (
          <Text
            x={labelX}
            y={(isGroup ? h + 4 : radius + 4) + (labelOffset?.dy ?? 0)}
            width={labelWidth}
            text={label.text}
            fontSize={label.fontSize}
            fill={STAGE_COLORS.text}
            align="center"
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  if (element.type === 'label') {
    const label = elementLabel(element, scale, offsetX, offsetY);
    return (
      <Group {...centred}>
        {hitArea(true)}
        {label ? (
          <Text
            x={0}
            y={h / 2 - 7 + (labelOffset?.dy ?? 0)}
            width={w}
            text={label.text}
            fontSize={label.fontSize}
            fontStyle="bold"
            fill={color}
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
            stroke={STAGE_COLORS.selection}
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
    const label = elementLabel(element, scale, offsetX, offsetY);
    return (
      <Group {...common}>
        {hitArea(false)}
        <Circle x={0} y={0} radius={radius} stroke={color} strokeWidth={2} fill="transparent" listening={false} />
        {label ? (
          <Text
            x={-radius}
            y={label.top - y + (labelOffset?.dy ?? 0)}
            width={radius * 2}
            text={label.text}
            fontSize={label.fontSize}
            fontStyle="bold"
            fill={color}
            align="center"
            listening={false}
          />
        ) : null}
        {selected ? (
          <Circle
            x={0}
            y={0}
            radius={radius + 6}
            stroke={STAGE_COLORS.selection}
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
        {hitArea(false)}
        <Circle x={0} y={0} radius={radius} fill={color} opacity={0.35} listening={false} />
        <Circle x={0} y={0} radius={radius * 0.6} fill={color} opacity={0.9} listening={false} />
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
            stroke={STAGE_COLORS.selection}
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
        {hitArea(true)}
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
          listening={false}
        />
        {selected ? (
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            cornerRadius={Math.min(8, radius * 0.4)}
            stroke={STAGE_COLORS.selection}
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
  const sceneryLabel = elementLabel(element, scale, offsetX, offsetY);
  return (
    <Group {...centred}>
      {hitArea(true)}
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
        listening={false}
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
      {sceneryLabel ? (
        <Text
          x={4}
          y={3 + (labelOffset?.dy ?? 0)}
          text={sceneryLabel.text}
          fontSize={sceneryLabel.fontSize}
          fill={STAGE_COLORS.textMuted}
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
          stroke={STAGE_COLORS.selection}
          strokeWidth={2}
          dash={[4, 3]}
          listening={false}
        />
      ) : null}
    </Group>
  );
}
