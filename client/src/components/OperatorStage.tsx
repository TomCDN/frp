import { useMemo } from 'react';
import { Group, Layer, Line, Circle, Rect, Text, Arrow, Stage as KonvaStage } from 'react-konva';
import { buildCuePositions } from '../lib/stageGeometry';
import { actorLabel, placeLabels, type LabelPlacement } from '../lib/stageLabels';
import { STAGE_COLORS } from '../lib/stagePalette';
import { useElementSize } from '../hooks/useElementSize';
import type { Camera, Cue, Stage } from '../types';

/**
 * The stage zones from the "Camerahandboek".
 *
 * The handbook teaches the operators to think in zones: first left / middle /
 * right, then front / back, always seen from the audience. The code is always
 * two letters.
 */
const ZONES = [
  { code: 'LA', column: 1 / 6, row: 0.32 },
  { code: 'MA', column: 3 / 6, row: 0.32 },
  { code: 'RA', column: 5 / 6, row: 0.32 },
  { code: 'LV', column: 1 / 6, row: 0.68 },
  { code: 'MV', column: 3 / 6, row: 0.68 },
  { code: 'RV', column: 5 / 6, row: 0.68 },
] as const;

/** The room around the stage: audience in front, cameras behind it. */
const AUDIENCE_HEIGHT = 26;
const CAMERA_BAR_HEIGHT = 34;
const GAP = 10;
const PADDING = 8;

/**
 * Operator stage view.
 *
 * Draws the stage from above as a floor plan, like the drawing in the
 * "Camerahandboek":
 *  - a cream podium with the red coulisses on both sides,
 *  - the blue stage zones (LA, MA, RA, LV, MV, RV),
 *  - the actors of the current cue,
 *  - the audience in front of the stage and the camera bar behind them,
 *  - the operator's own camera, with a green line to what it films.
 *
 * The drawing always fills the space it gets, so it stays as large as
 * possible on an iPad.
 */
export function OperatorStage({
  stage,
  cue,
  camera,
  className,
}: {
  stage: Stage;
  cue: Cue | null;
  camera: Camera | null;
  className?: string;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const positions = useMemo(
    () => buildCuePositions(stage, cue?.placements ?? []),
    [stage, cue?.placements],
  );

  /*
    The scale follows the smallest of the two directions, so the whole stage
    (including the audience and the camera bar) always fits without scrolling.
  */
  const scale = useMemo(() => {
    if (!size.width || !size.height) return 0.3;
    const roomHeight =
      size.height - PADDING * 2 - AUDIENCE_HEIGHT - CAMERA_BAR_HEIGHT - GAP * 2;
    const byWidth = (size.width - PADDING * 2) / stage.widthCm;
    const byHeight = roomHeight / stage.heightCm;
    return Math.max(0.05, Math.min(0.8, byWidth, byHeight));
  }, [size.width, size.height, stage.widthCm, stage.heightCm]);

  const stageWidth = stage.widthCm * scale;
  const stageHeight = stage.heightCm * scale;
  const offsetX = Math.max(0, (size.width - stageWidth) / 2);

  const contentHeight = stageHeight + GAP + AUDIENCE_HEIGHT + GAP + CAMERA_BAR_HEIGHT;
  const offsetY = Math.max(PADDING, (size.height - contentHeight) / 2);

  const audienceY = offsetY + stageHeight + GAP;
  const cameraBarY = audienceY + AUDIENCE_HEIGHT + GAP;

  const actors = stage.elements.filter((element) => element.type === 'person' || element.type === 'group');
  const cameras = stage.elements.filter((element) => element.type === 'camera');

  const actorPositions = useMemo(
    () =>
      actors.map((element) => {
        const position = positions.get(element.id);
        return {
          element,
          x: offsetX + (position?.x ?? element.x) * scale,
          y: offsetY + (position?.y ?? element.y) * scale,
        };
      }),
    [actors, positions, scale, offsetX, offsetY],
  );

  /** The font size of the actor labels follows the size of the drawing. */
  const labelFontSize = Math.max(11, Math.min(24, scale * 30));

  const labelOffsets = useMemo(() => {
    const placements: LabelPlacement[] = actorPositions.map(({ element, x, y }) => {
      const label = actorLabel(element, x, y, scale, labelFontSize);
      return { id: element.id, ...label };
    });
    return placeLabels(placements, { minY: 0, maxY: offsetY + stageHeight });
  }, [actorPositions, scale, labelFontSize, offsetY, stageHeight]);

  /**
   * The target of the operator's own camera: the actor the camera films.
   * When there is no subject, the centre of the stage is used.
   */
  const ownTarget = useMemo(() => {
    if (!camera) return null;
    const assignment = cue?.shots?.[camera.id];
    const subject = assignment?.subject?.trim();
    if (subject) {
      const match = actorPositions.find(({ element }) => element.name === subject);
      if (match) return { x: match.x, y: match.y };
    }
    return { x: offsetX + stageWidth / 2, y: offsetY + stageHeight / 2 };
  }, [camera, cue?.shots, actorPositions, offsetX, stageWidth, offsetY, stageHeight]);

  /** Where the operator's own camera stands. */
  const ownCamera = useMemo(() => {
    if (!camera) return null;
    const element = cameras.find((c) => Number(c.props?.cameraNumber) === camera.number);
    if (!element) return null;
    const position = positions.get(element.id);
    const override = cue?.cameraPositions?.[element.id];
    return {
      element,
      x: offsetX + (override?.x ?? position?.x ?? element.x) * scale,
      y: offsetY + (override?.y ?? position?.y ?? element.y) * scale,
      direction:
        override?.direction ?? Number(element.props?.direction ?? 270),
    };
  }, [camera, cameras, positions, cue?.cameraPositions, scale, offsetX, offsetY]);

  const zoneRadius = Math.max(14, Math.min(stageWidth / 7, stageHeight / 5));

  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0 ? (
        <KonvaStage width={size.width} height={size.height}>
          <Layer>
            {/* ---------------- The podium ---------------- */}
            <Rect
              x={offsetX}
              y={offsetY}
              width={stageWidth}
              height={stageHeight}
              fill={STAGE_COLORS.floor}
              stroke={STAGE_COLORS.outline}
              strokeWidth={1.5}
            />

            {/* The coulisses: the red wings on both sides. */}
            <Rect
              x={offsetX - 8}
              y={offsetY}
              width={8}
              height={stageHeight}
              fill={STAGE_COLORS.coulisse}
              listening={false}
            />
            <Rect
              x={offsetX + stageWidth}
              y={offsetY}
              width={8}
              height={stageHeight}
              fill={STAGE_COLORS.coulisse}
              listening={false}
            />

            {/* The front edge of the stage, towards the audience. */}
            <Line
              points={[offsetX, offsetY + stageHeight, offsetX + stageWidth, offsetY + stageHeight]}
              stroke={STAGE_COLORS.frontEdge}
              strokeWidth={3}
              listening={false}
            />

            {/* ---------------- The stage zones ---------------- */}
            {ZONES.map((zone) => {
              const zx = offsetX + stageWidth * zone.column;
              const zy = offsetY + stageHeight * zone.row;
              return (
                <Group key={zone.code} listening={false}>
                  <Circle
                    x={zx}
                    y={zy}
                    radius={zoneRadius}
                    stroke={STAGE_COLORS.zone}
                    strokeWidth={1.5}
                    dash={[6, 5]}
                    opacity={0.65}
                  />
                  <Text
                    x={zx - zoneRadius}
                    y={zy - zoneRadius * 0.45}
                    width={zoneRadius * 2}
                    text={zone.code}
                    fontSize={Math.max(10, Math.min(20, zoneRadius * 0.55))}
                    fontStyle="bold"
                    fill={STAGE_COLORS.zone}
                    align="center"
                    opacity={0.8}
                  />
                </Group>
              );
            })}

            {/* ---------------- The actors ---------------- */}
            {actorPositions.map(({ element, x, y }) => {
              const isGroup = element.type === 'group';
              const w = element.width * scale;
              const h = element.height * scale;
              const radius = Math.max(6, Math.min(w, h) / 2);
              const color = String(element.props?.color ?? '#e03131');
              const count = Number(element.props?.count ?? 1);
              const label = actorLabel(element, x, y, scale, labelFontSize);
              const labelWidth = label.halfWidth * 2;
              const isTarget =
                ownTarget !== null &&
                Math.abs(ownTarget.x - x) < 1 &&
                Math.abs(ownTarget.y - y) < 1;
              return (
                <Group key={element.id} listening={false}>
                  {/* A green ring marks the actor this camera films. */}
                  {isTarget ? (
                    <Circle
                      x={x}
                      y={y}
                      radius={radius + 7}
                      stroke={STAGE_COLORS.target}
                      strokeWidth={3}
                    />
                  ) : null}
                  {isGroup ? (
                    <>
                      <Rect
                        x={x - w / 2}
                        y={y - h / 2}
                        width={w}
                        height={h}
                        cornerRadius={Math.min(14, h / 3)}
                        fill={color}
                        opacity={0.25}
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
                            x={x - w / 2 + cellW * (col + 0.5)}
                            y={y - h / 2 + cellH * (row + 0.5)}
                            radius={Math.min(cellW, cellH) * 0.34}
                            fill={color}
                            opacity={0.95}
                          />
                        );
                      })}
                    </>
                  ) : (
                    <Circle x={x} y={y} radius={radius} fill={color} opacity={0.95} />
                  )}
                  <Text
                    x={x - labelWidth / 2}
                    y={label.top + (labelOffsets.get(element.id)?.dy ?? 0)}
                    width={labelWidth}
                    text={label.text}
                    fontSize={label.fontSize}
                    fontStyle="bold"
                    fill={STAGE_COLORS.text}
                    align="center"
                  />
                </Group>
              );
            })}

            {/* ---------------- The cameras ---------------- */}
            {cameras.map((element) => {
              const position = positions.get(element.id);
              const override = cue?.cameraPositions?.[element.id];
              const x = offsetX + (override?.x ?? position?.x ?? element.x) * scale;
              const y = offsetY + (override?.y ?? position?.y ?? element.y) * scale;
              const direction = override?.direction ?? Number(element.props?.direction ?? 270);
              const angle = (direction * Math.PI) / 180;
              const isOwn = camera !== null && Number(element.props?.cameraNumber) === camera.number;
              const color = (element.props?.color as string) ?? STAGE_COLORS.cameraBar;
              const radius = isOwn ? 13 : 8;

              return (
                <Group key={element.id} listening={false}>
                  {isOwn ? (
                    <>
                      {/* What the camera sees. */}
                      <Line
                        points={[
                          x,
                          y,
                          x + Math.cos(angle - 0.4) * 220,
                          y + Math.sin(angle - 0.4) * 220,
                          x + Math.cos(angle + 0.4) * 220,
                          y + Math.sin(angle + 0.4) * 220,
                        ]}
                        closed
                        fill={color}
                        opacity={0.16}
                      />
                      <Circle
                        x={x}
                        y={y}
                        radius={radius + 6}
                        stroke={color}
                        strokeWidth={2.5}
                        dash={[4, 3]}
                      />
                    </>
                  ) : (
                    <Arrow
                      points={[
                        x - Math.cos(angle) * 30,
                        y - Math.sin(angle) * 30,
                        x,
                        y,
                      ]}
                      stroke={color}
                      fill={color}
                      strokeWidth={1.5}
                      pointerLength={6}
                      pointerWidth={6}
                      opacity={0.45}
                    />
                  )}
                  <Circle x={x} y={y} radius={radius} fill={color} opacity={isOwn ? 1 : 0.55} />
                  <Text
                    x={x - radius}
                    y={y - radius * 0.55}
                    width={radius * 2}
                    text={String(element.props?.cameraNumber ?? '')}
                    fontSize={isOwn ? 13 : 10}
                    fontStyle="bold"
                    fill={isOwn ? '#ffffff' : STAGE_COLORS.text}
                    align="center"
                  />
                </Group>
              );
            })}

            {/* The green line from the operator's camera to what it films. */}
            {ownCamera && ownTarget ? (
              <Group listening={false}>
                <Line
                  points={[ownCamera.x, ownCamera.y, ownTarget.x, ownTarget.y]}
                  stroke={STAGE_COLORS.target}
                  strokeWidth={4}
                  lineCap="round"
                />
                <Circle
                  x={ownTarget.x}
                  y={ownTarget.y}
                  radius={9}
                  fill={STAGE_COLORS.target}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </Group>
            ) : null}

            {/* ---------------- The audience and the camera bar ---------------- */}
            <Rect
              x={offsetX}
              y={audienceY}
              width={stageWidth}
              height={AUDIENCE_HEIGHT}
              fill={STAGE_COLORS.audience}
              stroke={STAGE_COLORS.outline}
              strokeWidth={1}
              cornerRadius={3}
              listening={false}
            />
            {Array.from({ length: 48 }).map((_, index) => {
              const cols = 12;
              const rows = 4;
              const col = index % cols;
              const row = Math.floor(index / cols);
              return (
                <Circle
                  key={index}
                  x={offsetX + (stageWidth / cols) * (col + 0.5)}
                  y={audienceY + 6 + ((AUDIENCE_HEIGHT - 12) / rows) * (row + 0.5)}
                  radius={3}
                  fill="#b9c6d2"
                  listening={false}
                />
              );
            })}
            <Text
              x={offsetX}
              y={audienceY + AUDIENCE_HEIGHT / 2 - 8}
              width={stageWidth}
              text="PUBLIEK"
              fontSize={11}
              fontStyle="bold"
              fill={STAGE_COLORS.textMuted}
              align="center"
              listening={false}
            />

            {/* The bar where the cameras stand, behind the audience. */}
            <Rect
              x={offsetX}
              y={cameraBarY}
              width={stageWidth}
              height={CAMERA_BAR_HEIGHT}
              fill={STAGE_COLORS.cameraBar}
              cornerRadius={5}
              listening={false}
            />
            {cameras.map((element) => {
              const number = String(element.props?.cameraNumber ?? '');
              const slot = (Number(element.props?.cameraNumber ?? 1) - 1) * 70 + 40;
              const bx = offsetX + Math.min(stageWidth - 40, slot);
              const isOwn = camera !== null && Number(element.props?.cameraNumber) === camera.number;
              return (
                <Group key={`bar-${element.id}`} listening={false}>
                  <Rect
                    x={bx - 28}
                    y={cameraBarY + 5}
                    width={56}
                    height={CAMERA_BAR_HEIGHT - 10}
                    fill={isOwn ? '#ffffff' : '#4a5d78'}
                    cornerRadius={4}
                    listening={false}
                  />
                  <Text
                    x={bx - 28}
                    y={cameraBarY + CAMERA_BAR_HEIGHT / 2 - 8}
                    width={56}
                    text={`C${number}`}
                    fontSize={13}
                    fontStyle="bold"
                    fill={isOwn ? STAGE_COLORS.cameraBar : '#ffffff'}
                    align="center"
                    listening={false}
                  />
                </Group>
              );
            })}
          </Layer>
        </KonvaStage>
      ) : null}
    </div>
  );
}
