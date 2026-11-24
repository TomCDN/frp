import { useMemo } from 'react';
import { Group, Layer, Line, Circle, Rect, Text, Arrow, Stage as KonvaStage } from 'react-konva';
import { buildCuePositions } from '../lib/stageGeometry';
import { useElementSize } from '../hooks/useElementSize';
import type { Camera, Cue, Stage } from '../types';

/**
 * Operator stage view.
 *
 * Shows the stage from above with:
 *  - actor positions for the current cue,
 *  - every camera position with its view direction,
 *  - the operator's own camera highlighted with a field-of-view cone.
 */
export function OperatorStage({
  stage,
  cue,
  camera,
  height = 240,
}: {
  stage: Stage;
  cue: Cue | null;
  camera: Camera | null;
  height?: number;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const positions = useMemo(
    () => buildCuePositions(stage, cue?.placements ?? []),
    [stage, cue?.placements],
  );

  const scale = useMemo(() => {
    if (!size.width) return 0.3;
    return Math.max(0.12, Math.min(0.55, (size.width - 24) / stage.widthCm));
  }, [size.width, stage.widthCm]);

  const stageWidth = stage.widthCm * scale;
  const stageHeight = stage.heightCm * scale;
  const offsetX = Math.max(0, (size.width - stageWidth) / 2);
  const offsetY = Math.max(0, (height - stageHeight) / 2);

  const actors = stage.elements.filter((element) => element.type === 'person' || element.type === 'group');
  const cameras = stage.elements.filter((element) => element.type === 'camera');

  const canvasHeight = Math.max(200, Math.round(stage.heightCm * scale + 80));

  return (
    <div ref={ref} className="rounded-xl bg-base-950 border border-base-700 overflow-hidden w-full">
      {size.width > 0 ? (
        <KonvaStage width={size.width} height={canvasHeight}>
          <Layer>
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
          <Line
            points={[offsetX, offsetY + stageHeight, offsetX + stageWidth, offsetY + stageHeight]}
            stroke="#475569"
            strokeWidth={2}
          />

          {/* Actors with cue positions */}
          {actors.map((element) => {
            const position = positions.get(element.id);
            const x = offsetX + (position?.x ?? element.x) * scale;
            const y = offsetY + (position?.y ?? element.y) * scale;
            const isGroup = element.type === 'group';
            const w = element.width * scale;
            const h = element.height * scale;
            const radius = Math.min(w, h) / 2;
            const color = String(element.props?.color ?? '#ef4444');
            const count = Number(element.props?.count ?? 1);
            const labelWidth = Math.max(90, w);
            return (
              <Group key={element.id} listening={false}>
                {isGroup ? (
                  <>
                    <Rect
                      x={x - w / 2}
                      y={y - h / 2}
                      width={w}
                      height={h}
                      cornerRadius={Math.min(12, h / 3)}
                      fill={color}
                      opacity={0.2}
                      stroke={color}
                      strokeWidth={1.2}
                      strokeDasharray={[4, 3]}
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
                          opacity={0.9}
                        />
                      );
                    })}
                  </>
                ) : (
                  <Circle x={x} y={y} radius={radius} fill={color} opacity={0.9} />
                )}
                <Text
                  x={x - labelWidth / 2}
                  y={isGroup ? y + h / 2 + 3 : y + radius + 3}
                  width={labelWidth}
                  text={element.name}
                  fontSize={10}
                  fill="#b6c0cf"
                  align="center"
                />
              </Group>
            );
          })}

          {/* Cameras with view direction */}
          {cameras.map((element) => {
            const position = positions.get(element.id);
            const override = cue?.cameraPositions?.[element.id];
            const x = offsetX + (override?.x ?? position?.x ?? element.x) * scale;
            const y = offsetY + (override?.y ?? position?.y ?? element.y) * scale;
            const direction = override?.direction ?? Number(element.props?.direction ?? 270);
            const angle = (direction * Math.PI) / 180;
            const isOwn = camera !== null && Number(element.props?.cameraNumber) === camera.number;
            const color = (element.props?.color as string) ?? '#3b82f6';
            const radius = 9;

            return (
              <Group key={element.id} listening={false}>
                {isOwn ? (
                  <>
                    {/* Field of view cone */}
                    <Line
                      points={[
                        x,
                        y,
                        x + Math.cos(angle - 0.45) * 150,
                        y + Math.sin(angle - 0.45) * 150,
                        x + Math.cos(angle + 0.45) * 150,
                        y + Math.sin(angle + 0.45) * 150,
                      ]}
                      closed
                      fill={color}
                      opacity={0.14}
                    />
                    <Circle x={x} y={y} radius={radius + 5} stroke={color} strokeWidth={2} dash={[3, 2]} />
                  </>
                ) : (
                  <Arrow
                    points={[
                      x - Math.cos(angle) * 26,
                      y - Math.sin(angle) * 26,
                      x,
                      y,
                    ]}
                    stroke={color}
                    fill={color}
                    strokeWidth={1.5}
                    pointerLength={6}
                    pointerWidth={6}
                    opacity={0.6}
                  />
                )}
                <Circle x={x} y={y} radius={radius} fill={color} opacity={isOwn ? 1 : 0.8} />
                <Text
                  x={x - 20}
                  y={y - 6}
                  width={40}
                  text={String(element.props?.cameraNumber ?? '')}
                  fontSize={10}
                  fontStyle="bold"
                  fill="#0b0f16"
                  align="center"
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
