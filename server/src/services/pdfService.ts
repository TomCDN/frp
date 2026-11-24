import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { all } from '../db/database';
import { listCameras, listCrew } from './crewService';
import { listCues, listScenes, getShow } from './showService';
import type { Camera, Cue, Scene, Show } from '../types';

type Doc = PDFKit.PDFDocument;

const COLORS = {
  bg: '#0f172a',
  text: '#0f172a',
  muted: '#64748b',
  line: '#cbd5e1',
  accent: '#2563eb',
};

function formatTimecode(seconds: number | null, format: Show['settings']['timecodeFormat']): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '--:--';
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (format === 'seconds') return `${total}s`;
  if (format === 'hh:mm:ss') return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

function setupDocument(res: Response, filename: string): Doc {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 45, bottom: 45, left: 45, right: 45 } });
  doc.pipe(res);
  return doc;
}

function drawHeader(doc: Doc, title: string, subtitle: string): void {
  doc.rect(0, 0, doc.page.width, 92).fill(COLORS.bg);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(title, 45, 30, { width: doc.page.width - 90 });
  doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(subtitle, 45, 58, { width: doc.page.width - 90 });
  doc.fillColor(COLORS.text);
  doc.y = 120;
}

/** Full running order / draaiboek for a show. */
export function exportShowPdf(res: Response, showId: string): void {
  const show = getShow(showId);
  if (!show) {
    res.status(404).json({ error: 'Show niet gevonden' });
    return;
  }
  const cues = listCues(showId);
  const scenes = listScenes(showId);
  const cameras = listCameras();
  const cameraById = new Map(cameras.map((c) => [c.id, c]));

  const doc = setupDocument(res, `${sanitize(show.name)} - draaiboek.pdf`);
  drawHeader(
    doc,
    show.name,
    [show.date, show.location, `Gegenereerd op ${new Date().toLocaleString('nl-NL')}`]
      .filter(Boolean)
      .join('  |  '),
  );

  if (show.description) {
    doc.fontSize(10).fillColor(COLORS.muted).text(show.description, 45, doc.y, { width: doc.page.width - 90 });
    doc.fillColor(COLORS.text).moveDown(0.8);
  }

  // Scene index
  if (scenes.length) {
    doc.fontSize(13).font('Helvetica-Bold').text('Scènes', { continued: false });
    doc.moveDown(0.3);
    for (const scene of scenes) {
      const sceneCues = cues.filter((cue) => cue.sceneId === scene.id);
      doc
        .fontSize(10)
        .fillColor(COLORS.muted)
        .text(`${scene.name}  (${sceneCues.length} cues)`, { continued: false });
    }
    doc.fillColor(COLORS.text).moveDown(0.6);
  }

  // Cue list
  doc.fontSize(13).font('Helvetica-Bold').text('Cuelijst', { continued: false });
  doc.moveDown(0.4);

  for (const cue of cues) {
    if (doc.y > doc.page.height - 170) {
      doc.addPage();
      doc.y = 60;
    }
    const scene = scenes.find((s) => s.id === cue.sceneId);
    const top = doc.y;

    doc.rect(45, top, 3, 16).fill(COLORS.accent);
    doc.fillColor(COLORS.text).fontSize(11).font('Helvetica-Bold').text(`Cue ${cue.number}`, 56, top);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.muted)
      .text(cue.name, 110, top, { width: 250 });
    doc
      .text(
        `${formatTimecode(cue.startSeconds, show.settings.timecodeFormat)}  •  ${formatDuration(cue.durationSeconds)}`,
        doc.page.width - 45 - 140,
        top,
        { width: 140, align: 'right' },
      );
    doc.y = top + 18;

    if (scene) {
      doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica').text(`Scène: ${scene.name}`, 56, doc.y);
      doc.y += 12;
    }
    if (cue.description) {
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica').text(cue.description, 56, doc.y, { width: doc.page.width - 101 });
      doc.y += 12;
    }

    const shotEntries = Object.entries(cue.shots ?? {});
    if (shotEntries.length) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted).text('CAMERA-INSTRUCTIES', 56, doc.y);
      doc.y += 12;
      for (const [cameraId, assignment] of shotEntries) {
        const camera = cameraById.get(cameraId);
        const label = camera ? `Cam ${camera.number} — ${camera.name}` : `Camera ${cameraId.slice(0, 6)}`;
        const parts = [assignment.shot, assignment.subject, assignment.movement, assignment.notes].filter(
          Boolean,
        );
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.text)
          .text(`• ${label}: ${parts.join(' — ')}`, 64, doc.y, { width: doc.page.width - 109 });
        doc.y += 12;
      }
    }

    if (cue.notes) {
      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#b45309')
        .text(`Notitie: ${cue.notes}`, 64, doc.y, { width: doc.page.width - 109 });
      doc.y += 12;
    }

    doc.moveTo(45, doc.y + 4).lineTo(doc.page.width - 45, doc.y + 4).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.y += 16;
  }

  doc.end();
}

/** Personal shot list for a single camera operator. */
export function exportCameraPdf(res: Response, cameraId: string, showId?: string): void {
  const cameras = listCameras();
  const camera = cameras.find((c) => c.id === cameraId);
  if (!camera) {
    res.status(404).json({ error: 'Camera niet gevonden' });
    return;
  }
  const crew = listCrew().find((c) => c.cameraId === cameraId);

  const doc = setupDocument(res, `${sanitize(camera.name)} - shotlist.pdf`);
  drawHeader(
    doc,
    `Shotlist — ${camera.name}`,
    [
      crew ? `Camerapersoon: ${crew.name}` : '',
      showId ? getShow(showId)?.name : '',
      `Type: ${camera.type}`,
      `Lens: ${camera.lens || 'n.v.t.'}`,
    ]
      .filter(Boolean)
      .join('  |  '),
  );

  if (camera.notes) {
    doc.fontSize(10).fillColor(COLORS.muted).text(camera.notes, 45, doc.y, { width: doc.page.width - 90 });
    doc.y += 14;
  }

  const shows = showId ? [getShow(showId)!] : [];
  const targetShows: Show[] = shows.length
    ? shows
    : all<{ id: string }>('SELECT id FROM shows WHERE archived = 0 ORDER BY date DESC')
        .map((row) => getShow(row.id))
        .filter((show): show is Show => Boolean(show));

  let anyCue = false;
  for (const show of targetShows) {
    if (!show) continue;
    const cues = listCues(show.id);
    const relevant = cues.filter((cue) => cue.shots && cue.shots[cameraId]);
    if (!relevant.length) continue;
    anyCue = true;

    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.text).text(show.name, { continued: false });
    doc.moveDown(0.4);

    for (const cue of relevant) {
      if (doc.y > doc.page.height - 110) {
        doc.addPage();
        doc.y = 60;
      }
      const assignment = cue.shots[cameraId];
      const top = doc.y;

      doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.text).text(`Cue ${cue.number}`, 45, top);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.muted)
        .text(cue.name, 100, top, { width: 240 });
      doc
        .text(
          formatTimecode(cue.startSeconds, show.settings.timecodeFormat),
          doc.page.width - 45 - 90,
          top,
          { width: 90, align: 'right' },
        );
      doc.y = top + 16;

      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.accent).text(assignment.shot || '—', 60, doc.y);
      doc.y += 13;
      if (assignment.subject) {
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(`Volg: ${assignment.subject}`, 60, doc.y);
        doc.y += 12;
      }
      if (assignment.movement) {
        doc.fontSize(9).font('Helvetica').fillColor(COLORS.text).text(`Beweging: ${assignment.movement}`, 60, doc.y);
        doc.y += 12;
      }
      if (assignment.notes) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor(COLORS.muted).text(assignment.notes, 60, doc.y);
        doc.y += 12;
      }
      if (cue.notes) {
        doc.fontSize(9).font('Helvetica-Oblique').fillColor('#b45309').text(`Let op: ${cue.notes}`, 60, doc.y);
        doc.y += 12;
      }
      doc.moveTo(45, doc.y + 3).lineTo(doc.page.width - 45, doc.y + 3).strokeColor(COLORS.line).lineWidth(0.5).stroke();
      doc.y += 14;
    }
    doc.moveDown(0.8);
  }

  if (!anyCue) {
    doc.fontSize(11).font('Helvetica').fillColor(COLORS.muted).text('Geen cues toegewezen aan deze camera.', 45, doc.y);
  }

  doc.end();
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'export';
}
