import { useMemo } from 'react';
import { buildCuePositions } from '../lib/stageGeometry';
import { useElementSize } from '../hooks/useElementSize';
import { StageCanvas } from './StageCanvas';
import type { Cue, Stage } from '../types';

/**
 * Read-only stage view used in the live director mode.
 * Applies the cue's placements and camera positions.
 */
export function LiveStageView({
  stage,
  cue,
  height = 280,
}: {
  stage: Stage;
  cue: Cue | null;
  height?: number;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const positions = useMemo(
    () => buildCuePositions(stage, cue?.placements ?? []),
    [stage, cue?.placements],
  );

  const elements = useMemo(() => {
    return stage.elements.map((element) => {
      const position = positions.get(element.id);
      const cameraOverride = element.type === 'camera' ? cue?.cameraPositions?.[element.id] : undefined;
      if (!position && !cameraOverride) return element;
      return {
        ...element,
        x: cameraOverride?.x ?? position?.x ?? element.x,
        y: cameraOverride?.y ?? position?.y ?? element.y,
        rotation: cameraOverride?.direction ?? position?.rotation ?? element.rotation,
      };
    });
  }, [stage.elements, positions, cue?.cameraPositions]);

  const scale = useMemo(() => {
    const byWidth = (size.width - 24) / stage.widthCm;
    // Leave room above the stage for the upstage band and below it for the
    // front edge, so neither is cropped.
    const availableHeight = size.height > 0 ? size.height : height;
    const byHeight = (availableHeight - 60) / stage.heightCm;
    return Math.max(0.12, Math.min(0.6, byWidth, byHeight));
  }, [size.width, size.height, stage.widthCm, stage.heightCm, height]);

  const canvasHeight =
    size.height > 0 ? size.height : Math.max(200, Math.round(stage.heightCm * scale + 90));

  return (
    <div
      ref={ref}
      className="rounded-lg bg-base-950 border border-base-700 overflow-hidden w-full flex-1 min-h-0"
    >
      {size.width > 0 ? (
        <StageCanvas
          stage={stage}
          elements={elements}
          scale={scale}
          width={size.width}
          height={canvasHeight}
          editable={false}
          showGrid
          showCameraDirections
        />
      ) : null}
    </div>
  );
}
